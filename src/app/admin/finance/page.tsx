"use client";

import * as React from "react";
import type { ColumnDef, Table } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader, createSelectColumn } from "@/components/data-table/data-table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRANSACTIONS, FINANCE_KPIS } from "@/lib/mock/paiements";
import { formatFCFA, formatFCFACompact, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Download, Wallet, TrendingUp, Clock, XCircle, FileDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  reference: string;
  candidat: string;
  dossier: string;
  date: string;
  moyen: string;
  montant: number;
  statut: "réussi" | "en_attente" | "échoué";
};

const STATUT_TONE: Record<string, string> = {
  réussi: "bg-vert/10 text-vert border-vert",
  en_attente: "bg-ambre/10 text-ambre border-ambre",
  échoué: "bg-carmin/10 text-carmin border-carmin",
};

const COLUMNS: ColumnDef<Row>[] = [
  createSelectColumn<Row>(),
  { id: "reference", accessorKey: "reference", header: ({ column }) => <DataTableColumnHeader column={column} title="Référence" />, cell: ({ row }) => <span className="font-mono text-xs font-semibold text-encre">{row.original.reference}</span> },
  { id: "candidat", accessorKey: "candidat", header: ({ column }) => <DataTableColumnHeader column={column} title="Candidat" />, cell: ({ row }) => <span className="text-sm text-encre">{row.original.candidat}</span> },
  { id: "dossier", accessorKey: "dossier", header: ({ column }) => <DataTableColumnHeader column={column} title="Dossier" />, cell: ({ row }) => <span className="font-mono text-xs text-ardoise">{row.original.dossier}</span> },
  { id: "date", accessorKey: "date", header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />, cell: ({ row }) => <span className="text-sm text-encre">{formatDate(row.original.date)}</span> },
  { id: "moyen", accessorKey: "moyen", header: ({ column }) => <DataTableColumnHeader column={column} title="Moyen" />, cell: ({ row }) => <span className="text-sm text-encre">{row.original.moyen}</span> },
  { id: "montant", accessorKey: "montant", header: ({ column }) => <DataTableColumnHeader column={column} title="Montant" />, cell: ({ row }) => <span className="text-right font-mono text-sm font-semibold text-encre">{formatFCFA(row.original.montant)}</span> },
  {
    id: "statut",
    accessorKey: "statut",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
    cell: ({ row }) => <Badge className={cn("font-mono text-[10px] uppercase border", STATUT_TONE[row.original.statut])}>{row.original.statut.replace("_", " ")}</Badge>,
    filterFn: (row, _id, value: string) => value === "tous" ? true : row.original.statut === value,
  },
];

export default function AdminFinancePage() {
  const data: Row[] = React.useMemo(() => TRANSACTIONS.map((t) => ({
    id: t.id,
    reference: t.reference,
    candidat: t.candidatNom,
    dossier: t.dossierReference,
    date: t.date,
    moyen: t.moyen + (t.tranche ? ` · ${t.tranche}` : ""),
    montant: t.montant,
    statut: t.statut as Row["statut"],
  })), []);

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

      {/* KPIs finance — pleine largeur */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceKpi icon={Wallet} label="Encaissé ce mois" value={formatFCFACompact(FINANCE_KPIS.encaisseMois)} tone="vert" />
        <FinanceKpi icon={Clock} label="En attente" value={formatFCFACompact(FINANCE_KPIS.enAttente)} tone="ambre" />
        <FinanceKpi icon={XCircle} label="Impayés" value={formatFCFACompact(FINANCE_KPIS.impayes)} tone="carmin" />
        <FinanceKpi icon={TrendingUp} label="Total encaissé" value={formatFCFACompact(FINANCE_KPIS.totalEncaisse)} tone="lapis" />
      </div>

      <DataTable
        columns={COLUMNS}
        data={data}
        searchKey="candidat"
        searchPlaceholder="Rechercher par candidat…"
        pageSize={8}
        toolbar={(table: Table<Row>) => (
          <Select
            value={(table.getColumn("statut")?.getFilterValue() as string) ?? "tous"}
            onValueChange={(v) => table.getColumn("statut")?.setFilterValue(v)}
          >
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              <SelectItem value="réussi">Réussi</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="échoué">Échoué</SelectItem>
            </SelectContent>
          </Select>
        )}
      />

      <Alert className="border-ambre/30 bg-ambre/5">
        <Info className="h-4 w-4 text-ambre" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Rapprochement bancaire</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          1 transaction en attente (425 000 FCFA — Wave) et 1 échec (320 000 FCFA — carte). Le rapprochement mensuel est prévu le 5 du mois suivant.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function FinanceKpi({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: "vert" | "ambre" | "carmin" | "lapis" }) {
  const toneClass = { vert: "bg-vert/10 text-vert", ambre: "bg-ambre/10 text-ambre", carmin: "bg-carmin/10 text-carmin", lapis: "bg-lapis/10 text-lapis" }[tone];
  return (
    <Card className="border-ligne bg-blanc p-5">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", toneClass)}>
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <p className="mt-3 font-display text-xl font-bold text-encre">{value}</p>
      <p className="text-xs text-ardoise">{label}</p>
    </Card>
  );
}
