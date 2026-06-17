"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TRANSACTIONS, FINANCE_KPIS } from "@/lib/mock/paiements";
import { UNIVERSITES } from "@/lib/mock/universites";
import { formatFCFA, formatFCFACompact, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Download, Wallet, TrendingUp, Clock, XCircle, FileDown } from "lucide-react";

const STATUT_TONE: Record<string, string> = {
  réussi: "bg-vert/10 text-vert border-vert",
  en_attente: "bg-ambre/10 text-ambre border-ambre",
  échoué: "bg-carmin/10 text-carmin border-carmin",
};

export default function AdminFinancePage() {
  const [q, setQ] = React.useState("");
  const [statut, setStatut] = React.useState("tous");

  const filtered = TRANSACTIONS.filter((t) => {
    if (q) {
      const s = `${t.reference} ${t.candidatNom} ${t.dossierReference}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    if (statut !== "tous" && t.statut !== statut) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Finance</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Transactions & reçus.</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.success("Export CSV", { description: "transactions-fevrier-2026.csv" })}>
            <FileDown className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => toast.success("Export PDF", { description: "rapport-financier-fevrier-2026.pdf" })}>
            <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Export PDF
          </Button>
        </div>
      </div>

      {/* KPIs finance */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceKpi icon={Wallet} label="Encaissé ce mois" value={formatFCFACompact(FINANCE_KPIS.encaisseMois)} tone="vert" />
        <FinanceKpi icon={Clock} label="En attente" value={formatFCFACompact(FINANCE_KPIS.enAttente)} tone="ambre" />
        <FinanceKpi icon={XCircle} label="Impayés" value={formatFCFACompact(FINANCE_KPIS.impayes)} tone="carmin" />
        <FinanceKpi icon={TrendingUp} label="Total encaissé" value={formatFCFACompact(FINANCE_KPIS.totalEncaisse)} tone="lapis" />
      </div>

      {/* Filters */}
      <Card className="border-ligne bg-blanc p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Référence, candidat, dossier…" />
          </div>
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              <SelectItem value="réussi">Réussi</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="échoué">Échoué</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-ligne bg-blanc p-0 overflow-hidden">
        <div className="overflow-x-auto scroll-fine">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-mono text-[10px] uppercase text-ardoise">Référence</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-ardoise">Candidat</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-ardoise">Dossier</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-ardoise">Date</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-ardoise">Moyen</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-ardoise">Montant</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-ardoise">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} className="border-ligne hover:bg-porcelaine/60">
                  <TableCell className="font-mono text-xs text-encre">{t.reference}</TableCell>
                  <TableCell className="text-sm text-encre">{t.candidatNom}</TableCell>
                  <TableCell className="font-mono text-xs text-ardoise">{t.dossierReference}</TableCell>
                  <TableCell className="text-sm text-encre">{formatDate(t.date)}</TableCell>
                  <TableCell className="text-sm text-encre">{t.moyen}{t.tranche ? ` · ${t.tranche}` : ""}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-encre">{formatFCFA(t.montant)}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={`font-mono text-[10px] uppercase border ${STATUT_TONE[t.statut]}`}>{t.statut.replace("_", " ")}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function FinanceKpi({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: "vert" | "ambre" | "carmin" | "lapis" }) {
  const toneClass = { vert: "bg-vert/10 text-vert", ambre: "bg-ambre/10 text-ambre", carmin: "bg-carmin/10 text-carmin", lapis: "bg-lapis/10 text-lapis" }[tone];
  return (
    <Card className="border-ligne bg-blanc p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-md ${toneClass}`}>
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <p className="mt-3 font-display text-xl font-bold text-encre">{value}</p>
      <p className="text-xs text-ardoise">{label}</p>
    </Card>
  );
}
