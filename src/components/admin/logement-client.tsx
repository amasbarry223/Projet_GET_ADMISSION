"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  createActionsColumn,
  type ActionItem,
} from "@/components/data-table/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { apiJson } from "@/lib/api-client";
import { toast } from "sonner";
import { BedDouble, Eye, Loader2, Printer, Trash2 } from "lucide-react";

export type LogementRow = {
  id: string;
  candidat: string;
  email: string;
  ville: string;
  nationalite: string;
  statut: "soumis" | "en_cours_traitement" | "correction_demandee" | "traite";
  soumiseLe: string;
};

const STATUT_LABEL: Record<string, string> = {
  soumis: "Soumise",
  en_cours_traitement: "En cours de traitement",
  correction_demandee: "Correction demandée",
  traite: "Traité",
};

const STATUT_TONE: Record<string, string> = {
  soumis: "text-ambre border-ambre bg-ambre/5",
  en_cours_traitement: "text-vert border-vert bg-vert/5",
  correction_demandee: "text-lapis border-lapis bg-lapis/5",
  traite: "text-vert border-vert bg-vert/10 font-bold",
};

export function LogementClient({
  initialData,
  basePath = "/admin/logement",
  apiBasePath = "/api/admin/logement",
  title = "Demandes de logement.",
  emptyLabel = "Aucune demande de logement pour l'instant.",
}: {
  initialData: LogementRow[];
  basePath?: string;
  apiBasePath?: string;
  title?: string;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.role, "logement.write");
  const [data, setData] = React.useState<LogementRow[]>(initialData);
  const [prevInitialData, setPrevInitialData] = React.useState<LogementRow[]>(initialData);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData);
    setData(initialData);
  }

  const updateStatut = React.useCallback(
    async (row: LogementRow, newStatut: LogementRow["statut"]) => {
      if (row.statut === newStatut) return;
      setUpdatingId(row.id);
      const result = await apiJson(`${apiBasePath}/${row.id}`, "PATCH", { statut: newStatut });
      setUpdatingId(null);
      if (!result.ok) {
        toast.error("Modification du statut impossible", { description: result.error });
        return;
      }
      setData((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, statut: newStatut } : item))
      );
      toast.success("Statut mis à jour", {
        description: `Demande de ${row.candidat} : ${STATUT_LABEL[newStatut]}.`,
      });
      router.refresh();
    },
    [apiBasePath, router]
  );

  const deleteReservation = React.useCallback(
    async (row: LogementRow) => {
      const result = await apiJson(`${apiBasePath}/${row.id}`, "DELETE");
      if (!result.ok) {
        toast.error("Suppression impossible", { description: result.error });
        return;
      }
      toast.success("Demande supprimée", { description: `La demande de ${row.candidat} a été supprimée.` });
      router.refresh();
    },
    [router, apiBasePath],
  );

  const actions: ActionItem<LogementRow>[] = React.useMemo(
    () => [
      {
        label: "Voir le détail",
        icon: Eye,
        onClick: (row) => router.push(`${basePath}/${row.id}`),
      },
      {
        label: "Imprimer",
        icon: Printer,
        onClick: (row) => window.open(`${apiBasePath}/${row.id}/print`, "_blank"),
      },
      {
        label: "Supprimer",
        icon: Trash2,
        tone: "danger",
        hidden: () => !canWrite,
        confirm: {
          title: "Supprimer cette demande de logement ?",
          description: (row) => `La demande de ${row.candidat} sera définitivement supprimée. Action irréversible.`,
          confirmLabel: "Supprimer",
          onConfirm: deleteReservation,
        },
      },
    ],
    [router, canWrite, deleteReservation, basePath, apiBasePath],
  );

  const columns: ColumnDef<LogementRow>[] = React.useMemo(
    () => [
      {
        id: "candidat",
        accessorKey: "candidat",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Candidat" />,
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium text-encre">{row.original.candidat}</p>
            <p className="text-xs text-ardoise">{row.original.email}</p>
          </div>
        ),
      },
      {
        id: "ville",
        accessorKey: "ville",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ville d'établissement" />,
        cell: ({ row }) => <span className="text-sm text-ardoise">{row.original.ville}</span>,
      },
      {
        id: "nationalite",
        accessorKey: "nationalite",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Nationalité" />,
        cell: ({ row }) => <span className="text-sm text-ardoise">{row.original.nationalite}</span>,
      },
      {
        id: "statut",
        accessorKey: "statut",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
        cell: ({ row }) => {
          const currentStatut = row.original.statut;
          const isUpdating = updatingId === row.original.id;

          const toneClass = STATUT_TONE[currentStatut?.toLowerCase()] ?? STATUT_TONE[currentStatut] ?? "text-vert border-vert bg-vert/5";
          const labelText = STATUT_LABEL[currentStatut?.toLowerCase()] ?? STATUT_LABEL[currentStatut] ?? currentStatut;

          if (!canWrite) {
            return (
              <Badge className={`font-mono text-[10px] uppercase ${toneClass}`}>
                {labelText}
              </Badge>
            );
          }

          return (
            <div className="flex items-center gap-1.5">
              <Select
                value={currentStatut}
                disabled={isUpdating}
                onValueChange={(val) => void updateStatut(row.original, val as LogementRow["statut"])}
              >
                <SelectTrigger
                  className={`h-7 w-[190px] text-[11px] font-mono uppercase font-semibold border ${toneClass}`}
                >
                  <SelectValue>{labelText}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soumis" className="text-xs font-mono uppercase">
                    Soumise
                  </SelectItem>
                  <SelectItem value="en_cours_traitement" className="text-xs font-mono uppercase">
                    En cours de traitement
                  </SelectItem>
                  <SelectItem value="correction_demandee" className="text-xs font-mono uppercase">
                    Correction demandée
                  </SelectItem>
                  <SelectItem value="traite" className="text-xs font-mono uppercase font-bold text-vert">
                    Traité
                  </SelectItem>
                </SelectContent>
              </Select>
              {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin text-ardoise" />}
            </div>
          );
        },
      },
      {
        id: "soumiseLe",
        accessorKey: "soumiseLe",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Soumise le" />,
        cell: ({ row }) => <span className="text-sm text-ardoise">{formatDate(row.original.soumiseLe)}</span>,
      },
      createActionsColumn<LogementRow>(actions, { ariaLabel: (row) => `Actions sur la demande de ${row.candidat}` }),
    ],
    [actions, canWrite, updateStatut, updatingId],
  );


  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">{title}</h1>
        <p className="text-sm text-ardoise">{data.length} demande(s) au total</p>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="candidat"
        searchPlaceholder="Rechercher par candidat…"
        pageSize={10}
        emptyState={
          <div className="flex flex-col items-center gap-3">
            <BedDouble className="h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
            <p className="text-sm text-ardoise">{emptyLabel}</p>
          </div>
        }
      />
    </div>
  );
}
