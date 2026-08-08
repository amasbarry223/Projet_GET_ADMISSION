import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiCandidat, parseOrRespond } from "@/lib/api-auth";
import { logementReservationSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { saveUpload, deleteUpload } from "@/lib/storage";

// PUT /api/logement/reservations/[id] — le candidat corrige sa propre demande après une
// demande de correction du staff (statut = correction_demandee uniquement).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiCandidat();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const reservation = await db.logementReservation.findUnique({ where: { id } });
  if (!reservation || reservation.candidatId !== auth.user.id) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  if (reservation.statut !== "correction_demandee") {
    return NextResponse.json(
      { error: "Cette demande ne peut être corrigée que si une correction a été demandée." },
      { status: 400 },
    );
  }

  const rateLimited = await checkRateLimit(getClientId(request), "/api/logement/reservations");
  if (rateLimited) return rateLimited;

  const form = await request.formData();
  const fichierPasseport = form.get("fichierPasseport");
  const fichierAttestationInscription = form.get("fichierAttestationInscription");

  const parsed = parseOrRespond(logementReservationSchema, {
    civilite: form.get("civilite") ? String(form.get("civilite")) : undefined,
    nom: form.get("nom") ? String(form.get("nom")) : undefined,
    prenom: form.get("prenom") ? String(form.get("prenom")) : undefined,
    dateNaissance: form.get("dateNaissance") ? String(form.get("dateNaissance")) : undefined,
    nationalite: form.get("nationalite") ? String(form.get("nationalite")) : undefined,
    telephone: form.get("telephone") ? String(form.get("telephone")) : undefined,
    email: form.get("email") ? String(form.get("email")) : undefined,
    agenceAccompagnante: form.get("agenceAccompagnante") ? String(form.get("agenceAccompagnante")) : undefined,
    numeroPasseport: form.get("numeroPasseport") ? String(form.get("numeroPasseport")) : undefined,
    paysDemandeVisa: form.get("paysDemandeVisa") ? String(form.get("paysDemandeVisa")) : undefined,
    villeEtablissementFrance: form.get("villeEtablissementFrance")
      ? String(form.get("villeEtablissementFrance"))
      : undefined,
    dateArriveePrevue: form.get("dateArriveePrevue") ? String(form.get("dateArriveePrevue")) : undefined,
  });
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  let fichierPasseportUrl = reservation.fichierPasseportUrl;
  let fichierAttestationInscriptionUrl = reservation.fichierAttestationInscriptionUrl;

  try {
    if (fichierPasseport instanceof File && fichierPasseport.size > 0) {
      const upload = await saveUpload(fichierPasseport, `logement/${auth.user.id}`, { visibility: "private" });
      await deleteUpload(reservation.fichierPasseportUrl, "private");
      fichierPasseportUrl = upload.cheminRelatif;
    }
    if (fichierAttestationInscription instanceof File && fichierAttestationInscription.size > 0) {
      const upload = await saveUpload(fichierAttestationInscription, `logement/${auth.user.id}`, {
        visibility: "private",
      });
      await deleteUpload(reservation.fichierAttestationInscriptionUrl, "private");
      fichierAttestationInscriptionUrl = upload.cheminRelatif;
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Téléversement des documents échoué" },
      { status: 400 },
    );
  }

  const updated = await db.logementReservation.update({
    where: { id: reservation.id },
    data: {
      civilite: input.civilite,
      nom: input.nom,
      prenom: input.prenom,
      dateNaissance: input.dateNaissance,
      nationalite: input.nationalite,
      telephone: input.telephone,
      email: input.email,
      agenceAccompagnante: input.agenceAccompagnante || null,
      numeroPasseport: input.numeroPasseport,
      paysDemandeVisa: input.paysDemandeVisa,
      villeEtablissementFrance: input.villeEtablissementFrance,
      dateArriveePrevue: input.dateArriveePrevue,
      fichierPasseportUrl,
      fichierAttestationInscriptionUrl,
      statut: "soumis",
      motifCorrection: null,
    },
  });

  return NextResponse.json({ success: true, reservation: updated });
}
