import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-page-auth";
import { KycClient, type KycRow } from "@/components/admin/kyc-client";

function kycStatus(row: {
  kycVerifie: boolean;
  kycRectoPath: string | null;
  kycVersoPath: string | null;
}): KycRow["statut"] {
  if (row.kycVerifie) return "verifie";
  if (row.kycRectoPath || row.kycVersoPath) return "en_attente";
  return "incomplet";
}

export default async function AdminKycPage() {
  const session = await requireAdminPage("kyc.read");

  // Un conseiller ne doit voir que les candidats dont au moins un dossier lui est affecté —
  // Admin et Super Admin gardent la vue globale sur tous les candidats.
  const isConseiller = session.user.role === "CONSEILLER";

  const users = await db.user.findMany({
    where: {
      role: "CANDIDAT",
      ...(isConseiller ? { dossiersCandidat: { some: { conseillerId: session.user.id } } } : {}),
    },
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

  const rows: KycRow[] = users.map((u) => ({
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

  return <KycClient initialData={rows} />;
}
