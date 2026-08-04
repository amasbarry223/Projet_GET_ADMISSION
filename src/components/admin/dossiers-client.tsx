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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ETATS, etatParCode, COULEUR_BADGE } from "@/lib/etats";
import { formatFCFA, formatDate } from "@/lib/format";
import { apiFetch, apiJson } from "@/lib/api-client";
import { toast } from "sonner";
import { FolderOpen, UserCog, Download, Eye, UserPlus, Send, Loader2 } from "lucide-react";
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

type Conseiller = { id: string; prenom: string; nom: string; role: string; actif: boolean };

export function DossiersClient({ initialData }: { initialData: DossierRow[] }) {
  const router = useRouter();
  const [data] = React.useState<DossierRow[]>(initialData);

  const universiteOptions = React.useMemo(() => {
    return Array.from(new Set(data.map((r) => r.universite).filter((v) => v && v !== "—"))).sort();
  }, [data]);

  const conseillerOptions = React.useMemo(() => {
    return Array.from(new Set(data.map((r) => r.conseiller).filter((v) => v && v !== "Non affecté"))).sort();
  }, [data]);

  // ───────────────────────── Affectation conseiller (dialog partagé) ─────────────────────────
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignTargets, setAssignTargets] = React.useState<DossierRow[]>([]);
  const [conseillers, setConseillers] = React.useState<Conseiller[] | null>(null);
  const [selectedConseillerId, setSelectedConseillerId] = React.useState("");
  const [assigning, setAssigning] = React.useState(false);
  const resetSelectionRef = React.useRef<(() => void) | null>(null);

  const openAssign = React.useCallback((targets: DossierRow[], resetSelection?: () => void) => {
    setAssignTargets(targets);
    setSelectedConseillerId("");
    resetSelectionRef.current = resetSelection ?? null;
    setAssignOpen(true);
    setConseillers((prev) => {
      if (prev) return prev;
      void apiFetch<Conseiller[]>("/api/admin/users").then((result) => {
        if (!result.ok) {
          toast.error("Impossible de charger les conseillers", { description: result.error });
          setConseillers([]);
          return;
        }
        setConseillers(result.data.filter((u) => u.role === "CONSEILLER" && u.actif));
      });
      return prev;
    });
  }, []);

  const confirmAssign = React.useCallback(async () => {
    const cons = conseillers?.find((c) => c.id === selectedConseillerId);
    if (!cons) return;
    setAssigning(true);
    const results = await Promise.all(
      assignTargets.map((row) => apiJson(`/api/dossiers/${row.id}`, "PUT", { conseillerId: cons.id })),
    );
    setAssigning(false);
    setAssignOpen(false);
    const failed = results.filter((r) => !r.ok).length;
    const consName = `${cons.prenom} ${cons.nom}`;
    if (failed > 0) {
      toast.error("Affectation partielle", {
        description: `${assignTargets.length - failed}/${assignTargets.length} dossier(s) affecté(s) à ${consName}.`,
      });
    } else {
      toast.success("Conseiller affecté", {
        description:
          assignTargets.length === 1
            ? `${consName} → ${assignTargets[0]!.reference}`
            : `${consName} → ${assignTargets.length} dossier(s)`,
      });
    }
    resetSelectionRef.current?.();
    router.refresh();
  }, [assignTargets, conseillers, router, selectedConseillerId]);

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
        onClick: (row) => openAssign([row]),
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
            const result = await apiJson(`/api/dossiers/${row.id}/workflow`, "POST", { action: "transmettre" });
            if (!result.ok) {
              toast.error("Transmission impossible", { description: result.error });
              return;
            }
            toast.success("Dossier transmis", { description: `${row.reference} envoyé à ${row.universite}.` });
            router.refresh();
          },
        },
      },
    ],
    [router, openAssign],
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
    [actions],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
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
          const selectedRows = table.getFilteredSelectedRowModel().rows;
          const count = selectedRows.length;
          return (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-ligne bg-blanc"
                onClick={() =>
                  openAssign(
                    selectedRows.map((r) => r.original),
                    () => table.resetRowSelection(),
                  )
                }
              >
                <UserCog className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Affecter un conseiller
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-ligne bg-blanc"
                onClick={() => window.open("/api/admin/export/dossiers", "_blank")}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Exporter ({count})
              </Button>
            </>
          );
        }}
      />

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Affecter un conseiller</DialogTitle>
            <DialogDescription>
              {assignTargets.length === 1
                ? `Choisissez le conseiller responsable du dossier ${assignTargets[0]!.reference}.`
                : `Choisissez le conseiller responsable des ${assignTargets.length} dossiers sélectionnés.`}
            </DialogDescription>
          </DialogHeader>

          {conseillers === null ? (
            <div className="flex items-center gap-2 py-2 text-sm text-ardoise">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Chargement des conseillers…
            </div>
          ) : conseillers.length === 0 ? (
            <p className="py-2 text-sm text-ardoise">Aucun conseiller actif disponible.</p>
          ) : (
            <Select value={selectedConseillerId} onValueChange={setSelectedConseillerId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un conseiller" />
              </SelectTrigger>
              <SelectContent>
                {conseillers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-lapis text-blanc hover:bg-lapis/90"
              disabled={!selectedConseillerId || assigning}
              onClick={() => void confirmAssign()}
            >
              {assigning && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
              Affecter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
