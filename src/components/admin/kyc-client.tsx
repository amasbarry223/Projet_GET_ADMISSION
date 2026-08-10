"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ColumnDef, Table } from "@tanstack/react-table";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  FileImage,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldOff,
  ShieldCheck,
  Trash2,
  Upload,
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
import { apiJson } from "@/lib/api-client";
import { hasPermission } from "@/lib/rbac";
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
  SheetDescription,
  SheetFooter,
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

const STATUT_HINT: Record<KycRow["statut"], string> = {
  en_attente: "Pièces déposées — à contrôler avant validation.",
  verifie: "Identité confirmée. Vous pouvez invalider si nécessaire.",
  incomplet: "Le candidat n’a pas encore déposé toutes les faces requises.",
};

function typeLabel(type: string | null) {
  if (type === "cni") return "CNI";
  if (type === "passeport") return "Passeport";
  return "Non renseigné";
}

function displayName(row: Pick<KycRow, "prenom" | "nom" | "email">) {
  const full = `${row.prenom ?? ""} ${row.nom ?? ""}`.trim();
  if (full) return full;
  const local = row.email.split("@")[0]?.trim();
  return local || "Candidat";
}

function initials(row: Pick<KycRow, "prenom" | "nom" | "email">) {
  const full = `${row.prenom ?? ""} ${row.nom ?? ""}`.trim();
  if (full) {
    const parts = full.split(/\s+/);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return `${a}${b}`.toUpperCase() || "?";
  }
  return (row.email.charAt(0) || "?").toUpperCase();
}

function StatutBadge({ statut }: { statut: KycRow["statut"] }) {
  return (
    <Badge className={cn("font-mono text-[10px] uppercase border", STATUT_TONE[statut])}>
      {STATUT_LABEL[statut]}
    </Badge>
  );
}

function PieceSlot({
  side,
  present,
  userId,
  needsVerso,
  canWrite,
  onReplace,
  onDelete,
  busy,
}: {
  side: "recto" | "verso";
  present: boolean;
  userId: string;
  needsVerso: boolean;
  canWrite: boolean;
  onReplace: (side: "recto" | "verso", file: File) => void;
  onDelete: (side: "recto" | "verso") => void;
  busy: boolean;
}) {
  const label = side === "recto" ? "Recto" : "Verso";
  const optionalPass = side === "verso" && !needsVerso;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const fileInput = canWrite ? (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,application/pdf"
      className="sr-only"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onReplace(side, f);
        e.target.value = "";
      }}
    />
  ) : null;

  if (optionalPass && !present) {
    return (
      <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-ligne bg-porcelaine/70 px-3 py-4 text-center">
        <IdCard className="h-7 w-7 text-ardoise/35" strokeWidth={1.25} aria-hidden />
        <div>
          <p className="text-sm font-medium text-encre">{label}</p>
          <p className="mt-0.5 text-xs text-ardoise">Non requis (passeport)</p>
        </div>
      </div>
    );
  }

  if (present) {
    return (
      <div className="group relative flex min-h-[140px] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-lapis/25 bg-or-pale/60 px-3 py-4 text-center">
        {fileInput}
        <a
          href={`/api/profile/kyc?side=${side}&userId=${userId}`}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-lapis/40 focus-visible:ring-offset-2"
          aria-label={`Ouvrir la pièce ${label}`}
        />
        <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-md bg-card/95 p-1 text-ardoise opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100">
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        </span>
        <FileImage className="h-8 w-8 text-lapis" strokeWidth={1.25} aria-hidden />
        <div>
          <p className="text-sm font-medium text-encre">{label}</p>
          <p className="mt-0.5 text-xs font-medium text-vert">Ouvrir la pièce</p>
        </div>
        {canWrite && (
          <div className="relative z-10 mt-1 flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px]"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" strokeWidth={1.5} />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px] border-carmin/40 text-carmin hover:bg-carmin/5"
              disabled={busy}
              onClick={() => onDelete(side)}
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ambre/50 bg-jaune-pale/50 px-3 py-4 text-center"
      role="status"
    >
      {fileInput}
      <XCircle className="h-7 w-7 text-ambre" strokeWidth={1.25} aria-hidden />
      <div>
        <p className="text-sm font-medium text-encre">{label} manquant</p>
        <p className="mt-0.5 text-xs text-ardoise">Pas encore déposé</p>
      </div>
      {canWrite && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[11px]"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" strokeWidth={1.5} />}
          Téléverser
        </Button>
      )}
    </div>
  );
}

