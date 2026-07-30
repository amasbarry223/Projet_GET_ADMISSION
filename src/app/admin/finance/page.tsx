import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  FinanceClient,
  type TransactionRow,
  type FinanceKpis,
} from "@/components/admin/finance-client";

// Server component — fetches transactions + computes finance KPIs via Prisma.
// Auth: any staff member (not CANDIDAT).
export default async function AdminFinancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role === "CANDIDAT") redirect("/connexion");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Transactions + finance KPIs computed in parallel (single round-trip batch).
  const [transactions, encaisseMoisAgg, enAttenteAgg, impayesAgg, totalEncaisseAgg] = await Promise.all([
    db.paiement.findMany({
      include: {
        candidat: { select: { prenom: true, nom: true } },
        dossier: { select: { reference: true } },
      },
      orderBy: { date: "desc" },
    }),
    db.paiement.aggregate({ _sum: { montant: true }, where: { date: { gte: startOfMonth }, statut: "reussi" } }),
    db.paiement.aggregate({ _sum: { montant: true }, where: { statut: "en_attente" } }),
    db.paiement.aggregate({ _sum: { montant: true }, where: { statut: "echoue" } }),
    db.paiement.aggregate({ _sum: { montant: true }, where: { statut: "reussi" } }),
  ]);

  const normalizeStatut = (s: string): TransactionRow["statut"] => {
    const v = s.toLowerCase();
    if (v === "reussi" || v === "réussi") return "réussi";
    if (v === "echoue" || v === "échoué") return "échoué";
    return "en_attente";
  };

  const rows: TransactionRow[] = transactions.map((t) => ({
    id: t.id,
    reference: t.reference,
    candidat: `${t.candidat.prenom} ${t.candidat.nom}`,
    dossier: t.dossier.reference,
    date: t.date.toISOString(),
    moyen: t.moyen + (t.tranche ? ` · ${t.tranche}` : ""),
    montant: t.montant,
    statut: normalizeStatut(t.statut),
  }));

  const kpis: FinanceKpis = {
    encaisseMois: encaisseMoisAgg._sum.montant ?? 0,
    enAttente: enAttenteAgg._sum.montant ?? 0,
    impayes: impayesAgg._sum.montant ?? 0,
    totalEncaisse: totalEncaisseAgg._sum.montant ?? 0,
  };

  return <FinanceClient initialTransactions={rows} initialKpis={kpis} />;
}
