"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ColumnDef, Table } from "@tanstack/react-table";
import {
  Copy,
  Eye,
  Fingerprint,
  Globe,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  DataTable,
  DataTableColumnHeader,
  createActionsColumn,
  type ActionItem,
} from "@/components/data-table/data-table";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type AuditEntry = {
  id: number;
  date: string;
  userEmail: string;
  role: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string;
  ip: string | null;
};

const ACTION_TONE: Record<string, string> = {
  CREATE: "bg-vert/10 text-vert border-vert/30",
  UPDATE: "bg-bleu-pale text-bleu-vif border-bleu-vif/30",
  DELETE: "bg-carmin/10 text-carmin border-carmin/30",
  LOGIN: "bg-lapis/10 text-lapis border-lapis/30",
  LOGOUT: "bg-ardoise/10 text-ardoise border-ardoise/30",
  WORKFLOW: "bg-ambre/10 text-ambre border-ambre/30",
  VERIFY_EMAIL: "bg-violet-pale text-violet border-violet/30",
};

const RESOURCE_LABELS: Record<string, string> = {
  dossier: "Dossier",
  user: "Utilisateur",
  universite: "Université",
  paiement: "Paiement",
  attestation: "Attestation",
  parametre: "Paramètre",
  message: "Message",
  auth: "Auth",
};

const KPI_ACTIONS = ["WORKFLOW", "UPDATE", "CREATE", "DELETE"] as const;

function ActionBadge({ action }: { action: string }) {
  return (
    <Badge
      className={cn(
        "font-mono text-[10px] uppercase border",
        ACTION_TONE[action] ?? "bg-ardoise/10 text-ardoise border-ardoise/30",
      )}
    >
      {action}
    </Badge>
  );
}

function DetailPanel({ entry }: { entry: AuditEntry }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Événement</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ActionBadge action={entry.action} />
          <span className="text-sm font-medium text-encre">
            {RESOURCE_LABELS[entry.resource] ?? entry.resource}
          </span>
        </div>
        <p className="mt-2 font-mono text-xs text-ardoise">{formatDateTime(entry.date)}</p>
      </div>

      <dl className="space-y-3 border-y border-ligne py-4 text-sm">
        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-lapis" strokeWidth={1.5} />
          <div className="min-w-0">
            <dt className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Utilisateur</dt>
            <dd className="truncate font-medium text-encre">{entry.userEmail}</dd>
            <dd className="text-xs capitalize text-ardoise">{entry.role.replace(/_/g, " ").toLowerCase()}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-lapis" strokeWidth={1.5} />
          <div className="min-w-0">
            <dt className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Ressource ID</dt>
            <dd className="break-all font-mono text-xs text-encre">{entry.resourceId ?? "—"}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-lapis" strokeWidth={1.5} />
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Adresse IP</dt>
            <dd className="font-mono text-xs text-encre">{entry.ip ?? "—"}</dd>
          </div>
        </div>
      </dl>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Détails</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-encre">{entry.details || "—"}</p>
      </div>
    </div>
  );
}

function auditSummary(entry: AuditEntry): string {
  const resource = RESOURCE_LABELS[entry.resource] ?? entry.resource;
  return [
    formatDateTime(entry.date),
    entry.userEmail,
    entry.action,
    resource,
    entry.details || "—",
  ].join(" · ");
}

