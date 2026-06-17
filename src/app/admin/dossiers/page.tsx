"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef, Table } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader } from "@/components/data-table/data-table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOSSIERS } from "@/lib/mock/dossiers";
import { ETATS, etatParCode, COULEUR_BADGE, type EtatCode } from "@/lib/mock/etats";
import { formationParId, nomUniversite } from "@/lib/mock/formations";
import { UNIVERSITES } from "@/lib/mock/universites";
import { formatFCFA, formatDate } from "@/lib/format";
import { ArrowRight, FolderOpen, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  reference: string;
  candidat: string;
  universite: string;
  formation: string;
  etat: EtatCode;
  conseiller: string;
  date: string;
  frais: number;
};

const COLUMNS: ColumnDef<Row>[] = [
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
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <Link href={`/admin/dossiers/${row.original.id}`} className="inline-flex text-ardoise hover:text-lapis" aria-label={`Voir le dossier ${row.original.reference}`}>
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
      </Link>
    ),
    enableHiding: false,
  },
];

export default function AdminDossiersPage() {
  const data: Row[] = React.useMemo(() => DOSSIERS.map((d) => ({
    id: d.id,
    reference: d.reference,
    candidat: `${d.candidatPrenom} ${d.candidatNom}`,
    universite: nomUniversite(d.universiteId),
    formation: formationParId(d.formationId)?.intitule ?? "",
    etat: d.etat,
    conseiller: d.conseillerNom,
    date: d.dateMaj,
    frais: d.fraisAgence,
  })), []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Dossiers</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Tous les dossiers.</h1>
          <p className="text-sm text-ardoise">{DOSSIERS.length} dossiers au total</p>
        </div>
      </div>

      <DataTable
        columns={COLUMNS}
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
                {UNIVERSITES.map((u) => <SelectItem key={u.id} value={u.id}>{u.nom}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={(table.getColumn("conseiller")?.getFilterValue() as string) ?? "Tous"}
              onValueChange={(v) => table.getColumn("conseiller")?.setFilterValue(v)}
            >
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Conseiller" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tous les conseillers</SelectItem>
                <SelectItem value="Aïssatou Diallo">Aïssatou Diallo</SelectItem>
                <SelectItem value="Olivier Nguema">Olivier Nguema</SelectItem>
                <SelectItem value="Non affecté">Non affecté</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      />

      <Alert className="border-ligne bg-blanc">
        <Info className="h-4 w-4 text-lapis" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Sélection multiple</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          Sélectionnez plusieurs dossiers via les cases à cocher pour une action de masse (affectation de conseiller, export). Fonctionnalité de démonstration.
        </AlertDescription>
      </Alert>
    </div>
  );
}
