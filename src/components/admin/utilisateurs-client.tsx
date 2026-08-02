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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  ShieldCheck,
  Headset,
  Wallet,
  Crown,
  UserCog,
  Pencil,
  Mail,
  UserX,
  Trash2,
  Loader2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DbRole = "CONSEILLER" | "FINANCIER" | "ADMIN" | "SUPER_ADMIN";

export type UserRow = {
  id: string;
  prenom: string;
  nomFamille: string;
  nom: string;
  initiales: string;
  email: string;
  role: DbRole;
  dossiers: number;
  dossiersOuverts: number;
  date: string;
  lastLoginAt: string | null;
  actif: boolean;
};

const ROLE_LABEL: Record<DbRole, string> = {
  CONSEILLER: "Conseiller",
  FINANCIER: "Financier",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

const ROLE_ICON: Record<DbRole, React.ElementType> = {
  CONSEILLER: Headset,
  FINANCIER: Wallet,
  ADMIN: ShieldCheck,
  SUPER_ADMIN: Crown,
};

const ROLE_TONE: Record<DbRole, string> = {
  CONSEILLER: "bg-lapis/10 text-lapis",
  FINANCIER: "bg-vert/10 text-vert",
  ADMIN: "bg-ambre/10 text-ambre",
  SUPER_ADMIN: "bg-or/15 text-or",
};

type ActorRole = "ADMIN" | "SUPER_ADMIN";

function canManageRow(actorRole: ActorRole, row: UserRow): boolean {
  if (row.role === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") return false;
  return true;
}

function assignableRolesFor(actorRole: ActorRole): DbRole[] {
  if (actorRole === "SUPER_ADMIN") {
    return ["CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"];
  }
  return ["CONSEILLER", "FINANCIER", "ADMIN"];
}

export function UtilisateursClient({
  initialData,
  currentRole,
  currentUserId,
}: {
  initialData: UserRow[];
  currentRole: ActorRole;
  currentUserId: string;
}) {
  const router = useRouter();
  const data = initialData;
  const roleOptions = assignableRolesFor(currentRole);

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);

  const [formPrenom, setFormPrenom] = React.useState("");
  const [formNom, setFormNom] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formRole, setFormRole] = React.useState<DbRole>("CONSEILLER");
  const [saving, setSaving] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const resetInviteForm = () => {
    setFormPrenom("");
    setFormNom("");
    setFormEmail("");
    setFormRole("CONSEILLER");
  };

  const openEdit = (row: UserRow) => {
    if (!canManageRow(currentRole, row)) {
      toast.error("Accès refusé", {
        description: "Un administrateur ne peut pas modifier un super-administrateur.",
      });
      return;
    }
    setEditing(row);
    setFormPrenom(row.prenom);
    setFormNom(row.nomFamille);
    setFormEmail(row.email);
    setFormRole(row.role === "SUPER_ADMIN" && currentRole !== "SUPER_ADMIN" ? "ADMIN" : row.role);
    setEditOpen(true);
  };

  const toggleActif = async (row: UserRow) => {
    if (!canManageRow(currentRole, row)) {
      toast.error("Accès refusé", {
        description: "Un administrateur ne peut pas modifier un super-administrateur.",
      });
      return;
    }
    if (row.id === currentUserId && row.actif) {
      toast.error("Action interdite", { description: "Vous ne pouvez pas désactiver votre propre compte." });
      return;
    }
    setUpdatingId(row.id);
    try {
      const res = await fetch(`/api/admin/users/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !row.actif }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Mise à jour échouée", {
          description: (err as { error?: string })?.error ?? "Erreur serveur.",
        });
        return;
      }
      toast.success(!row.actif ? "Membre activé" : "Membre suspendu", { description: row.nom });
      router.refresh();
    } catch {
      toast.error("Mise à jour échouée", { description: "Erreur réseau." });
    } finally {
      setUpdatingId(null);
    }
  };

  const suspendre = async (row: UserRow) => {
    if (!canManageRow(currentRole, row)) return;
    setUpdatingId(row.id);
    try {
      const res = await fetch(`/api/admin/users/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: false }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Suspension échouée", {
          description: (err as { error?: string })?.error ?? "Erreur serveur.",
        });
        return;
      }
      toast.success("Membre suspendu", { description: `${row.nom} — accès révoqué.` });
      router.refresh();
    } catch {
      toast.error("Suspension échouée", { description: "Erreur réseau." });
    } finally {
      setUpdatingId(null);
    }
  };

  const supprimer = async (row: UserRow) => {
    if (!canManageRow(currentRole, row)) return;
    setUpdatingId(row.id);
    try {
      const res = await fetch(`/api/admin/users/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Suppression échouée", {
          description: (err as { error?: string })?.error ?? "Erreur serveur.",
        });
        return;
      }
      const data = await res.json().catch(() => ({}));
      toast.success(
        (data as { softDeleted?: boolean }).softDeleted ? "Compte désactivé" : "Compte supprimé",
        { description: row.nom },
      );
      router.refresh();
    } catch {
      toast.error("Suppression échouée", { description: "Erreur réseau." });
    } finally {
      setUpdatingId(null);
    }
  };

  const resetPassword = async (row: UserRow) => {
    if (!canManageRow(currentRole, row)) {
      toast.error("Accès refusé", {
        description: "Un administrateur ne peut pas réinitialiser un super-administrateur.",
      });
      return;
    }
    setUpdatingId(row.id);
    try {
      const res = await fetch(`/api/admin/users/${row.id}/reset-password`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Réinitialisation échouée", {
          description: (err as { error?: string })?.error ?? "Erreur serveur.",
        });
        return;
      }
      const data = await res.json();
      toast.success("Mot de passe réinitialisé", {
        description: data.defaultPassword
          ? `Nouveau mot de passe temporaire : ${data.defaultPassword}`
          : `E-mail envoyé à ${row.email}`,
      });
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setUpdatingId(null);
    }
  };

  const actions: ActionItem<UserRow>[] = React.useMemo(
    () => [
      {
        label: "Modifier",
        icon: Pencil,
        hidden: (row) => !canManageRow(currentRole, row),
        onClick: (row) => openEdit(row),
      },
      {
        label: "Réinitialiser le mot de passe",
        icon: Mail,
        hidden: (row) => !canManageRow(currentRole, row),
        onClick: (row) => void resetPassword(row),
      },
      {
        label: "Suspendre l'accès",
        icon: UserX,
        hidden: (row) =>
          !canManageRow(currentRole, row) || !row.actif || row.id === currentUserId,
        confirm: {
          title: "Suspendre l'accès de ce membre ?",
          description: (row) =>
            `${row.nom} ne pourra plus se connecter au back-office. L'accès peut être réactivé à tout moment.`,
          confirmLabel: "Suspendre",
          onConfirm: (row) => void suspendre(row),
        },
      },
      {
        label: "Supprimer le compte",
        icon: Trash2,
        tone: "danger",
        hidden: (row) => !canManageRow(currentRole, row) || row.id === currentUserId,
        confirm: {
          title: "Supprimer ce compte ?",
          description: (row) =>
            `Si des données sont liées à ${row.nom}, le compte sera désactivé (soft-delete). Sinon, suppression définitive.`,
          confirmLabel: "Supprimer",
          onConfirm: (row) => void supprimer(row),
        },
      },
    ],
     
    [currentRole, currentUserId],
  );

  const columns: ColumnDef<UserRow>[] = React.useMemo(
    () => [
      createSelectColumn<UserRow>(),
      {
        id: "nom",
        accessorKey: "nom",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Membre" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-ligne">
              <AvatarFallback className="bg-lapis/10 font-mono text-xs font-semibold text-lapis">
                {row.original.initiales}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-encre">
                {row.original.nom}
                {row.original.id === currentUserId && (
                  <Badge variant="outline" className="font-mono text-[9px] uppercase">
                    Vous
                  </Badge>
                )}
                {!canManageRow(currentRole, row.original) && (
                  <Lock className="h-3.5 w-3.5 text-ardoise" strokeWidth={1.5} aria-label="Protégé" />
                )}
              </p>
              <p className="font-mono text-[11px] text-ardoise">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: "role",
        accessorKey: "role",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Rôle" />,
        cell: ({ row }) => {
          const Icon = ROLE_ICON[row.original.role];
          return (
            <Badge className={cn("font-mono text-[10px] uppercase", ROLE_TONE[row.original.role])}>
              <Icon className="mr-1 h-3 w-3" strokeWidth={1.5} /> {ROLE_LABEL[row.original.role]}
            </Badge>
          );
        },
        filterFn: (row, _id, value: string) =>
          value === "tous" ? true : row.original.role === value,
      },
      {
        id: "dossiers",
        accessorKey: "dossiers",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Dossiers" />,
        cell: ({ row }) => (
          <div className="text-sm">
            <span className="font-mono font-semibold text-encre">{row.original.dossiers}</span>
            <span className="ml-1 text-xs text-ardoise">
              ({row.original.dossiersOuverts} ouverts)
            </span>
          </div>
        ),
      },
      {
        id: "lastLoginAt",
        accessorKey: "lastLoginAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Dernière connexion" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-ardoise">
            {row.original.lastLoginAt ? formatDate(row.original.lastLoginAt) : "—"}
          </span>
        ),
      },
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Créé le" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-ardoise">{formatDate(row.original.date)}</span>
        ),
      },
      {
        id: "actif",
        accessorKey: "actif",
        header: () => (
          <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
            Actif
          </span>
        ),
        cell: ({ row }) => {
          const locked = !canManageRow(currentRole, row.original);
          const selfLock = row.original.id === currentUserId && row.original.actif;
          return (
            <Switch
              checked={row.original.actif}
              disabled={updatingId === row.original.id || locked || selfLock}
              onCheckedChange={() => void toggleActif(row.original)}
              aria-label={`Activer ${row.original.nom}`}
            />
          );
        },
        enableSorting: false,
      },
      createActionsColumn<UserRow>(actions, {
        ariaLabel: (row) => `Actions sur ${row.nom}`,
      }),
    ],
     
    [actions, updatingId, currentRole, currentUserId],
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: formPrenom,
          nom: formNom,
          email: formEmail,
          role: formRole,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Création échouée", {
          description: (err as { error?: string })?.error ?? "Erreur serveur.",
        });
        return;
      }
      const result = await res.json().catch(() => ({}));
      const defaultPwd = (result as { defaultPassword?: string })?.defaultPassword;
      toast.success("Membre ajouté", {
        description: defaultPwd
          ? `${formPrenom} ${formNom} — mot de passe temporaire : ${defaultPwd}`
          : `Invitation envoyée à ${formEmail}.`,
      });
      setInviteOpen(false);
      resetInviteForm();
      router.refresh();
    } catch {
      toast.error("Création échouée", { description: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: formPrenom,
          nom: formNom,
          email: formEmail,
          role: formRole,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Modification échouée", {
          description: (err as { error?: string })?.error ?? "Erreur serveur.",
        });
        return;
      }
      toast.success("Membre mis à jour", { description: `${formPrenom} ${formNom}` });
      setEditOpen(false);
      setEditing(null);
      router.refresh();
    } catch {
      toast.error("Modification échouée", { description: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Utilisateurs</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
            Personnel &amp; rôles.
          </h1>
          <p className="text-sm text-ardoise">
            {data.length} membres · {data.filter((u) => u.actif).length} actifs
            {currentRole === "ADMIN" && (
              <span className="ml-1 text-xs">· Les super-admins sont en lecture seule</span>
            )}
          </p>
        </div>
        <Dialog
          open={inviteOpen}
          onOpenChange={(open) => {
            setInviteOpen(open);
            if (!open) resetInviteForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-lapis text-blanc hover:bg-lapis/90">
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Ajouter un membre
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-blanc sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-encre">
                Ajouter un membre
              </DialogTitle>
              <DialogDescription className="text-sm text-ardoise">
                Créez un compte personnel. Un mot de passe temporaire sera généré et envoyé par
                e-mail.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-prenom">Prénom</Label>
                  <Input
                    id="invite-prenom"
                    value={formPrenom}
                    onChange={(e) => setFormPrenom(e.target.value)}
                    placeholder="Aïssatou"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-nom">Nom</Label>
                  <Input
                    id="invite-nom"
                    value={formNom}
                    onChange={(e) => setFormNom(e.target.value)}
                    placeholder="Diallo"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">E-mail professionnel</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="a.diallo@getadm.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Rôle</Label>
                <Select value={formRole} onValueChange={(v) => setFormRole(v as DbRole)}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                  disabled={saving}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-lapis text-blanc hover:bg-lapis/90"
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
                  Créer le compte
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="bg-blanc sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-encre">
              Modifier le membre
            </DialogTitle>
            <DialogDescription className="text-sm text-ardoise">
              Mettez à jour l&apos;identité, l&apos;e-mail ou le rôle.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-prenom">Prénom</Label>
                <Input
                  id="edit-prenom"
                  value={formPrenom}
                  onChange={(e) => setFormPrenom(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-nom">Nom</Label>
                <Input
                  id="edit-nom"
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Rôle</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as DbRole)}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-lapis text-blanc hover:bg-lapis/90"
                disabled={saving}
              >
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DataTable
        columns={columns}
        data={data}
        searchKey="nom"
        searchPlaceholder="Rechercher un membre…"
        pageSize={8}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-2">
            <UserCog className="h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
            <p className="text-sm font-medium text-encre">Aucun membre</p>
            <p className="text-xs text-ardoise">Aucun utilisateur ne correspond à ces filtres.</p>
          </div>
        }
        toolbar={(table: Table<UserRow>) => (
          <Select
            value={(table.getColumn("role")?.getFilterValue() as string) ?? "tous"}
            onValueChange={(v) => table.getColumn("role")?.setFilterValue(v)}
          >
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder="Rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les rôles</SelectItem>
              {(Object.keys(ROLE_LABEL) as DbRole[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      <Alert className="border-ligne bg-blanc">
        <UserCog className="h-4 w-4 text-lapis" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">
          Gestion des accès
        </AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          <strong>Admin</strong> et <strong>Super Admin</strong> peuvent créer, modifier, suspendre
          et supprimer le personnel. Un Admin ne peut pas modifier un Super Admin. Seul un Super
          Admin peut créer ou promouvoir un Super Admin.
        </AlertDescription>
      </Alert>
    </div>
  );
}
