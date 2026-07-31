"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef, Table } from "@tanstack/react-table";
import {
  CheckCircle2,
  Eye,
  FileImage,
  IdCard,
  ShieldOff,
  ShieldCheck,
  XCircle,
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
import { Button } from "@/components/ui/button";
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

export type KycRow = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  nationalite: string | null;
  kycType: string | null;
  kycNumero: string | null;
  hasRecto: boolean;
  hasVerso: boolean;
  kycVerifie: boolean;
  kycVerifieLe: string | null;
  updatedAt: string;
  createdAt: string;
  statut: "en_attente" | "verifie" | "incomplet";
};

const STATUT_LABEL: Record<KycRow["statut"], string> = {
  en_attente: "En attente",
  verifie: "Vérifié",
  incomplet: "Incomplet",
};

const STATUT_TONE: Record<KycRow["statut"], string> = {
  en_attente: "bg-ambre/10 text-ambre border-ambre/30",
  verifie: "bg-vert/10 text-vert border-vert/30",
  incomplet: "bg-ardoise/10 text-ardoise border-ardoise/30",
};

function typeLabel(type: string | null) {
  if (type === "cni") return "CNI";
  if (type === "passeport") return "Passeport";
  return "—";
}

function StatutBadge({ statut }: { statut: KycRow["statut"] }) {
  return (
    <Badge className={cn("font-mono text-[10px] uppercase border", STATUT_TONE[statut])}>
      {STATUT_LABEL[statut]}
    </Badge>
  );
}