export function AuditClient({ initialData }: { initialData: AuditEntry[] }) {
  const reduce = useReducedMotion();
  const [data, setData] = React.useState<AuditEntry[]>(initialData);
  const [resourceFilter, setResourceFilter] = React.useState("tous");
  const [actionFilter, setActionFilter] = React.useState("tous");
  const [selected, setSelected] = React.useState<AuditEntry | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          page: "1",
          pageSize: "100",
          ...(resourceFilter !== "tous" ? { resource: resourceFilter } : {}),
          ...(actionFilter !== "tous" ? { action: actionFilter } : {}),
        });
        const res = await fetch(`/api/admin/audit?${qs}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && Array.isArray(json.data)) {
          setData(json.data);
        }
      } catch {
        /* garde initialData */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [resourceFilter, actionFilter]);

  const actionOptions = React.useMemo(() => {
    const fromData = Array.from(new Set(data.map((l) => l.action)));
    return Array.from(new Set([...Object.keys(ACTION_TONE), ...fromData])).sort();
  }, [data]);

  const tableData = data;

  const kpis = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of KPI_ACTIONS) counts[a] = 0;
    let other = 0;
    for (const l of data) {
      if (KPI_ACTIONS.includes(l.action as (typeof KPI_ACTIONS)[number])) {
        counts[l.action] = (counts[l.action] ?? 0) + 1;
      } else {
        other += 1;
      }
    }
    return { counts, other };
  }, [data]);

  const openDetail = React.useCallback((entry: AuditEntry) => {
    setSelected(entry);
    setSheetOpen(true);
  }, []);

  const copySummary = React.useCallback(async (entry: AuditEntry) => {
    try {
      await navigator.clipboard.writeText(auditSummary(entry));
      toast.success("Résumé copié");
    } catch {
      toast.error("Impossible de copier");
    }
  }, []);

  const actions: ActionItem<AuditEntry>[] = React.useMemo(
    () => [
      {
        label: "Voir le détail",
        icon: Eye,
        onClick: (row) => openDetail(row),
      },
      {
        label: "Copier le résumé",
        icon: Copy,
        onClick: (row) => void copySummary(row),
      },
    ],
    [openDetail, copySummary],
  );

  const columns: ColumnDef<AuditEntry>[] = React.useMemo(
    () => [
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs text-ardoise">
            {formatDateTime(row.original.date)}
          </span>
        ),
      },
      {
        id: "userEmail",
        accessorKey: "userEmail",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Utilisateur" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-encre">{row.original.userEmail}</p>
            <p className="text-xs capitalize text-ardoise">
              {row.original.role.replace(/_/g, " ").toLowerCase()}
            </p>
          </div>
        ),
        filterFn: (row, _id, value: string) => {
          if (!value) return true;
          const q = String(value).toLowerCase();
          const hay =
            `${row.original.userEmail} ${row.original.details} ${row.original.resourceId ?? ""} ${row.original.action} ${row.original.resource}`.toLowerCase();
          return hay.includes(q);
        },
      },
      {
        id: "action",
        accessorKey: "action",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
        cell: ({ row }) => <ActionBadge action={row.original.action} />,
      },
      {
        id: "resource",
        accessorKey: "resource",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ressource" />,
        cell: ({ row }) => (
          <span className="text-sm text-encre">
            {RESOURCE_LABELS[row.original.resource] ?? row.original.resource}
          </span>
        ),
      },
      {
        id: "details",
        accessorKey: "details",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Détails" />,
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[280px] text-sm text-ardoise" title={row.original.details}>
            {row.original.details || "—"}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "ip",
        accessorKey: "ip",
        header: ({ column }) => <DataTableColumnHeader column={column} title="IP" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-ardoise">{row.original.ip ?? "—"}</span>
        ),
        enableSorting: false,
      },
      createActionsColumn<AuditEntry>(actions, {
        ariaLabel: (row) => `Actions sur l'entrée audit ${row.id}`,
      }),
    ],
    [actions],
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Sécurité</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Journaux d&apos;audit.
        </h1>
        <p className="mt-1 text-sm text-ardoise">Qui a fait quoi, quand — actions sensibles traçables.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {KPI_ACTIONS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setActionFilter((prev) => (prev === a ? "tous" : a))}
            className={cn(
              "rounded-2xl border bg-blanc px-4 py-3 text-left transition-colors",
              actionFilter === a ? "border-lapis/40 bg-or-pale/40" : "border-ligne hover:border-lapis/25",
            )}
          >
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">{a}</p>
            <p className="mt-1 font-display text-2xl font-bold text-encre">{kpis.counts[a] ?? 0}</p>
          </button>
        ))}
        <div className="rounded-2xl border border-ligne bg-blanc px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Autres</p>
          <p className="mt-1 font-display text-2xl font-bold text-encre">{kpis.other}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tableData}
        searchKey="userEmail"
        searchPlaceholder="Rechercher email, détails, ID…"
        pageSize={10}
        emptyState={
          <EmptyState
            className="border-0 bg-transparent py-8"
            icon={<ShieldAlert className="h-5 w-5" strokeWidth={1.5} />}
            title={loading ? "Chargement du journal…" : "Aucune entrée"}
            description={
              loading
                ? undefined
                : "Aucun événement ne correspond à ces filtres. Élargissez la recherche ou réinitialisez les filtres."
            }
          />
        }
        toolbar={(_table: Table<AuditEntry>) => (
          <>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="h-9 w-[170px] bg-blanc">
                <SelectValue placeholder="Ressource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Toutes les ressources</SelectItem>
                {Object.entries(RESOURCE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9 w-[170px] bg-blanc">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Toutes les actions</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="font-mono text-xs text-ardoise">
              {tableData.length} entrée(s)
            </span>
          </>
        )}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-md bg-blanc sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-left">Détail audit</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-1 pb-6 pt-2">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <DetailPanel entry={selected} />
              </motion.div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
