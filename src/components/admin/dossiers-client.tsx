"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef, Table } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  createSelectColumn,
  createActionsColumn,
  type ActionItem,
} from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ETATS, etatParCode, COULEUR_BADGE } from "@/lib/etats";
import { formatFCFA, formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  FolderOpen,
  Info,
  UserCog,
  Download,
  Eye,
  UserPlus,
  Send,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DossierRow = {
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

export function DossiersClient({ initialData }: { initialData: DossierRow[] }) {
  const router = useRouter();
  const [data] = React.useState<DossierRow[]>(initialData);

  const universiteOptions = React.useMemo(() => {
    return Array.from(new Set(data.map((r) => r.universite).filter((v) => v && v !== "—"))).sort();
  }, [data]);

  const conseillerOptions = React.useMemo(() => {
    return Array.from(new Set(data.map((r) => r.conseiller).filter((v) => v && v !== "Non affecté"))).sort();
  }, [data]);

  const actions: ActionItem<DossierRow>[] = React.useMemo(
    () => [
      {
        label: "Voir le dossier",
        icon: Eye,
        onClick: (row) => router.push(`/admin/dossiers/${row.id}`),
      },
      {
        label: "Affecter un conseiller",
        icon: UserPlus,
        onClick: async (row) => {
          // Récupère la liste des conseillers
          try {
            const usersRes = await fetch("/api/admin/users");
            const users = usersRes.ok ? await usersRes.json() : [];
            const conseillers = users.filter((u: any) => u.role === "CONSEILLER" && u.actif);
            if (conseillers.length === 0) {
              toast.error("Aucun conseiller", { description: "Aucun conseiller actif disponible." });
              return;
            }
            const choix = window.prompt(
              `Choisissez un conseiller :\n${conseillers.map((c: any, i: number) => `${i + 1}. ${c.nom}`).join("\n")}\n\nEntrez le numéro :`
            );
            const idx = parseInt(choix ?? "0", 10) - 1;
            if (idx < 0 || idx >= conseillers.length) return;
            const cons = conseillers[idx];
            const res = await fetch(`/api/dossiers/${row.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conseillerId: cons.id }),
            });
            if (res.ok) {
              toast.success("Conseiller affecté", { description: `${cons.nom} → ${row.reference}` });
              router.refresh();
            } else {
              toast.error("Échec", { description: "L'affectation a échoué." });
            }
          } catch {
            toast.error("Erreur réseau");
          }
        },
      },
      {
        label: "Transmettre à l'université",
        icon: Send,
        confirm: {
          title: "Transmettre à l'université ?",
          description: (row) =>
            `Le dossier ${row.reference} sera envoyé à ${row.universite}. Réservé aux dossiers avec paiement confirmé.`,
          confirmLabel: "Transmettre",
          onConfirm: async (row) => {
            try {
              const res = await fetch(`/api/dossiers/${row.id}/workflow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "transmettre" }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                toast.error("Transmission impossible", {
                  description: (data as { error?: string }).error ?? "Vérifiez l'état et le paiement du dossier.",
                });
                return;
              }
              toast.success("Dossier transmis", {
                description: `${row.reference} envoyé à ${row.universite}.`,
              });
              router.refresh();
            } catch {
              toast.error("Erreur réseau", {
                description: "Connexion impossible. Vérifiez votre réseau et réessayez.",
              });
            }
          },
        },
      },
      {
        label: "Exporter le dossier",
        icon: FileText,
        onClick: (row) => window.open(`/api/admin/export/dossiers`, "_blank"),
      },
    ],
    [router]
  );

  const columns: ColumnDef<DossierRow>[] = React.useMemo(
    () => [
      createSelectColumn<DossierRow>(),
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
        cell: ({ row }) => <span className="text-sm font-medium text-encre">{row.original.candidat}</span>,
      },
      {
        id: "universite",
        accessorKey: "universite",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Université" />,
        cell: ({ row }) => <span className="text-sm text-encre">{row.original.universite}</span>,
        filterFn: (row, _id, value: string) => (value === "tous" ? true : row.original.universite === value),
      },
      {
        id: "formation",
        accessorKey: "formation",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Formation" />,
        cell: ({ row }) => (
          <span className="max-w-[220px] truncate text-sm text-ardoise" title={row.original.formation}>
            {row.original.formation}
          </span>
        ),
      },
      {
        id: "etat",
        accessorKey: "etat",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
        cell: ({ row }) => {
          const e = etatParCode(row.original.etat);
          const c = COULEUR_BADGE[e.couleur];
          return (
            <Badge className={cn("font-mono text-[10px] uppercase", c.text, c.border, c.bg)}>{e.libelle}</Badge>
          );
        },
        filterFn: (row, _id, value: string) =>
          value === "tous" ? true : row.original.etat.toLowerCase() === String(value).toLowerCase(),
      },
      {
        id: "conseiller",
        accessorKey: "conseiller",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Conseiller" />,
        cell: ({ row }) => <span className="text-sm text-ardoise">{row.original.conseiller}</span>,
        filterFn: (row, _id, value: string) => (value === "Tous" ? true : row.original.conseiller === value),
      },
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-ardoise">{formatDate(row.original.date)}</span>
        ),
      },
      {
        id: "frais",
        accessorKey: "frais",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Frais" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-encre">{formatFCFA(row.original.frais)}</span>
        ),
      },
      createActionsColumn<DossierRow>(actions, { ariaLabel: (row) => `Actions sur le dossier ${row.reference}` }),
    ],
    [actions]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Dossiers</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
            Tous les dossiers.
          </h1>
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
            <p className="text-sm text-ardoise">
              Aucun dossier ne correspond à ces filtres. Élargissez votre recherche.
            </p>
          </div>
        }
        toolbar={(table: Table<DossierRow>) => (
          <>
            <Select
              value={(table.getColumn("etat")?.getFilterValue() as string) ?? "tous"}
              onValueChange={(v) => table.getColumn("etat")?.setFilterValue(v)}
            >
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                {ETATS.map((e) => (
                  <SelectItem key={e.code} value={e.code}>
                    {e.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={(table.getColumn("universite")?.getFilterValue() as string) ?? "tous"}
              onValueChange={(v) => table.getColumn("universite")?.setFilterValue(v)}
            >
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Université" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Toutes les universités</SelectItem>
                {universiteOptions.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={(table.getColumn("conseiller")?.getFilterValue() as string) ?? "Tous"}
              onValueChange={(v) => table.getColumn("conseiller")?.setFilterValue(v)}
            >
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Conseiller" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tous les conseillers</SelectItem>
                <SelectItem value="Non affecté">Non affecté</SelectItem>
                {conseillerOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        selectionBar={(table: Table<DossierRow>) => {
          const count = table.getFilteredSelectedRowModel().rows.length;
          return (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-ligne bg-blanc"
                onClick={async () => {
                  const selected = table.getFilteredSelectedRowModel().rows;
                  try {
                    const usersRes = await fetch("/api/admin/users");
                    const users = usersRes.ok ? await usersRes.json() : [];
                    const conseillers = users.filter((u: any) => u.role === "CONSEILLER" && u.actif);
                    if (conseillers.length === 0) {
                      toast.error("Aucun conseiller disponible");
                      return;
                    }
                    const choix = window.prompt(
                      `Affecter un conseiller à ${count} dossier(s) :\n${conseillers.map((c: any, i: number) => `${i + 1}. ${c.nom}`).join("\n")}\n\nEntrez le numéro :`
                    );
                    const idx = parseInt(choix ?? "0", 10) - 1;
                    if (idx < 0 || idx >= conseillers.length) return;
                    const cons = conseillers[idx];
                    await Promise.all(
                      selected.map((r) =>
                        fetch(`/api/dossiers/${r.original.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ conseillerId: cons.id }),
                        })
                      )
                    );
                    toast.success("Conseiller affecté", { description: `${count} dossier(s) → ${cons.nom}` });
                    table.resetRowSelection();
                    router.refresh();
                  } catch {
                    toast.error("Erreur réseau");
                  }
                }}
              >
                <UserCog className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Affecter un conseiller
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-ligne bg-blanc"
                onClick={() => window.open("/api/admin/export/dossiers", "_blank")}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Exporter
              </Button>
            </>
          );
        }}
      />

      <Alert className="border-ligne bg-blanc">
        <Info className="h-4 w-4 text-lapis" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">
          Sélection multiple &amp; actions par ligne
        </AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          Cochez plusieurs dossiers pour une action de masse (affectation, export). Le menu{" "}
          <strong>⋯</strong> en fin de chaque ligne donne accès aux actions individuelles : voir,
          affecter, transmettre, exporter.
        </AlertDescription>
      </Alert>
    </div>
  );
}
