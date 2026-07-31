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
  Eye,
  Mail,
  UserX,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type RoleInterne = "Conseiller" | "Financier" | "Admin" | "Super Admin";

export type UserRow = {
  id: string;
  nom: string;
  initiales: string;
  email: string;
  role: RoleInterne;
  dossiers: number;
  date: string;
  actif: boolean;
};

const ROLE_ICON: Record<RoleInterne, React.ElementType> = {
  Conseiller: Headset,
  Financier: Wallet,
  Admin: ShieldCheck,
  "Super Admin": Crown,
};
const ROLE_TONE: Record<RoleInterne, string> = {
  Conseiller: "bg-lapis/10 text-lapis",
  Financier: "bg-vert/10 text-vert",
  Admin: "bg-ambre/10 text-ambre",
  "Super Admin": "bg-or/15 text-or",
};

// Conversion entre les libellés français (UI) et les codes DB (API).
const ROLE_FR_TO_DB: Record<RoleInterne, string> = {
  Conseiller: "CONSEILLER",
  Financier: "FINANCIER",
  Admin: "ADMIN",
  "Super Admin": "SUPER_ADMIN",
};

export function UtilisateursClient({ initialData }: { initialData: UserRow[] }) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  // On lit directement la prop `initialData` (pas de useState) afin que
  // `router.refresh()` (re-render du Server Component) se reflète dans l'UI.
  const data = initialData;

  // État du formulaire d'invitation
  const [formPrenom, setFormPrenom] = React.useState("");
  const [formNom, setFormNom] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formRole, setFormRole] = React.useState<RoleInterne>("Conseiller");
  const [inviting, setInviting] = React.useState(false);
  // ID de l'utilisateur en cours de mise à jour (switch / suspend / delete)
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const toggleActif = async (id: string, currentActif: boolean, nom: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !currentActif }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Mise à jour échouée", { description: (err as any)?.error ?? "Erreur serveur." });
        return;
      }
      toast.success(!currentActif ? "Membre activé" : "Membre suspendu", { description: nom });
      router.refresh();
    } catch {
      toast.error("Mise à jour échouée", { description: "Erreur réseau." });
    } finally {
      setUpdatingId(null);
    }
  };

  const suspendre = async (id: string, nom: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: false }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Suspension échouée", { description: (err as any)?.error ?? "Erreur serveur." });
        return;
      }
      toast.success("Membre suspendu", { description: `${nom} — accès révoqué.` });
      router.refresh();
    } catch {
      toast.error("Suspension échouée", { description: "Erreur réseau." });
    } finally {
      setUpdatingId(null);
    }
  };

  const supprimer = async (id: string, nom: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Suppression échouée", { description: (err as any)?.error ?? "Erreur serveur." });
        return;
      }
      toast.success("Compte supprimé", { description: `${nom} — données archivées.` });
      router.refresh();
    } catch {
      toast.error("Suppression échouée", { description: "Erreur réseau." });
    } finally {
      setUpdatingId(null);
    }
  };

  const actions: ActionItem<UserRow>[] = React.useMemo(
    () => [
      {
        label: "Voir le profil",
        icon: Eye,
        onClick: (row) => {
          // Redirige vers le profil de l'utilisateur (admin peut voir via espace)
          toast.info("Profil", { description: `${row.nom} — ${row.role} — ${row.email}` });
        },
      },
      {
        label: "Renvoyer l'invitation",
        icon: Mail,
        onClick: async (row) => {
          try {
            const res = await fetch("/api/admin/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prenom: row.nom.split(" ")[0], nom: row.nom.split(" ").slice(1).join(" "), email: row.email, role: row.role }),
            });
            if (res.ok) {
              const data = await res.json();
              toast.success("Invitation renvoyée", { description: `E-mail envoyé à ${row.email}.${data.defaultPassword ? ` Mot de passe : ${data.defaultPassword}` : ""}` });
            } else {
              toast.error("Échec", { description: "L'envoi a échoué." });
            }
          } catch {
            toast.error("Erreur réseau");
          }
        },
      },
      {
        label: "Suspendre l'accès",
        icon: UserX,
        confirm: {
          title: "Suspendre l'accès de ce membre ?",
          description: (row) =>
            `${row.nom} ne pourra plus se connecter au back-office. L'accès peut être réactivé à tout moment.`,
          confirmLabel: "Suspendre",
          onConfirm: (row) => suspendre(row.id, row.nom),
        },
      },
      {
        label: "Supprimer le compte",
        icon: Trash2,
        tone: "danger",
        confirm: {
          title: "Supprimer ce compte ?",
          description: (row) =>
            `Cette action est irréversible. Toutes les données de ${row.nom} seront archivées.`,
          confirmLabel: "Supprimer",
          onConfirm: (row) => supprimer(row.id, row.nom),
        },
      },
    ],
    []
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
              <p className="text-sm font-medium text-encre">{row.original.nom}</p>
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
              <Icon className="mr-1 h-3 w-3" strokeWidth={1.5} /> {row.original.role}
            </Badge>
          );
        },
        filterFn: (row, _id, value: string) => (value === "tous" ? true : row.original.role === value),
      },
      {
        id: "dossiers",
        accessorKey: "dossiers",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Dossiers" />,
        cell: ({ row }) => <span className="font-mono text-sm text-encre">{row.original.dossiers}</span>,
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
          <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Actif</span>
        ),
        cell: ({ row }) => (
          <Switch
            defaultChecked={row.original.actif}
            disabled={updatingId === row.original.id}
            onCheckedChange={(v) => toggleActif(row.original.id, row.original.actif, row.original.nom)}
            aria-label={`Activer ${row.original.nom}`}
          />
        ),
        enableSorting: false,
      },
      createActionsColumn<UserRow>(actions, { ariaLabel: (row) => `Actions sur ${row.nom}` }),
    ],
    [actions, updatingId]
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: formPrenom,
          nom: formNom,
          email: formEmail,
          role: ROLE_FR_TO_DB[formRole],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Invitation échouée", { description: (err as any)?.error ?? "Erreur serveur." });
        return;
      }
      const result = await res.json().catch(() => ({}));
      const defaultPwd = (result as any)?.defaultPassword;
      toast.success("Invitation envoyée", {
        description: defaultPwd
          ? `${formPrenom} ${formNom} peut se connecter avec le mot de passe « ${defaultPwd} ».`
          : `Un e-mail d'invitation a été envoyé au nouveau membre.`,
      });
      setInviteOpen(false);
      setFormPrenom("");
      setFormNom("");
      setFormEmail("");
      setFormRole("Conseiller");
      router.refresh();
    } catch {
      toast.error("Invitation échouée", { description: "Erreur réseau." });
    } finally {
      setInviting(false);
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
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-lapis text-blanc hover:bg-lapis/90">
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Inviter un membre
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-blanc sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-encre">
                Inviter un nouveau membre
              </DialogTitle>
              <DialogDescription className="text-sm text-ardoise">
                Le membre recevra un e-mail d'invitation pour rejoindre le back-office.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Prénom</Label>
                  <Input
                    value={formPrenom}
                    onChange={(e) => setFormPrenom(e.target.value)}
                    placeholder="Aïssatou"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Nom</Label>
                  <Input
                    value={formNom}
                    onChange={(e) => setFormNom(e.target.value)}
                    placeholder="Diallo"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">E-mail professionnel</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="a.diallo@getadm.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Rôle</Label>
                <Select value={formRole} onValueChange={(v) => setFormRole(v as RoleInterne)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conseiller">Conseiller</SelectItem>
                    <SelectItem value="Financier">Financier</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-lapis text-blanc hover:bg-lapis/90" disabled={inviting}>
                  {inviting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
                  Envoyer l&apos;invitation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="nom"
        searchPlaceholder="Rechercher un membre…"
        pageSize={8}
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
              <SelectItem value="Conseiller">Conseiller</SelectItem>
              <SelectItem value="Financier">Financier</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Super Admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        )}
      />

      <Alert className="border-ligne bg-blanc">
        <UserCog className="h-4 w-4 text-lapis" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Gestion des accès</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          Les rôles déterminent les permissions : <strong>Conseiller</strong> (dossiers assignés),{" "}
          <strong>Financier</strong> (transactions &amp; reçus), <strong>Admin</strong> (toutes les sections
          sauf paramètres système), <strong>Super Admin</strong> (accès complet incl. paramètres).
        </AlertDescription>
      </Alert>
    </div>
  );
}