function ChecklistRow({
  done,
  label,
  detail,
}: {
  done: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-vert" strokeWidth={1.75} aria-hidden />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-ambre" strokeWidth={1.75} aria-hidden />
      )}
      <div className="min-w-0">
        <p className={cn("text-sm font-medium", done ? "text-encre" : "text-encre")}>{label}</p>
        <p className="text-xs text-ardoise">{detail}</p>
      </div>
    </li>
  );
}

function DetailPanel({
  row,
  onValidate,
  onInvalidate,
  canWrite,
  onReplace,
  onDeletePiece,
  pieceBusy,
}: {
  row: KycRow;
  onValidate: (id: string) => void;
  onInvalidate: (id: string) => void;
  canWrite: boolean;
  onReplace: (side: "recto" | "verso", file: File) => void;
  onDeletePiece: (side: "recto" | "verso") => void;
  pieceBusy: boolean;
}) {
  const needsVerso = row.kycType === "cni" || !row.kycType;
  const canValidate = !row.kycVerifie && (row.hasRecto || row.hasVerso);
  const isEmptyDossier = !row.hasRecto && !row.hasVerso && !row.kycType && !row.kycNumero;
  const name = displayName(row);
  const dateLabel = row.kycVerifie ? "Vérifié le" : "Mis à jour";
  const dateValue =
    row.kycVerifie && row.kycVerifieLe
      ? formatDateTime(row.kycVerifieLe)
      : formatDateTime(row.updatedAt);

  const checks = [
    {
      done: Boolean(row.kycType),
      label: "Type de pièce",
      detail: row.kycType ? typeLabel(row.kycType) : "CNI ou passeport non choisi",
    },
    {
      done: Boolean(row.kycNumero?.trim()),
      label: "Numéro d’identité",
      detail: row.kycNumero?.trim() || "Numéro absent du profil",
    },
    {
      done: row.hasRecto,
      label: "Face recto",
      detail: row.hasRecto ? "Fichier disponible" : "Upload manquant",
    },
    ...(needsVerso
      ? [
          {
            done: row.hasVerso,
            label: "Face verso",
            detail: row.hasVerso ? "Fichier disponible" : "Upload manquant",
          },
        ]
      : []),
  ];
  const doneCount = checks.filter((c) => c.done).length;
  const progress = Math.round((doneCount / checks.length) * 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto pb-4 pr-0.5">
        {/* Identité */}
        <section className="flex items-start gap-3.5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-encre font-display text-sm font-bold tracking-tight text-blanc"
            aria-hidden
          >
            {initials(row)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-encre text-balance">{name}</h2>
              <StatutBadge statut={row.statut} />
            </div>
            <p className="mt-1 text-sm text-ardoise">{STATUT_HINT[row.statut]}</p>
          </div>
        </section>

        {isEmptyDossier ? (
          <div
            className="rounded-xl border border-ambre/30 bg-jaune-pale/60 px-3.5 py-3"
            role="status"
          >
            <p className="text-sm font-medium text-encre">Aucun document déposé</p>
            <p className="mt-1 text-xs leading-relaxed text-ardoise">
              Ce candidat n’a encore renseigné ni type de pièce, ni numéro, ni scan. Aucune
              validation n’est possible tant que le profil KYC n’est pas complété.
            </p>
          </div>
        ) : null}

        {/* Coordonnées */}
        <ul className="space-y-2.5 rounded-xl bg-porcelaine px-3.5 py-3 text-sm">
          <li className="flex items-start gap-2.5">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ardoise" strokeWidth={1.5} aria-hidden />
            <a
              href={`mailto:${row.email}`}
              className="break-all text-encre underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis/40"
            >
              {row.email}
            </a>
          </li>
          {row.telephone ? (
            <li className="flex items-center gap-2.5 text-encre">
              <Phone className="h-4 w-4 shrink-0 text-ardoise" strokeWidth={1.5} aria-hidden />
              <span>{row.telephone}</span>
            </li>
          ) : null}
          {row.nationalite ? (
            <li className="flex items-center gap-2.5 text-encre">
              <MapPin className="h-4 w-4 shrink-0 text-ardoise" strokeWidth={1.5} aria-hidden />
              <span className="capitalize">{row.nationalite}</span>
            </li>
          ) : null}
        </ul>

        {/* Progression */}
        <section>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ardoise">
              Complétude
            </h3>
            <span className="font-mono text-[11px] text-ardoise">
              {doneCount}/{checks.length} · {progress}%
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-ligne"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Complétude du dossier KYC"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300 ease-out",
                progress === 100 ? "bg-vert" : progress > 0 ? "bg-ambre" : "bg-ardoise/40",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <ul className="mt-3 space-y-2.5 rounded-xl border border-ligne bg-card px-3.5 py-3">
            {checks.map((c) => (
              <ChecklistRow key={c.label} done={c.done} label={c.label} detail={c.detail} />
            ))}
          </ul>
        </section>

        {/* Métadonnées */}
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-ardoise">Document</h3>
          <dl className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="rounded-lg border border-ligne bg-card px-3 py-2.5">
              <dt className="text-[11px] text-ardoise">Type</dt>
              <dd className="mt-0.5 text-sm font-medium text-encre">{typeLabel(row.kycType)}</dd>
            </div>
            <div className="rounded-lg border border-ligne bg-card px-3 py-2.5">
              <dt className="text-[11px] text-ardoise">Numéro</dt>
              <dd className="mt-0.5 truncate font-mono text-sm font-medium tracking-wide text-encre">
                {row.kycNumero?.trim() || "—"}
              </dd>
            </div>
            <div className="col-span-2 rounded-lg border border-ligne bg-card px-3 py-2.5">
              <dt className="text-[11px] text-ardoise">{dateLabel}</dt>
              <dd className="mt-0.5 font-mono text-xs text-encre">{dateValue}</dd>
            </div>
          </dl>
        </section>

        {/* Slots pièces */}
        <section>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ardoise">Pièces</h3>
            <span className="font-mono text-[10px] text-ardoise">
              {[row.hasRecto, needsVerso ? row.hasVerso : row.hasRecto].filter(Boolean).length}/
              {needsVerso ? 2 : 1}
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <PieceSlot
              side="recto"
              present={row.hasRecto}
              userId={row.id}
              needsVerso={needsVerso}
              canWrite={canWrite}
              onReplace={onReplace}
              onDelete={onDeletePiece}
              busy={pieceBusy}
            />
            <PieceSlot
              side="verso"
              present={row.hasVerso}
              userId={row.id}
              needsVerso={needsVerso}
              canWrite={canWrite}
              onReplace={onReplace}
              onDelete={onDeletePiece}
              busy={pieceBusy}
            />
          </div>
        </section>
      </div>

      <SheetFooter className="shrink-0 gap-2 border-t border-ligne bg-card px-0 pt-4 sm:flex-col">
        {!canWrite ? (
          <p className="text-center text-xs leading-relaxed text-ardoise">
            Consultation seule — la validation et la modification du KYC sont réservées à
            l&apos;administrateur.
          </p>
        ) : (
          <>
            {canValidate ? (
              <Button
                className="w-full bg-vert text-blanc hover:bg-vert/90"
                onClick={() => onValidate(row.id)}
              >
                <ShieldCheck className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                Valider le KYC
              </Button>
            ) : null}
            {row.kycVerifie ? (
              <Button
                variant="outline"
                className="w-full border-carmin/35 text-carmin hover:bg-carmin/5"
                onClick={() => onInvalidate(row.id)}
              >
                <ShieldOff className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                Invalider la vérification
              </Button>
            ) : null}
            {!canValidate && !row.kycVerifie ? (
              <p className="text-center text-xs leading-relaxed text-ardoise">
                Validation indisponible tant qu’aucune face n’est déposée.
              </p>
            ) : null}
          </>
        )}
      </SheetFooter>
    </div>
  );
}

export function KycClient({ initialData }: { initialData: KycRow[] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.role, "kyc.write");
  const data = initialData;
  const [statutFilter, setStatutFilter] = React.useState<string>("tous");
  const [selected, setSelected] = React.useState<KycRow | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [pieceBusy, setPieceBusy] = React.useState(false);

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
      const result = await apiJson("/api/profile/kyc", "PUT", { userId, verifie });
      if (!result.ok) {
        toast.error(verifie ? "Validation KYC échouée" : "Invalidation échouée", {
          description: result.error,
        });
        return;
      }
      toast.success(verifie ? "KYC vérifié" : "KYC invalidé");
      setSheetOpen(false);
      router.refresh();
    },
    [router],
  );

  const openDetail = React.useCallback((row: KycRow) => {
    setSelected(row);
    setSheetOpen(true);
  }, []);

  const replacePiece = React.useCallback(
    async (userId: string, side: "recto" | "verso", file: File) => {
      setPieceBusy(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("side", side);
      fd.append("targetUserId", userId);
      const res = await fetch("/api/profile/kyc", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      setPieceBusy(false);
      if (!res.ok) {
        toast.error("Téléversement échoué", { description: (body as { error?: string })?.error });
        return;
      }
      toast.success(`${side === "recto" ? "Recto" : "Verso"} téléversé`);
      setSelected((prev) => {
        if (!prev || prev.id !== userId) return prev;
        const hasRecto = side === "recto" ? true : prev.hasRecto;
        const hasVerso = side === "verso" ? true : prev.hasVerso;
        const needsVerso = prev.kycType === "cni" || !prev.kycType;
        const isComplete = hasRecto && (!needsVerso || hasVerso);
        return {
          ...prev,
          hasRecto,
          hasVerso,
          statut: prev.kycVerifie ? "verifie" : isComplete ? "en_attente" : "incomplet",
        };
      });
      router.refresh();
    },
    [router],
  );

  const deletePiece = React.useCallback(
    async (userId: string, side: "recto" | "verso") => {
      setPieceBusy(true);
      const result = await apiJson("/api/profile/kyc", "DELETE", { userId, side });
      setPieceBusy(false);
      if (!result.ok) {
        toast.error("Suppression échouée", { description: result.error });
        return;
      }
      toast.success(`${side === "recto" ? "Recto" : "Verso"} supprimé`);
      setSelected((prev) => {
        if (!prev || prev.id !== userId) return prev;
        const hasRecto = side === "recto" ? false : prev.hasRecto;
        const hasVerso = side === "verso" ? false : prev.hasVerso;
        const needsVerso = prev.kycType === "cni" || !prev.kycType;
        const isComplete = hasRecto && (!needsVerso || hasVerso);
        return {
          ...prev,
          hasRecto,
          hasVerso,
          statut: prev.kycVerifie ? "verifie" : isComplete ? "en_attente" : "incomplet",
        };
      });
      router.refresh();
    },
    [router],
  );

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
        hidden: (row) => !canWrite || row.kycVerifie || (!row.hasRecto && !row.hasVerso),
        onClick: (row) => void setKyc(row.id, true),
      },
      {
        label: "Invalider",
        icon: ShieldOff,
        tone: "danger",
        hidden: (row) => !canWrite || !row.kycVerifie,
        onClick: (row) => void setKyc(row.id, false),
      },
    ],
    [openDetail, setKyc, canWrite],
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
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Pièces d&apos;identité (KYC).
        </h1>
        <p className="mt-1 text-sm text-ardoise">
          Vérifiez les documents d&apos;identité déposés par les candidats.
          {!canWrite && " Accès en lecture seule — la validation et la modification sont réservées à l'administrateur."}
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
              "rounded-2xl border bg-card px-4 py-3 text-left transition-colors",
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
              <SelectTrigger className="h-9 w-[180px] bg-card">
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
        <SheetContent
          side="right"
          className="flex w-full max-w-md flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-lg"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-ligne px-5 py-4 pr-12 text-left">
            <SheetTitle className="font-display text-left text-xl font-bold tracking-tight text-encre">
              Contrôle KYC
            </SheetTitle>
            <SheetDescription className="text-left text-sm text-ardoise">
              Vérifiez l&apos;identité et les faces déposées avant validation.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
            {selected ? (
              <DetailPanel
                row={selected}
                onValidate={(id) => void setKyc(id, true)}
                onInvalidate={(id) => void setKyc(id, false)}
                canWrite={canWrite}
                onReplace={(side, file) => void replacePiece(selected.id, side, file)}
                onDeletePiece={(side) => void deletePiece(selected.id, side)}
                pieceBusy={pieceBusy}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
