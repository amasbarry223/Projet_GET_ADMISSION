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
import { apiJson } from "@/lib/api-client";
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
  KeyRound,
  UserX,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PASSWORD_MIN_LENGTH } from "@/shared/constants";

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

const ASSIGNABLE_ROLES: DbRole[] = ["CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"];

export function UtilisateursClient({
  initialData,
  currentRole,
  currentUserId,
  hideTitle,
}: {
  initialData: UserRow[];
  hideTitle?: boolean;
  currentRole: ActorRole;
  currentUserId: string;
}) {
  const router = useRouter();
  const data = initialData;
  const canWrite = currentRole === "SUPER_ADMIN";
  const roleOptions = canWrite ? ASSIGNABLE_ROLES : [];

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);

  const [formPrenom, setFormPrenom] = React.useState("");
  const [formNom, setFormNom] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formRole, setFormRole] = React.useState<DbRole>("CONSEILLER");
  const [formPassword, setFormPassword] = React.useState("");
  const [formConfirmPassword, setFormConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const resetInviteForm = () => {
    setFormPrenom("");
    setFormNom("");
    setFormEmail("");
    setFormRole("CONSEILLER");
    setFormPassword("");
    setFormConfirmPassword("");
    setShowPassword(false);
  };

  const resetEditPasswordFields = () => {
    setFormPassword("");
    setFormConfirmPassword("");
    setShowPassword(false);
  };

  const denyWrite = () => {
    toast.error("Accès refusé", {
      description: "Seul un super-administrateur peut gérer le personnel.",
    });
  };

  const openEdit = (row: UserRow) => {
    if (!canWrite) {
      denyWrite();
      return;
    }
    setEditing(row);
    setFormPrenom(row.prenom);
    setFormNom(row.nomFamille);
    setFormEmail(row.email);
    setFormRole(row.role);
    resetEditPasswordFields();
    setEditOpen(true);
  };

  const toggleActif = async (row: UserRow) => {
    if (!canWrite) {
      denyWrite();
      return;
    }
    if (row.id === currentUserId && row.actif) {
      toast.error("Action interdite", {
        description: "Vous ne pouvez pas désactiver votre propre compte.",
      });
      return;
    }
    setUpdatingId(row.id);
    const result = await apiJson(`/api/admin/users/${row.id}`, "PUT", { actif: !row.actif });
    setUpdatingId(null);
    if (!result.ok) {
      toast.error("Mise à jour échouée", { description: result.error });
      return;
    }
    toast.success(!row.actif ? "Membre activé" : "Membre suspendu", { description: row.nom });
    router.refresh();
  };

  const suspendre = async (row: UserRow) => {
    if (!canWrite) return;
    setUpdatingId(row.id);
    const result = await apiJson(`/api/admin/users/${row.id}`, "PUT", { actif: false });
    setUpdatingId(null);
    if (!result.ok) {
      toast.error("Suspension échouée", { description: result.error });
      return;
    }
    toast.success("Membre suspendu", { description: `${row.nom} — accès révoqué.` });
    router.refresh();
  };

  const supprimer = async (row: UserRow) => {
    if (!canWrite) return;
    setUpdatingId(row.id);
    const result = await apiJson<{ softDeleted?: boolean }>(`/api/admin/users/${row.id}`, "DELETE");
    setUpdatingId(null);
    if (!result.ok) {
      toast.error("Suppression échouée", { description: result.error });
      return;
    }
    toast.success("Compte supprimé définitivement", {
      description: `${row.nom} a été supprimé. Les dossiers éventuellement assignés ont été désassignés.`,
    });
    router.refresh();
  };

  const resetPassword = async (row: UserRow) => {
    if (!canWrite) {
      denyWrite();
      return;
    }
    setUpdatingId(row.id);
    const result = await apiJson<{ defaultPassword?: string }>(
      `/api/admin/users/${row.id}/reset-password`,
      "POST",
    );
    setUpdatingId(null);
    if (!result.ok) {
      toast.error("Réinitialisation échouée", { description: result.error });
      return;
    }
    toast.success("Mot de passe réinitialisé", {
      description: result.data.defaultPassword
        ? `Nouveau mot de passe temporaire : ${result.data.defaultPassword}`
        : `E-mail envoyé à ${row.email}`,
    });
  };

  const actions: ActionItem<UserRow>[] = React.useMemo(() => {
    if (!canWrite) return [];
    return [
      {
        label: "Modifier",
        icon: Pencil,
        onClick: (row) => openEdit(row),
      },
      {
        label: "Réinitialiser le mot de passe",
        icon: KeyRound,
        confirm: {
          title: "Réinitialiser le mot de passe ?",
          description: (row) =>
            `Générer un mot de passe temporaire pour ${row.nom} et l'envoyer à ${row.email}.`,
          confirmLabel: "Réinitialiser",
          onConfirm: (row) => void resetPassword(row),
        },
      },
      {
        label: "Suspendre l'accès",
        icon: UserX,
        hidden: (row) => !row.actif || row.id === currentUserId,
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
        hidden: (row) => row.id === currentUserId,
        confirm: {
          title: "Supprimer ce compte définitivement ?",
          description: (row) =>
            `Cette action est irréversible. Le compte de ${row.nom} sera supprimé de la base de données. Les dossiers qu'il avait en charge seront automatiquement désassignés pour être réattribués.`,
          confirmLabel: "Supprimer définitivement",
          onConfirm: (row) => void supprimer(row),
        },
      },
    ];
  }, [canWrite, currentUserId]);

  const columns: ColumnDef<UserRow>[] = React.useMemo(() => {
    const cols: ColumnDef<UserRow>[] = [];

    if (canWrite) {
      cols.push(createSelectColumn<UserRow>());
    }

    cols.push(
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
          if (!canWrite) {
            return (
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[10px] uppercase",
                  row.original.actif
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {row.original.actif ? "Actif" : "Suspendu"}
              </Badge>
            );
          }
          const selfLock = row.original.id === currentUserId && row.original.actif;
          return (
            <Switch
              checked={row.original.actif}
              disabled={updatingId === row.original.id || selfLock}
              onCheckedChange={() => void toggleActif(row.original)}
              aria-label={`Activer ${row.original.nom}`}
            />
          );
        },
        enableSorting: false,
      },
    );

    if (canWrite) {
      cols.push(
        createActionsColumn<UserRow>(actions, {
          ariaLabel: (row) => `Actions sur ${row.nom}`,
        }),
      );
    }

    return cols;
  }, [actions, updatingId, canWrite, currentUserId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      denyWrite();
      return;
    }
    if (formPassword !== formConfirmPassword) {
      toast.error("Mots de passe différents", {
        description: "Les deux champs mot de passe doivent être identiques.",
      });
      return;
    }
    if (formPassword.length < PASSWORD_MIN_LENGTH) {
      toast.error("Mot de passe trop court", {
        description: `Au moins ${PASSWORD_MIN_LENGTH} caractères.`,
      });
      return;
    }
    setSaving(true);
    const result = await apiJson("/api/admin/users", "POST", {
      prenom: formPrenom,
      nom: formNom,
      email: formEmail,
      role: formRole,
      password: formPassword,
      confirmPassword: formConfirmPassword,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error("Création échouée", { description: result.error });
      return;
    }
    toast.success("Membre créé", {
      description: `${formPrenom} ${formNom} · ${formEmail} · ${ROLE_LABEL[formRole]}`,
    });
    setInviteOpen(false);
    resetInviteForm();
    router.refresh();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !canWrite) return;
    if (formPassword || formConfirmPassword) {
      if (formPassword !== formConfirmPassword) {
        toast.error("Mots de passe différents", {
          description: "Les deux champs mot de passe doivent être identiques.",
        });
        return;
      }
      if (formPassword.length < PASSWORD_MIN_LENGTH) {
        toast.error("Mot de passe trop court", {
          description: `Au moins ${PASSWORD_MIN_LENGTH} caractères.`,
        });
        return;
      }
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      prenom: formPrenom,
      nom: formNom,
      email: formEmail,
      role: formRole,
    };
    if (formPassword) {
      payload.password = formPassword;
      payload.confirmPassword = formConfirmPassword;
    }
    const result = await apiJson(`/api/admin/users/${editing.id}`, "PUT", payload);
    setSaving(false);
    if (!result.ok) {
      toast.error("Modification échouée", { description: result.error });
      return;
    }
    toast.success("Membre mis à jour", {
      description: formPassword
        ? `${formPrenom} ${formNom} — mot de passe mis à jour`
        : `${formPrenom} ${formNom}`,
    });
    setEditOpen(false);
    setEditing(null);
    resetEditPasswordFields();
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {!hideTitle && (
            <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
              Personnel &amp; rôles.
            </h1>
          )}
          <p className="text-sm text-ardoise">
            {data.length} membres · {data.filter((u) => u.actif).length} actifs
            {!canWrite && (
              <span className="ml-1 text-xs">
                · Lecture seule · gestion réservée au Super Admin
              </span>
            )}
          </p>
        </div>
        {canWrite && (
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
            <DialogContent className="bg-card sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-lg font-bold text-encre">
                  Ajouter un membre
                </DialogTitle>
                <DialogDescription className="text-sm text-ardoise">
                  Créez un compte personnel et définissez son mot de passe. Communiquez-le ensuite
                  au membre concerné.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <div className="space-y-1.5">
                  <Label htmlFor="invite-password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="invite-password"
                      type={showPassword ? "text" : "password"}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={`Au moins ${PASSWORD_MIN_LENGTH} caractères`}
                      minLength={PASSWORD_MIN_LENGTH}
                      autoComplete="new-password"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-ardoise hover:text-encre"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                      ) : (
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-confirm-password">Confirmer le mot de passe</Label>
                  <Input
                    id="invite-confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={formConfirmPassword}
                    onChange={(e) => setFormConfirmPassword(e.target.value)}
                    placeholder="Retapez le mot de passe"
                    minLength={PASSWORD_MIN_LENGTH}
                    autoComplete="new-password"
                    required
                  />
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
                    {saving && (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />
                    )}
                    Créer le compte
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {canWrite && (
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) {
              setEditing(null);
              resetEditPasswordFields();
            }
          }}
        >
          <DialogContent className="bg-card sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-encre">
                {editing?.id === currentUserId ? "Modifier mes accès" : "Modifier le membre"}
              </DialogTitle>
              <DialogDescription className="text-sm text-ardoise">
                {editing?.id === currentUserId
                  ? "Mettez à jour votre identité, votre e-mail ou votre mot de passe."
                  : "Mettez à jour l'identité, l'e-mail, le rôle ou le mot de passe."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <Select
                  value={formRole}
                  onValueChange={(v) => setFormRole(v as DbRole)}
                  disabled={editing?.id === currentUserId && editing.role === "SUPER_ADMIN"}
                >
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
                {editing?.id === currentUserId && editing.role === "SUPER_ADMIN" && (
                  <p className="text-xs text-ardoise">
                    Votre rôle Super Admin ne peut pas être modifié depuis ici.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-password">
                  {editing?.id === currentUserId ? "Nouveau mot de passe" : "Mot de passe"}{" "}
                  <span className="font-normal text-ardoise">(optionnel)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showPassword ? "text" : "password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={`Laisser vide pour ne pas changer · min. ${PASSWORD_MIN_LENGTH}`}
                    minLength={PASSWORD_MIN_LENGTH}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-ardoise hover:text-encre"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="edit-confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={formConfirmPassword}
                  onChange={(e) => setFormConfirmPassword(e.target.value)}
                  placeholder="Retapez uniquement si vous changez le mot de passe"
                  autoComplete="new-password"
                />
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
      )}

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

      <Alert className="border-ligne bg-card">
        {canWrite ? (
          <Crown className="h-4 w-4 text-or" strokeWidth={1.5} />
        ) : (
          <Eye className="h-4 w-4 text-lapis" strokeWidth={1.5} />
        )}
        <AlertTitle className="font-display text-sm font-bold text-encre">
          Gestion des accès
        </AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          {canWrite ? (
            <>
              En tant que <strong>Super Admin</strong>, vous pouvez gérer tout le personnel
              (créer, modifier, activer/désactiver, supprimer, réinitialiser ou définir un mot de
              passe) — y compris vos propres accès. Un <strong>Admin</strong> ne peut ni ajouter,
              ni modifier, ni supprimer un Super Admin. Vous ne pouvez pas vous désactiver ni vous
              supprimer vous-même.
            </>
          ) : (
            <>
              Cette page est en <strong>lecture seule</strong>. Seul un <strong>Super Admin</strong>{" "}
              peut créer, modifier, suspendre, supprimer ou changer le mot de passe du personnel.
              Les comptes Super Admin sont protégés.
            </>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
