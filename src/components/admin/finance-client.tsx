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
import { StatStrip } from "@/components/admin/stat-strip";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFCFA, formatFCFACompact, formatDate } from "@/lib/format";
import { apiFetch, apiJson } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronsUpDown,
  Download,
  Wallet,
  Info,
  FileText,
  Plus,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TransactionRow = {
  id: string;
  reference: string;
  candidat: string;
  dossier: string;
  dossierId: string;
  date: string;
  moyen: string;
  montant: number;
  statut: "réussi" | "en_attente" | "échoué" | "remboursé";
  typeEtablissement?: "PUBLIC" | "PRIVE";
};

export type FinanceKpis = {
  encaisseMois: number;
  enAttente: number;
  impayes: number;
  totalEncaisse: number;
  totalRembourse?: number;
  encaissePublic?: number;
  encaissePrive?: number;
};

type DossierOption = { id: string; reference: string; candidatNom: string };


const STATUT_TONE: Record<string, string> = {
  réussi: "bg-vert/10 text-vert border-vert",
  en_attente: "bg-ambre/10 text-ambre border-ambre",
  échoué: "bg-carmin/10 text-carmin border-carmin",
  remboursé: "bg-purple-500/10 text-purple-600 border-purple-300",
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
  const [refundingRow, setRefundingRow] = React.useState<TransactionRow | null>(null);
  const [refundingStaff, setRefundingStaff] = React.useState(false);
  const rows = initialTransactions;
  const kpis = initialKpis;

  // État du formulaire de transaction manuelle (paiement physique)
  const [dossierOptions, setDossierOptions] = React.useState<DossierOption[] | null>(null);
  const [dossierPickerOpen, setDossierPickerOpen] = React.useState(false);
  const [selectedDossier, setSelectedDossier] = React.useState<DossierOption | null>(null);
  const [formMontant, setFormMontant] = React.useState("");
  const [formMoyen, setFormMoyen] = React.useState("espece");
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    if (!newOpen || dossierOptions !== null) return;
    void apiFetch<Array<{ id: string; reference: string; candidat: { prenom: string; nom: string } }>>(
      "/api/dossiers",
    ).then((result) => {
      if (!result.ok) {
        toast.error("Impossible de charger les dossiers", { description: result.error });
        setDossierOptions([]);
        return;
      }
      setDossierOptions(
        result.data.map((d) => ({
          id: d.id,
          reference: d.reference,
          candidatNom: `${d.candidat.prenom} ${d.candidat.nom}`,
        })),
      );
    });
  }, [newOpen, dossierOptions]);

  const handleRembourser = async () => {
    if (!refundingRow) return;
    setRefundingStaff(true);
    const result = await apiJson("/api/paiements", "PATCH", {
      id: refundingRow.id,
      statut: "rembourse",
    });
    setRefundingStaff(false);
    if (!result.ok) {
      toast.error("Remboursement échoué", { description: result.error });
      return;
    }
    toast.success("Transaction remboursée", {
      description: `Le paiement ${refundingRow.reference} a été marqué comme remboursé.`,
    });
    setRefundingRow(null);
    router.refresh();
  };

  const actions: ActionItem<TransactionRow>[] = React.useMemo(
    () => [
      {
        label: "Télécharger le reçu (PDF)",
        icon: FileText,
        hidden: (row) => row.statut !== "réussi",
        onClick: (row) => window.open(`/api/recu/${row.id}?format=pdf`, "_blank"),
      },
      {
        label: "Rembourser la transaction",
        icon: RotateCcw,
        hidden: (row) => row.statut !== "réussi",
        onClick: (row) => setRefundingRow(row),
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
        id: "typeEtablissement",
        accessorKey: "typeEtablissement",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <span className="font-mono text-[10px] uppercase text-ardoise">
            {row.original.typeEtablissement === "PUBLIC" ? "Public" : "Privé"}
          </span>
        ),
        filterFn: (row, _id, value: string) =>
          value === "tous" ? true : (row.original.typeEtablissement ?? "PRIVE") === value,
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
    if (!selectedDossier) {
      toast.error("Sélectionnez un dossier");
      return;
    }
    setCreating(true);
    const result = await apiJson("/api/admin/paiements", "POST", {
      dossierId: selectedDossier.id,
      montant: Number(formMontant) || 0,
      moyen: formMoyen,
    });
    setCreating(false);
    if (!result.ok) {
      toast.error("Transaction échouée", { description: result.error });
      return;
    }
    toast.success("Transaction enregistrée", { description: "La transaction manuelle a été ajoutée." });
    setNewOpen(false);
    setSelectedDossier(null);
    setFormMontant("");
    setFormMoyen("espece");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
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
            <DialogContent className="bg-card sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-lg font-bold text-encre">
                  Nouvelle transaction manuelle
                </DialogTitle>
                <DialogDescription className="text-sm text-ardoise">
                  Enregistrez un paiement reçu hors plateforme (espèces, virement agence).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleNewTransaction} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-encre">Dossier</Label>
                    <Popover open={dossierPickerOpen} onOpenChange={setDossierPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={dossierPickerOpen}
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {selectedDossier
                              ? `${selectedDossier.reference} — ${selectedDossier.candidatNom}`
                              : "Sélectionner…"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-ardoise" strokeWidth={1.5} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Référence ou candidat…" />
                          <CommandList>
                            <CommandEmpty>
                              {dossierOptions === null ? "Chargement…" : "Aucun dossier trouvé."}
                            </CommandEmpty>
                            <CommandGroup>
                              {(dossierOptions ?? []).map((d) => (
                                <CommandItem
                                  key={d.id}
                                  value={`${d.reference} ${d.candidatNom}`}
                                  onSelect={() => {
                                    setSelectedDossier(d);
                                    setDossierPickerOpen(false);
                                  }}
                                >
                                  <span className="font-mono text-xs text-encre">{d.reference}</span>
                                  <span className="ml-2 truncate text-ardoise">{d.candidatNom}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
          <Button
            variant="outline"
            onClick={() => window.open("/api/admin/export/transactions?format=excel", "_blank")}
          >
            <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open("/api/admin/export/transactions?format=pdf", "_blank")}
          >
            <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Export PDF
          </Button>
        </div>
      </div>

      <StatStrip
        items={[
          { label: "Encaissé ce mois", value: formatFCFACompact(kpis.encaisseMois) },
          { label: "En attente", value: formatFCFACompact(kpis.enAttente) },
          { label: "Impayés", value: formatFCFACompact(kpis.impayes) },
          { label: "Total encaissé", value: formatFCFACompact(kpis.totalEncaisse) },
          { label: "Total remboursé", value: formatFCFACompact(kpis.totalRembourse ?? 0) },
        ]}
      />
      <StatStrip
        className="lg:grid-cols-2"
        items={[
          { label: "Encaissé — public", value: formatFCFACompact(kpis.encaissePublic ?? 0) },
          { label: "Encaissé — privé", value: formatFCFACompact(kpis.encaissePrive ?? 0) },
        ]}
      />

      <DataTable
        columns={columns}
        data={rows}
        searchKey="candidat"
        searchPlaceholder="Rechercher par candidat…"
        pageSize={8}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-2">
            <Wallet className="h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
            <p className="text-sm font-medium text-encre">Aucune transaction</p>
            <p className="text-xs text-ardoise">Aucun paiement ne correspond à ces filtres.</p>
          </div>
        }
        toolbar={(table: Table<TransactionRow>) => (
          <div className="flex flex-wrap gap-2">
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
                <SelectItem value="remboursé">Remboursé</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={(table.getColumn("typeEtablissement")?.getFilterValue() as string) ?? "tous"}
              onValueChange={(v) => table.getColumn("typeEtablissement")?.setFilterValue(v)}
            >
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Public & privé</SelectItem>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="PRIVE">Privé</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

      {/* Confirmation de remboursement staff */}
      <AlertDialog
        open={Boolean(refundingRow)}
        onOpenChange={(open) => {
          if (!open && !refundingStaff) setRefundingRow(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le remboursement ?</AlertDialogTitle>
            <AlertDialogDescription>
              La transaction <strong className="font-mono text-encre">{refundingRow?.reference}</strong> d'un montant de{" "}
              <strong className="font-mono text-encre">
                {refundingRow ? formatFCFA(refundingRow.montant) : ""}
              </strong>{" "}
              sera marquée comme remboursée. Le statut du dossier ({refundingRow?.dossier}) sera recalculé
              automatiquement et un e-mail de confirmation sera adressé au candidat ({refundingRow?.candidat}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refundingStaff}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-purple-600 text-blanc hover:bg-purple-700"
              disabled={refundingStaff}
              onClick={(e) => {
                e.preventDefault();
                void handleRembourser();
              }}
            >
              {refundingStaff ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />
                  Traitement…
                </>
              ) : (
                "Rembourser"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

