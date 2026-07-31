import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// GET /api/attestations/[dossierId] — attestation d'un dossier (auth requis)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dossierId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { dossierId } = await params;
  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;

  const dossier = await db.dossier.findUnique({
    where: { id: dossierId },
    select: { candidatId: true, reference: true, etat: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  if (role === "CANDIDAT" && dossier.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const attestation = await db.attestation.findUnique({
    where: { dossierId },
    include: {
      emetteur: { select: { prenom: true, nom: true, role: true } },
      dossier: {
        select: {
          reference: true,
          candidat: { select: { prenom: true, nom: true, nationalite: true, email: true } },
          universite: { select: { nom: true, pays: true, drapeau: true } },
          formation: { select: { intitule: true, niveau: true, domaine: true } },
        },
      },
    },
  });

  if (!attestation) {
    return NextResponse.json(
      { error: "Aucune attestation émise pour ce dossier" },
      { status: 404 }
    );
  }

  return NextResponse.json(attestation);
}

// PATCH /api/attestations/[dossierId] — persister modeRemise (telechargement | agence)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ dossierId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { dossierId } = await params;
  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const modeRemise =
    typeof body === "object" && body && "modeRemise" in body
      ? String((body as { modeRemise: unknown }).modeRemise)
      : "";

  if (modeRemise !== "telechargement" && modeRemise !== "agence") {
    return NextResponse.json(
      { error: "modeRemise doit être 'telechargement' ou 'agence'" },
      { status: 400 }
    );
  }

  const dossier = await db.dossier.findUnique({
    where: { id: dossierId },
    select: { candidatId: true, reference: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  if (role === "CANDIDAT" && dossier.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (role !== "CANDIDAT" && !isStaff(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const existing = await db.attestation.findUnique({ where: { dossierId } });
  if (!existing) {
    return NextResponse.json({ error: "Attestation non trouvée" }, { status: 404 });
  }

  const updated = await db.attestation.update({
    where: { dossierId },
    data: { modeRemise },
  });

  await logAudit({
    session,
    action: "UPDATE",
    resource: "attestation",
    resourceId: updated.id,
    details: `Mode remise ${dossier.reference} → ${modeRemise}`,
  });

  return NextResponse.json(updated);
}
