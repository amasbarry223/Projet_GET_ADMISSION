import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export type KycStatus = "en_attente" | "verifie" | "incomplet";

function kycStatus(row: {
  kycVerifie: boolean;
  kycRectoPath: string | null;
  kycVersoPath: string | null;
}): KycStatus {
  if (row.kycVerifie) return "verifie";
  if (row.kycRectoPath || row.kycVersoPath) return "en_attente";
  return "incomplet";
}

// GET /api/admin/kyc — liste des candidats + statut KYC (staff dossiers.read)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const gate = requirePermission((session.user as { role?: string }).role, "dossiers.read");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const users = await db.user.findMany({
    where: { role: "CANDIDAT" },
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      telephone: true,
      nationalite: true,
      kycType: true,
      kycNumero: true,
      kycRectoPath: true,
      kycVersoPath: true,
      kycVerifie: true,
      kycVerifieLe: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: [{ kycVerifie: "asc" }, { updatedAt: "desc" }],
  });

  const data = users.map((u) => ({
    id: u.id,
    email: u.email,
    prenom: u.prenom,
    nom: u.nom,
    telephone: u.telephone,
    nationalite: u.nationalite,
    kycType: u.kycType,
    kycNumero: u.kycNumero,
    hasRecto: !!u.kycRectoPath,
    hasVerso: !!u.kycVersoPath,
    kycVerifie: u.kycVerifie,
    kycVerifieLe: u.kycVerifieLe?.toISOString() ?? null,
    updatedAt: u.updatedAt.toISOString(),
    createdAt: u.createdAt.toISOString(),
    statut: kycStatus(u),
  }));

  return NextResponse.json({ data });
}
