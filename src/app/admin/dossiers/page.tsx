"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef, Table } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader, createSelectColumn, createActionsColumn, type ActionItem } from "@/components/data-table/data-table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ETATS, etatParCode, COULEUR_BADGE } from "@/lib/etats";
import { formatFCFA, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { FolderOpen, Info, UserCog, Download, Eye, UserPlus, Send, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  reference: string;
  candidat: string;
  universite: string;
  formation: string;
  etat: string;
  conseiller: string;
  date: string;
  frais: number;
};

type DossierApi = {
  id: string;
  reference: string;
  etat: string;
  etapeActuelle: number;
  fraisAgence: number;
  updatedAt: string;
  candidat: { prenom: string; nom: string };
  universite: { nom: string };
  formation: { intitule: string };
  conseiller: { prenom: string; nom: string } | null;
};

export default function AdminDossiersPage() {
  const router = useRouter();
  const [data, setData] = React.useState<Row[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/dossiers")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DossierApi[] | null) => {
        if (!d) {
          setError("Impossible de charger les dossiers.");
          setLoading(false);
          return;
        }
        const rows: Row[] = d.map((item) => ({
          id: item.id,
          reference: item.reference,
          candidat: `${item.candidat?.prenom ?? ""} ${item.candidat?.nom ?? ""}`.trim(),
          universite: item.universite?.nom ?? "—",
          formation: item.formation?.intitule ?? "",
          etat: (item.etat ?? "").toLowerCase(),
          conseiller: item.conseiller ? `${item.conseiller.prenom} ${item.conseiller.nom}` : "Non affecté",
          date: item.updatedAt,
          frais: item.fraisAgence ?? 0,
        }));
        setData(rows);
        setLoading(false);
      })
      .catch(() => {
        setError("Erreur réseau lors du chargement des dossiers.");
        setLoading(false);
      });
  }, []);

  const universiteOptions = React.useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.map((r) => r.universite).filter((v) => v && v !== "—"))).sort();
  }, [data]);

  const conseillerOptions = React.useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.map((r) => r.conseiller).filter((v) => v && v !== "Non affecté"))).sort();
  }, [data]);

  const actions: ActionItem<Row>[] = React.useMemo(() => [
    {
      label: "Voir le dossier",
      icon: Eye,
      onClick: (row) => router.push(`/admin/dossiers/${row.id}`),
    },
    {
      label: "Affecter un conseiller",
      icon: UserPlus,
      onClick: (row) => toast.success("Conseiller affecté", { description: `Dossier ${row.reference} réaffecté.` }),
    },
    {
      label: "Transmettre à l'université",
      icon: Send,
      confirm: {
        title: "Transmettre à l'université ?",
        description: (row) => `Le dossier ${row.reference} sera envoyé à ${row.universite}. Cette action est irréversible.`,
        confirmLabel: "Transmettre",
        onConfirm: (row) => toast.success("Dossier transmis", { description: `${row.reference} envoyé à ${row.universite}.` }),
      },
    },
    {
      label: "Exporter le dossier",
      icon: FileText,
      onClick: (row) => toast.success("Export généré", { description: `${row.reference}.pdf téléchargé.` }),
    },
  ], [router]);

  const columns: ColumnDef<Row>[] = React.useMemo(() => [
    createSelectColumn<Row>(),
    {
      id: "reference",
      accessorKey: "reference",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Référence" />,
      cell: ({ row }) => <span className="font-mono text-xs font-semibold text-encre">{row.original.reference}</span>,
    },
    {
      id: "candidat",
      accessorKey: "candidat",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Candidat" />,
      cell: ({ row }) => <span className="text-sm font-medium text-encre">{row.original.candidat}</span>,
    },
    {
      id: "universite",
      accessorKey: "universite",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Université" />,
      cell: ({ row }) => <span className="text-sm text-encre">{row.original.universite}</span>,
      filterFn: (row, _id, value: string) => value === "tous" ? true : row.original.universite === value,
    },
    {
      id: "formation",
      accessorKey: "formation",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Formation" />,
      cell: ({ row }) => <span className="max-w-[220px] truncate text-sm text-ardoise" title={row.original.formation}>{row.original.formation}</span>,
    },
    {
      id: "etat",
      accessorKey: "etat",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
      cell: ({ row }) => {
        const e = etatParCode(row.original.etat);
        const c = COULEUR_BADGE[e.couleur];
        return <Badge className={cn("font-mono text-[10px] uppercase", c.text, c.border, c.bg)}>{e.libelle}</Badge>;
      },
      filterFn: (row, _id, value: string) => value === "tous" ? true : row.original.etat === value,
    },
    {
      id: "conseiller",
      accessorKey: "conseiller",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Conseiller" />,
      cell: ({ row }) => <span className="text-sm text-ardoise">{row.original.conseiller}</span>,
      filterFn: (row, _id, value: string) => value === "Tous" ? true : row.original.conseiller === value,
    },
    {
      id: "date",
      accessorKey: "date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span className="font-mono text-xs text-ardoise">{formatDate(row.original.date)}</span>,
    },
    {
      id: "frais",
      accessorKey: "frais",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Frais" />,
      cell: ({ row }) => <span className="font-mono text-xs font-semibold text-encre">{formatFCFA(row.original.frais)}</span>,
    },
    createActionsColumn<Row>(actions, { ariaLabel: (row) => `Actions sur le dossier ${row.reference}` }),
  ], [actions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-lapis" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert className="border-carmin/40 bg-carmin/5">
        <Info className="h-4 w-4 text-carmin" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Erreur de chargement</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">{error ?? "Données indisponibles."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Dossiers</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Tous les dossiers.</h1>
          <p className="text-sm text-ardoise">{data.length} dossiers au total</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="candidat"
        searchPlaceholder="Rechercher par candidat…"
        pageSize={8}
        emptyState={
          <div className="flex flex-col items-center gap-3">
            <FolderOpen className="h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
            <p className="text-sm text-ardoise">Aucun dossier ne correspond à ces filtres. Élargissez votre recherche.</p>
          </div>
        }
        toolbar={(table: Table<Row>) => (
          <>
            <Select
              value={(table.getColumn("etat")?.getFilterValue() as string) ?? "tous"}
              onValueChange={(v) => table.getColumn("etat")?.setFilterValue(v)}
            >
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                {ETATS.map((e) => <SelectItem key={e.code} value={e.code}>{e.libelle}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={(table.getColumn("universite")?.getFilterValue() as string) ?? "tous"}
              onValueChange={(v) => table.getColumn("universite")?.setFilterValue(v)}
            >
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Université" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Toutes les universités</SelectItem>
                {universiteOptions.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={(table.getColumn("conseiller")?.getFilterValue() as string) ?? "Tous"}
              onValueChange={(v) => table.getColumn("conseiller")?.setFilterValue(v)}
            >
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Conseiller" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tous les conseillers</SelectItem>
                <SelectItem value="Non affecté">Non affecté</SelectItem>
                {conseillerOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
        selectionBar={(table: Table<Row>) => {
          const count = table.getFilteredSelectedRowModel().rows.length;
          return (
            <>
              <Button variant="outline" size="sm" className="h-8 border-ligne bg-blanc" onClick={() => toast.success("Conseiller affecté", { description: `${count} dossier${count > 1 ? "s" : ""} réaffecté${count > 1 ? "s" : ""}.` })}>
                <UserCog className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Affecter un conseiller
              </Button>
              <Button variant="outline" size="sm" className="h-8 border-ligne bg-blanc" onClick={() => toast.success("Export généré", { description: `${count} dossier${count > 1 ? "s" : ""} exporté${count > 1 ? "s" : ""} en CSV.` })}>
                <Download className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Exporter
              </Button>
            </>
          );
        }}
      />

      <Alert className="border-ligne bg-blanc">
        <Info className="h-4 w-4 text-lapis" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Sélection multiple & actions par ligne</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          Cochez plusieurs dossiers pour une action de masse (affectation, export). Le menu <strong>⋯</strong> en fin de chaque ligne donne accès aux actions individuelles : voir, affecter, transmettre, exporter.
        </AlertDescription>
      </Alert>
    </div>
  );
}

