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
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { apiJson } from "@/lib/api-client";
import { toast } from "sonner";
import { BedDouble, Eye, Printer, Trash2 } from "lucide-react";

export type LogementRow = {
  id: string;
  candidat: string;
  email: string;
  ville: string;
  nationalite: string;
  statut: "soumis" | "en_cours_traitement" | "correction_demandee";
  soumiseLe: string;
};

const STATUT_LABEL: Record<LogementRow["statut"], string> = {
  soumis: "Soumise",
  en_cours_traitement: "En cours de traitement",
  correction_demandee: "Correction demandée",
};

const STATUT_TONE: Record<LogementRow["statut"], string> = {
  soumis: "text-ambre border-ambre bg-ambre/5",
  en_cours_traitement: "text-vert border-vert bg-vert/5",
  correction_demandee: "text-lapis border-lapis bg-lapis/5",
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
  const data = initialData;

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
        cell: ({ row }) => (
          <Badge className={`font-mono text-[10px] uppercase ${STATUT_TONE[row.original.statut]}`}>
            {STATUT_LABEL[row.original.statut]}
          </Badge>
        ),
      },
      {
        id: "soumiseLe",
        accessorKey: "soumiseLe",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Soumise le" />,
        cell: ({ row }) => <span className="text-sm text-ardoise">{formatDate(row.original.soumiseLe)}</span>,
      },
      createActionsColumn<LogementRow>(actions, { ariaLabel: (row) => `Actions sur la demande de ${row.candidat}` }),
    ],
    [actions],
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
