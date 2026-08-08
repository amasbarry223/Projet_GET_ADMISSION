import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiCandidat, parseOrRespond } from "@/lib/api-auth";
import { logementReservationSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { saveUpload } from "@/lib/storage";

// GET /api/logement/reservations — mes demandes de réservation de logement (candidat)
export async function GET() {
  const auth = await requireApiCandidat();
  if (!auth.ok) return auth.response;

  const reservations = await db.logementReservation.findMany({
    where: { candidatId: auth.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reservations });
}

// POST /api/logement/reservations — soumet une demande de réservation de logement (candidat)
export async function POST(request: Request) {
  const auth = await requireApiCandidat();
  if (!auth.ok) return auth.response;

  const rateLimited = await checkRateLimit(getClientId(request), "/api/logement/reservations");
  if (rateLimited) return rateLimited;

  const existing = await db.logementReservation.findFirst({
    where: { candidatId: auth.user.id },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error:
          "Vous avez déjà une demande de réservation de logement. Contactez votre conseiller si vous devez la modifier.",
        code: "LOGEMENT_RESERVATION_DUPLICATE",
      },
      { status: 409 },
    );
  }

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

  if (!(fichierPasseport instanceof File) || fichierPasseport.size === 0) {
    return NextResponse.json({ error: "Le passeport est requis" }, { status: 400 });
  }
  if (!(fichierAttestationInscription instanceof File) || fichierAttestationInscription.size === 0) {
    return NextResponse.json({ error: "L'attestation d'inscription est requise" }, { status: 400 });
  }

  let passeportUpload;
  let attestationUpload;
  try {
    passeportUpload = await saveUpload(fichierPasseport, `logement/${auth.user.id}`, { visibility: "private" });
    attestationUpload = await saveUpload(fichierAttestationInscription, `logement/${auth.user.id}`, {
      visibility: "private",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Téléversement des documents échoué" },
      { status: 400 },
    );
  }

  const reservation = await db.logementReservation.create({
    data: {
      candidatId: auth.user.id,
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
      fichierPasseportUrl: passeportUpload.cheminRelatif,
      fichierAttestationInscriptionUrl: attestationUpload.cheminRelatif,
      statut: "soumis",
    },
  });

  // La transmission au partenaire n'est plus automatique — un membre du staff la déclenche
  // manuellement depuis /admin/logement une fois la demande vérifiée.
  return NextResponse.json({ success: true, reservation }, { status: 201 });
}
