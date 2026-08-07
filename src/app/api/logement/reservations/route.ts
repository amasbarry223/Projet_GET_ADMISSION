import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser, parseOrRespond } from "@/lib/api-auth";
import { logementReservationSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { saveUpload, createSignedUrl } from "@/lib/storage";
import { sendMail, logementReservationEmailHtml } from "@/lib/mail";

const CIVILITE_LABEL: Record<string, string> = { M: "Monsieur", MME: "Madame" };

async function resolvePartenaireEmail(): Promise<string | null> {
  const configured = process.env.LOGEMENT_PARTENAIRE_EMAIL?.trim();
  if (configured) return configured;
  const contact = await db.contactInfo.findUnique({ where: { id: 1 } });
  return contact?.email?.trim() || null;
}

// GET /api/logement/reservations — mes demandes de réservation de logement (candidat)
export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Réservé aux candidats" }, { status: 403 });
  }

  const reservations = await db.logementReservation.findMany({
    where: { candidatId: auth.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reservations });
}

// POST /api/logement/reservations — soumet une demande de réservation de logement (candidat)
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Réservé aux candidats" }, { status: 403 });
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

  // Transmission au partenaire — ne bloque jamais la réponse : la demande reste enregistrée
  // (statut=soumis) même en cas d'échec, seul le statut passe à "erreur" pour investigation.
  try {
    const destinataire = await resolvePartenaireEmail();
    if (!destinataire) {
      throw new Error("Aucune adresse e-mail partenaire configurée");
    }

    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const [lienPasseport, lienAttestationInscription] = await Promise.all([
      createSignedUrl(reservation.fichierPasseportUrl, "private"),
      createSignedUrl(reservation.fichierAttestationInscriptionUrl, "private"),
    ]);

    const result = await sendMail({
      to: destinataire,
      subject: `Réservation de logement — ${input.prenom} ${input.nom}`,
      html: logementReservationEmailHtml({
        civiliteLabel: CIVILITE_LABEL[input.civilite] ?? input.civilite,
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
        lienPasseport,
        lienAttestationInscription,
        logoUrl: `${base}/images/brand/logo-get-admission.png`,
      }),
    });

    if (!result.ok) throw new Error(result.error || "Échec de l'envoi de l'e-mail");

    await db.logementReservation.update({
      where: { id: reservation.id },
      data: { statut: "transmis", erreurTransmission: null },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de la transmission au partenaire";
    console.error("[logement/reservations] transmission échouée", e);
    await db.logementReservation.update({
      where: { id: reservation.id },
      data: { statut: "erreur", erreurTransmission: message },
    });
  }

  const final = await db.logementReservation.findUnique({ where: { id: reservation.id } });
  return NextResponse.json({ success: true, reservation: final }, { status: 201 });
}
