import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

// GET /api/admin/export/dossiers — Export CSV des dossiers
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission((session.user as { role?: string }).role, "dossiers.read");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const dossiers = await db.dossier.findMany({
    include: {
      candidat: { select: { prenom: true, nom: true, email: true } },
      universite: { select: { nom: true } },
      formation: { select: { intitule: true } },
      conseiller: { select: { prenom: true, nom: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const headers = ["Référence", "Candidat", "E-mail", "Université", "Formation", "État", "Étape", "Conseiller", "Frais (FCFA)", "Paiement", "Date MAJ"];
  const rows = dossiers.map((d) => [
    d.reference,
    `${d.candidat.prenom} ${d.candidat.nom}`,
    d.candidat.email,
    d.universite.nom,
    d.formation.intitule,
    d.etat,
    String(d.etapeActuelle),
    d.conseiller ? `${d.conseiller.prenom} ${d.conseiller.nom}` : "Non affecté",
    String(d.fraisAgence),
    d.paiementStatut,
    d.updatedAt.toISOString().split("T")[0],
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dossiers-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
