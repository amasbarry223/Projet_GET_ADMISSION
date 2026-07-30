"use client";

import * as React from "react";
import type { ColumnDef, Table } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  createSelectColumn,
  createActionsColumn,
  type ActionItem,
} from "@/components/data-table/data-table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFCFA, formatFCFACompact, formatDate } from "@/lib/format";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  Wallet,
  TrendingUp,
  Clock,
  XCircle,
  Info,
  Eye,
  FileText,
  RefreshCw,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TransactionRow = {
  id: string;
  reference: string;
  candidat: string;
  dossier: string;
  date: string;
  moyen: string;
  montant: number;
  statut: "réussi" | "en_attente" | "échoué";
};

export type FinanceKpis = {
  encaisseMois: number;
  enAttente: number;
  impayes: number;
  totalEncaisse: number;
};

const STATUT_TONE: Record<string, string> = {
  réussi: "bg-vert/10 text-vert border-vert",
  en_attente: "bg-ambre/10 text-ambre border-ambre",
  échoué: "bg-carmin/10 text-carmin border-carmin",
};

export function FinanceClient({
  initialTransactions,
  initialKpis,
}: {
  initialTransactions: TransactionRow[];
  initialKpis: FinanceKpis;
}) {
  const router = useRouter();
  const [newOpen, setNewOpen] = React.useState(false);
  // On lit directement la prop `initialTransactions` (pas de useState) afin que
  // `router.refresh()` (re-render du Server Component) se reflète dans l'UI.
  const rows = initialTransactions;
  const kpis = initialKpis;

  // État du formulaire de transaction manuelle
  const [formDossierId, setFormDossierId] = React.useState("");
  const [formMontant, setFormMontant] = React.useState("");
  const [formMoyen, setFormMoyen] = React.useState("espece");
  const [creating, setCreating] = React.useState(false);

  const actions: ActionItem<TransactionRow>[] = React.useMemo(
    () => [
      {
        label: "Voir le reçu",
        icon: Eye,
        onClick: (row) => toast.success("Reçu ouvert", { description: `${row.reference} — ${row.candidat}.` }),
      },
      {
        label: "Télécharger le reçu",
        icon: FileText,
        onClick: (row) => toast.success("Reçu téléchargé", { description: `${row.reference}.pdf` }),
      },
      {
        label: "Relancer la transaction",
        icon: RefreshCw,
        confirm: {
          title: "Relancer la transaction ?",
          description: (row) =>
            `Une nouvelle tentative de prélèvement sera effectuée pour ${row.reference}.`,
          confirmLabel: "Relancer",
          onConfirm: (row) =>
            toast.success("Transaction relancée", { description: `${row.reference} — nouvelle tentative en cours.` }),
        },
      },
    ],
    []
  );

  const columns: ColumnDef<TransactionRow>[] = React.useMemo(
    () => [
      createSelectColumn<TransactionRow>(),
      {
        id: "reference",
        accessorKey: "reference",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Référence" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-encre">{row.original.reference}</span>
        ),
      },
      {
        id: "candidat",
        accessorKey: "candidat",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Candidat" />,
        cell: ({ row }) => <span className="text-sm text-encre">{row.original.candidat}</span>,
      },
      {
        id: "dossier",
        accessorKey: "dossier",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Dossier" />,
        cell: ({ row }) => <span className="font-mono text-xs text-ardoise">{row.original.dossier}</span>,
      },
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => <span className="text-sm text-encre">{formatDate(row.original.date)}</span>,
      },
      {
        id: "moyen",
        accessorKey: "moyen",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Moyen" />,
        cell: ({ row }) => <span className="text-sm text-encre">{row.original.moyen}</span>,
      },
      {
        id: "montant",
        accessorKey: "montant",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Montant" />,
        cell: ({ row }) => (
          <span className="text-right font-mono text-sm font-semibold text-encre">
            {formatFCFA(row.original.montant)}
          </span>
        ),
      },
      {
        id: "statut",
        accessorKey: "statut",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
        cell: ({ row }) => (
          <Badge className={cn("font-mono text-[10px] uppercase border", STATUT_TONE[row.original.statut])}>
            {row.original.statut.replace("_", " ")}
          </Badge>
        ),
        filterFn: (row, _id, value: string) => (value === "tous" ? true : row.original.statut === value),
      },
      createActionsColumn<TransactionRow>(actions, {
        ariaLabel: (row) => `Actions sur la transaction ${row.reference}`,
      }),
    ],
    [actions]
  );

  const handleNewTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/paiements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dossierId: formDossierId,
          montant: Number(formMontant) || 0,
          moyen: formMoyen,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Transaction échouée", { description: (err as any)?.error ?? "Erreur serveur." });
        return;
      }
      toast.success("Transaction enregistrée", { description: "La transaction manuelle a été ajoutée." });
      setNewOpen(false);
      setFormDossierId("");
      setFormMontant("");
      setFormMoyen("espece");
      router.refresh();
    } catch {
      toast.error("Transaction échouée", { description: "Erreur réseau." });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Finance</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
            Transactions &amp; reçus.
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button className="bg-lapis text-blanc hover:bg-lapis/90">
                <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Nouvelle transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-blanc sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-lg font-bold text-encre">
                  Nouvelle transaction manuelle
                </DialogTitle>
                <DialogDescription className="text-sm text-ardoise">
                  Enregistrez un paiement reçu hors plateforme (espèces, virement agence).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleNewTransaction} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-encre">Candidat</Label>
                    <Input
                      value={formDossierId}
                      onChange={(e) => setFormDossierId(e.target.value)}
                      placeholder="Référence dossier"
                      className="font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-encre">Montant (FCFA)</Label>
                    <Input
                      type="number"
                      value={formMontant}
                      onChange={(e) => setFormMontant(e.target.value)}
                      placeholder="850000"
                      className="font-mono"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Moyen de paiement</Label>
                  <Select value={formMoyen} onValueChange={setFormMoyen}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="espece">Espèces (agence)</SelectItem>
                      <SelectItem value="virement">Virement bancaire</SelectItem>
                      <SelectItem value="orange">Orange Money</SelectItem>
                      <SelectItem value="wave">Wave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setNewOpen(false)} disabled={creating}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-lapis text-blanc hover:bg-lapis/90" disabled={creating}>
                    {creating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
                    Enregistrer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => toast.success("Export CSV", { description: "transactions-export.csv" })}>
            <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => toast.success("Export PDF", { description: "rapport-financier.pdf" })}>
            <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Export PDF
          </Button>
        </div>
      </div>

      {/* KPIs finance */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceKpi icon={Wallet} label="Encaissé ce mois" value={formatFCFACompact(kpis.encaisseMois)} tone="vert" />
        <FinanceKpi icon={Clock} label="En attente" value={formatFCFACompact(kpis.enAttente)} tone="ambre" />
        <FinanceKpi icon={XCircle} label="Impayés" value={formatFCFACompact(kpis.impayes)} tone="carmin" />
        <FinanceKpi icon={TrendingUp} label="Total encaissé" value={formatFCFACompact(kpis.totalEncaisse)} tone="lapis" />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchKey="candidat"
        searchPlaceholder="Rechercher par candidat…"
        pageSize={8}
        toolbar={(table: Table<TransactionRow>) => (
          <Select
            value={(table.getColumn("statut")?.getFilterValue() as string) ?? "tous"}
            onValueChange={(v) => table.getColumn("statut")?.setFilterValue(v)}
          >
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
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
          {kpis.enAttente > 0 && <> {formatFCFA(kpis.enAttente)} en attente. </>}
          {kpis.impayes > 0 && <>{formatFCFA(kpis.impayes)} en impayés. </>}
          Le rapprochement mensuel est prévu le 5 du mois suivant.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function FinanceKpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: "vert" | "ambre" | "carmin" | "lapis";
}) {
  const toneClass = {
    vert: "bg-vert/10 text-vert",
    ambre: "bg-ambre/10 text-ambre",
    carmin: "bg-carmin/10 text-carmin",
    lapis: "bg-lapis/10 text-lapis",
  }[tone];
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
