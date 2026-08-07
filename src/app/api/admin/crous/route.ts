import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { crousCreateSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

// GET /api/admin/crous — liste des demandes CROUS (SUPER_ADMIN uniquement)
export async function GET() {
  const auth = await requireApiPermission("crous.manage");
  if (!auth.ok) return auth.response;

  const demandes = await db.demandeCrous.findMany({
    include: {
      dossier: {
        select: {
          reference: true,
          candidat: { select: { prenom: true, nom: true } },
          universite: { select: { nom: true } },
        },
      },
      _count: { select: { documents: true, partages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ demandes });
}

// POST /api/admin/crous — crée une demande CROUS à partir d'un dossier (SUPER_ADMIN uniquement)
export async function POST(request: Request) {
  const auth = await requireApiPermission("crous.manage");
  if (!auth.ok) return auth.response;

  const parsed = parseOrRespond(crousCreateSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;

  const dossier = await db.dossier.findUnique({ where: { id: parsed.data.dossierId } });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  const existing = await db.demandeCrous.findFirst({ where: { dossierId: dossier.id } });
  if (existing) {
    return NextResponse.json({ demande: existing, alreadyExists: true });
  }

  const demande = await db.demandeCrous.create({
    data: { dossierId: dossier.id, candidatId: dossier.candidatId },
  });

  await logAudit({
    session: auth.session,
    action: "CREATE",
    resource: "crous",
    resourceId: demande.id,
    details: `Création d'une demande CROUS pour le dossier ${dossier.reference}`,
  });

  return NextResponse.json({ demande }, { status: 201 });
}
