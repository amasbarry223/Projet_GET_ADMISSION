import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiCandidat, parseOrRespond } from "@/lib/api-auth";
import { demandeCrousSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { saveUpload, deleteUpload } from "@/lib/storage";

// PUT /api/logement/crous/[id] — le candidat corrige sa propre demande CROUS après une
// demande de correction du staff (statut = correction_demandee uniquement).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiCandidat();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const demande = await db.demandeLogementCrous.findUnique({ where: { id } });
  if (!demande || demande.candidatId !== auth.user.id) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  if (demande.statut !== "correction_demandee") {
    return NextResponse.json(
      { error: "Cette demande ne peut être corrigée que si une correction a été demandée." },
      { status: 400 },
    );
  }

  const rateLimited = await checkRateLimit(getClientId(request), "/api/logement/crous");
  if (rateLimited) return rateLimited;

  const form = await request.formData();
  const fichierPasseportRecto = form.get("fichierPasseportRecto");
  const fichierPasseportVerso = form.get("fichierPasseportVerso");
  const fichierAttestationAccordPrealable = form.get("fichierAttestationAccordPrealable");

  const parsed = parseOrRespond(demandeCrousSchema, {
    nom: form.get("nom") ? String(form.get("nom")) : undefined,
    prenom: form.get("prenom") ? String(form.get("prenom")) : undefined,
    nomUsage: form.get("nomUsage") ? String(form.get("nomUsage")) : undefined,
    dateNaissance: form.get("dateNaissance") ? String(form.get("dateNaissance")) : undefined,
    lieuNaissance: form.get("lieuNaissance") ? String(form.get("lieuNaissance")) : undefined,
    paysNaissance: form.get("paysNaissance") ? String(form.get("paysNaissance")) : undefined,
    nationalite: form.get("nationalite") ? String(form.get("nationalite")) : undefined,
    sexe: form.get("sexe") ? String(form.get("sexe")) : undefined,
    telephone: form.get("telephone") ? String(form.get("telephone")) : undefined,
    email: form.get("email") ? String(form.get("email")) : undefined,
    villeEtablissementFrance: form.get("villeEtablissementFrance")
      ? String(form.get("villeEtablissementFrance"))
      : undefined,
  });
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  let fichierPasseportRectoUrl = demande.fichierPasseportRectoUrl;
  let fichierPasseportVersoUrl = demande.fichierPasseportVersoUrl;
  let fichierAttestationAccordPrealableUrl = demande.fichierAttestationAccordPrealableUrl;

  try {
    if (fichierPasseportRecto instanceof File && fichierPasseportRecto.size > 0) {
      const upload = await saveUpload(fichierPasseportRecto, `logement-crous/${auth.user.id}`, {
        visibility: "private",
      });
      await deleteUpload(demande.fichierPasseportRectoUrl, "private");
      fichierPasseportRectoUrl = upload.cheminRelatif;
    }
    if (fichierPasseportVerso instanceof File && fichierPasseportVerso.size > 0) {
      const upload = await saveUpload(fichierPasseportVerso, `logement-crous/${auth.user.id}`, {
        visibility: "private",
      });
      await deleteUpload(demande.fichierPasseportVersoUrl, "private");
      fichierPasseportVersoUrl = upload.cheminRelatif;
    }
    if (fichierAttestationAccordPrealable instanceof File && fichierAttestationAccordPrealable.size > 0) {
      const upload = await saveUpload(fichierAttestationAccordPrealable, `logement-crous/${auth.user.id}`, {
        visibility: "private",
      });
      await deleteUpload(demande.fichierAttestationAccordPrealableUrl, "private");
      fichierAttestationAccordPrealableUrl = upload.cheminRelatif;
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Téléversement des documents échoué" },
      { status: 400 },
    );
  }

  const updated = await db.demandeLogementCrous.update({
    where: { id: demande.id },
    data: {
      nom: input.nom,
      prenom: input.prenom,
      nomUsage: input.nomUsage || null,
      dateNaissance: input.dateNaissance,
      lieuNaissance: input.lieuNaissance,
      paysNaissance: input.paysNaissance,
      nationalite: input.nationalite,
      sexe: input.sexe,
      telephone: input.telephone,
      email: input.email,
      villeEtablissementFrance: input.villeEtablissementFrance,
      fichierPasseportRectoUrl,
      fichierPasseportVersoUrl,
      fichierAttestationAccordPrealableUrl,
      statut: "soumis",
      motifCorrection: null,
    },
  });

  return NextResponse.json({ success: true, demande: updated });
}
