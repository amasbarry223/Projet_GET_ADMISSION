import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { correctionMotifSchema } from "@/lib/validations";

// POST /api/admin/logement/crous/[id]/correction — le staff demande une correction au candidat
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

  const demande = await db.demandeLogementCrous.findUnique({
    where: { id },
    include: { candidat: { select: { id: true, prenom: true, email: true } } },
  });
  if (!demande) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  const updated = await db.demandeLogementCrous.update({
    where: { id },
    data: { statut: "correction_demandee", motifCorrection: motif },
  });

  await createNotification({
    userId: demande.candidatId,
    titre: "Correction demandée — Demande de logement CROUS",
    message: motif,
    type: "logement",
    lien: "/espace/logement",
  });


  await logAudit({
    session: auth.session,
    action: "UPDATE",
    resource: "logement",
    resourceId: id,
    details: `Correction demandée sur la demande de logement CROUS de ${demande.prenom} ${demande.nom} : ${motif}`,
  });

  return NextResponse.json(updated);
}
