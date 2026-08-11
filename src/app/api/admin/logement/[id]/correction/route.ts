import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";
import { sendMail, logementCorrectionEmailHtml } from "@/lib/mail";
import { logAudit } from "@/lib/audit";
import { correctionMotifSchema } from "@/lib/validations";

// POST /api/admin/logement/[id]/correction — le staff demande une correction au candidat
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("logement.write");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = parseOrRespond(correctionMotifSchema, body);
  if (!parsed.ok) return parsed.response;
  const { motif } = parsed.data;

  const reservation = await db.logementReservation.findUnique({
    where: { id },
    include: { candidat: { select: { id: true, prenom: true, email: true } } },
  });
  if (!reservation) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  const updated = await db.logementReservation.update({
    where: { id },
    data: { statut: "correction_demandee", motifCorrection: motif },
  });

  await createNotification({
    userId: reservation.candidatId,
    titre: "Correction demandée — Réservation de logement",
    message: motif,
    type: "logement",
    lien: "/espace/logement",
  });

  if (reservation.candidat.email) {
    try {
      await sendMail({
        to: reservation.candidat.email,
        subject: "GET Admission — Correction demandée sur votre demande de logement",
        html: logementCorrectionEmailHtml(reservation.candidat.prenom, motif),
      });
    } catch (e) {
      console.error("[admin/logement/correction] email", e);
    }
  }

  await logAudit({
    session: auth.session,
    action: "UPDATE",
    resource: "logement",
    resourceId: id,
    details: `Correction demandée sur la demande de logement de ${reservation.prenom} ${reservation.nom} : ${motif}`,
  });

  return NextResponse.json(updated);
}
