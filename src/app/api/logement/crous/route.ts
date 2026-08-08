import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser, parseOrRespond } from "@/lib/api-auth";
import { demandeCrousSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { saveUpload } from "@/lib/storage";

// GET /api/logement/crous — mes demandes de logement CROUS (candidat)
export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Réservé aux candidats" }, { status: 403 });
  }

  const demandes = await db.demandeLogementCrous.findMany({
    where: { candidatId: auth.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ demandes });
}

// POST /api/logement/crous — soumet une demande de logement CROUS (candidat)
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Réservé aux candidats" }, { status: 403 });
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

  if (!(fichierPasseportRecto instanceof File) || fichierPasseportRecto.size === 0) {
    return NextResponse.json({ error: "Le passeport (recto) est requis" }, { status: 400 });
  }
  if (!(fichierPasseportVerso instanceof File) || fichierPasseportVerso.size === 0) {
    return NextResponse.json({ error: "Le passeport (verso) est requis" }, { status: 400 });
  }
  if (!(fichierAttestationAccordPrealable instanceof File) || fichierAttestationAccordPrealable.size === 0) {
    return NextResponse.json({ error: "L'attestation d'accord préalable est requise" }, { status: 400 });
  }

  let passeportRectoUpload;
  let passeportVersoUpload;
  let attestationUpload;
  try {
    passeportRectoUpload = await saveUpload(fichierPasseportRecto, `logement-crous/${auth.user.id}`, {
      visibility: "private",
    });
    passeportVersoUpload = await saveUpload(fichierPasseportVerso, `logement-crous/${auth.user.id}`, {
      visibility: "private",
    });
    attestationUpload = await saveUpload(fichierAttestationAccordPrealable, `logement-crous/${auth.user.id}`, {
      visibility: "private",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Téléversement des documents échoué" },
      { status: 400 },
    );
  }

  const demande = await db.demandeLogementCrous.create({
    data: {
      candidatId: auth.user.id,
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
      fichierPasseportRectoUrl: passeportRectoUpload.cheminRelatif,
      fichierPasseportVersoUrl: passeportVersoUpload.cheminRelatif,
      fichierAttestationAccordPrealableUrl: attestationUpload.cheminRelatif,
      statut: "soumis",
    },
  });

  // Transmise à l'administration pour traitement — pas d'envoi automatique à un tiers.
  return NextResponse.json({ success: true, demande }, { status: 201 });
}