function DetailPanel({
  row,
  onValidate,
  onInvalidate,
}: {
  row: KycRow;
  onValidate: (id: string) => void;
  onInvalidate: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Candidat</p>
        <p className="mt-1 text-lg font-medium text-encre">
          {row.prenom} {row.nom}
        </p>
        <p className="text-sm text-ardoise">{row.email}</p>
        {(row.telephone || row.nationalite) && (
          <p className="mt-1 text-xs text-ardoise">
            {[row.telephone, row.nationalite].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <dl className="space-y-3 border-y border-ligne py-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Type</dt>
          <dd className="font-medium text-encre">{typeLabel(row.kycType)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Numéro</dt>
          <dd className="font-mono text-xs text-encre">{row.kycNumero || "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Statut</dt>
          <dd>
            <StatutBadge statut={row.statut} />
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
            {row.kycVerifie ? "Vérifié le" : "Mis à jour"}
          </dt>
          <dd className="font-mono text-xs text-ardoise">
            {row.kycVerifie && row.kycVerifieLe
              ? formatDateTime(row.kycVerifieLe)
              : formatDateTime(row.updatedAt)}
          </dd>
        </div>
      </dl>

      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Pièces</p>
        <div className="flex flex-wrap gap-2">
          {row.hasRecto ? (
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/profile/kyc?side=recto&userId=${row.id}`} target="_blank" rel="noreferrer">
                <FileImage className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                Recto
              </a>
            </Button>
          ) : (
            <span className="text-xs text-ardoise">Recto manquant</span>
          )}
          {row.hasVerso ? (
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/profile/kyc?side=verso&userId=${row.id}`} target="_blank" rel="noreferrer">
                <FileImage className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                Verso
              </a>
            </Button>
          ) : (
            <span className="text-xs text-ardoise">Verso manquant</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {!row.kycVerifie && (row.hasRecto || row.hasVerso) && (
          <Button
            size="sm"
            className="bg-vert text-blanc hover:bg-vert/90"
            onClick={() => onValidate(row.id)}
          >
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
            Valider le KYC
          </Button>
        )}
        {row.kycVerifie && (
          <Button
            size="sm"
            variant="outline"
            className="border-carmin/40 text-carmin hover:bg-carmin/5"
            onClick={() => onInvalidate(row.id)}
          >
            <ShieldOff className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
            Invalider
          </Button>
        )}
      </div>
    </div>
  );
}

export function KycClient({ initialData }: { initialData: KycRow[] }) {
  const router = useRouter();
  const data = initialData;
  const [statutFilter, setStatutFilter] = React.useState<string>("tous");
  const [selected, setSelected] = React.useState<KycRow | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const kpis = React.useMemo(() => {
    let en_attente = 0;
    let verifie = 0;
    let incomplet = 0;
    for (const r of data) {
      if (r.statut === "en_attente") en_attente += 1;
      else if (r.statut === "verifie") verifie += 1;
      else incomplet += 1;
    }
    return { en_attente, verifie, incomplet };
  }, [data]);

  const tableData = React.useMemo(() => {
    if (statutFilter === "tous") return data;
    return data.filter((r) => r.statut === statutFilter);
  }, [data, statutFilter]);

  const setKyc = React.useCallback(
    async (userId: string, verifie: boolean) => {
      try {
        const res = await fetch("/api/profile/kyc", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, verifie }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(verifie ? "Validation KYC échouée" : "Invalidation échouée", {
            description: (err as { error?: string }).error,
          });
          return;
        }
        toast.success(verifie ? "KYC vérifié" : "KYC invalidé");
        setSheetOpen(false);
        router.refresh();
      } catch {
        toast.error("Erreur réseau");
      }
    },
    [router],
  );

  const openDetail = React.useCallback((row: KycRow) => {
    setSelected(row);
    setSheetOpen(true);
  }, []);

  const actions: ActionItem<KycRow>[] = React.useMemo(
    () => [
      {
        label: "Voir le détail",
        icon: Eye,
        onClick: (row) => openDetail(row),
      },
      {
        label: "Voir recto",
        icon: FileImage,
        hidden: (row) => !row.hasRecto,
        onClick: (row) => window.open(`/api/profile/kyc?side=recto&userId=${row.id}`, "_blank"),
      },
      {
        label: "Voir verso",
        icon: FileImage,
        hidden: (row) => !row.hasVerso,
        onClick: (row) => window.open(`/api/profile/kyc?side=verso&userId=${row.id}`, "_blank"),
      },
      {
        label: "Valider le KYC",
        icon: ShieldCheck,
        hidden: (row) => row.kycVerifie || (!row.hasRecto && !row.hasVerso),
        onClick: (row) => void setKyc(row.id, true),
      },
      {
        label: "Invalider",
        icon: ShieldOff,
        tone: "danger",
        hidden: (row) => !row.kycVerifie,
        onClick: (row) => void setKyc(row.id, false),
      },
    ],
    [openDetail, setKyc],
  );

  const columns: ColumnDef<KycRow>[] = React.useMemo(
    () => [
      {
        id: "candidat",
        accessorFn: (row) => `${row.prenom} ${row.nom} ${row.email}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Candidat" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-encre">
              {row.original.prenom} {row.original.nom}
            </p>
            <p className="truncate text-xs text-ardoise">{row.original.email}</p>
          </div>
        ),
        filterFn: (row, _id, value: string) => {
          if (!value) return true;
          const q = String(value).toLowerCase();
          const hay =
            `${row.original.prenom} ${row.original.nom} ${row.original.email} ${row.original.kycNumero ?? ""}`.toLowerCase();
          return hay.includes(q);
        },
      },
      {
        id: "kycType",
        accessorKey: "kycType",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <span className="text-sm text-encre">{typeLabel(row.original.kycType)}</span>
        ),
      },
      {
        id: "kycNumero",
        accessorKey: "kycNumero",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Numéro" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-ardoise">{row.original.kycNumero || "—"}</span>
        ),
        enableSorting: false,
      },
      {
        id: "statut",
        accessorKey: "statut",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
        cell: ({ row }) => <StatutBadge statut={row.original.statut} />,
        filterFn: (row, _id, value: string) =>
          value === "tous" ? true : row.original.statut === value,
      },
      {
        id: "date",
        accessorFn: (row) => row.kycVerifieLe ?? row.updatedAt,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs text-ardoise">
            {row.original.kycVerifie && row.original.kycVerifieLe
              ? formatDateTime(row.original.kycVerifieLe)
              : formatDateTime(row.original.updatedAt)}
          </span>
        ),
      },
      createActionsColumn<KycRow>(actions, {
        ariaLabel: (row) => `Actions KYC pour ${row.prenom} ${row.nom}`,
      }),
    ],
    [actions],
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Conformité</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Pièces d&apos;identité (KYC).
        </h1>
        <p className="mt-1 text-sm text-ardoise">
          Vérifiez les documents d&apos;identité déposés par les candidats.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            {
              key: "en_attente",
              label: "En attente",
              count: kpis.en_attente,
              icon: IdCard,
            },
            {
              key: "verifie",
              label: "Vérifiés",
              count: kpis.verifie,
              icon: CheckCircle2,
            },
            {
              key: "incomplet",
              label: "Incomplets",
              count: kpis.incomplet,
              icon: XCircle,
            },
          ] as const
        ).map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => setStatutFilter((prev) => (prev === kpi.key ? "tous" : kpi.key))}
            className={cn(
              "rounded-2xl border bg-blanc px-4 py-3 text-left transition-colors",
              statutFilter === kpi.key
                ? "border-lapis/40 bg-or-pale/40"
                : "border-ligne hover:border-lapis/25",
            )}
          >
            <div className="flex items-center gap-2">
              <kpi.icon className="h-4 w-4 text-ardoise" strokeWidth={1.5} />
              <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                {kpi.label}
              </p>
            </div>
            <p className="mt-1 font-display text-2xl font-bold text-encre">{kpi.count}</p>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={tableData}
        searchKey="candidat"
        searchPlaceholder="Rechercher un candidat…"
        pageSize={10}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-4">
            <IdCard className="h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
            <p className="text-sm text-ardoise">Aucun dossier KYC pour ces filtres.</p>
          </div>
        }
        toolbar={(_table: Table<KycRow>) => (
          <>
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="h-9 w-[180px] bg-blanc">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="verifie">Vérifié</SelectItem>
                <SelectItem value="incomplet">Incomplet</SelectItem>
              </SelectContent>
            </Select>
            <span className="font-mono text-xs text-ardoise">{tableData.length} candidat(s)</span>
          </>
        )}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-md bg-blanc sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-left">Détail KYC</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-1 pb-6 pt-2">
            {selected ? (
              <DetailPanel
                row={selected}
                onValidate={(id) => void setKyc(id, true)}
                onInvalidate={(id) => void setKyc(id, false)}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
