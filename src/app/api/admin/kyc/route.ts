import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-auth";

export type KycStatus = "en_attente" | "verifie" | "incomplet";

function kycStatus(row: {
  kycVerifie: boolean;
  kycRectoPath: string | null;
}): KycStatus {
  if (row.kycVerifie) return "verifie";
  if (row.kycRectoPath) return "en_attente";
  return "incomplet";
}

// GET /api/admin/kyc — liste des candidats + statut KYC (staff dossiers.read)
export async function GET() {
  const auth = await requireApiPermission("dossiers.read");
  if (!auth.ok) return auth.response;

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
      dossiersCandidat: {
        where: { conseillerId: { not: null } },
        select: {
          conseillerId: true,
          conseiller: { select: { prenom: true, nom: true } },
        },
      },
    },
    orderBy: [{ kycVerifie: "asc" }, { updatedAt: "desc" }],
  });

  const data = users.map((u) => {
    const assigned = u.dossiersCandidat[0];
    const conseillerNom = assigned?.conseiller
      ? `${assigned.conseiller.prenom} ${assigned.conseiller.nom}`
      : null;
    return {
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
      conseillerId: assigned?.conseillerId ?? null,
      conseillerNom,
      isAssignedToConseiller: Boolean(assigned?.conseillerId),
    };
  });

  return NextResponse.json({ data });
}
