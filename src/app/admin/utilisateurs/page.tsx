"use client";

import * as React from "react";
import type { ColumnDef, Table } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader, createSelectColumn, createActionsColumn, type ActionItem } from "@/components/data-table/data-table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, ShieldCheck, Headset, Wallet, Crown, UserCog, Eye, Mail, UserX, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type RoleInterne = "Conseiller" | "Financier" | "Admin" | "Super Admin";

type UserApi = {
  id: string;
  email: string;
  nom: string;
  initiales: string;
  role: string; // uppercase DB enum
  actif: boolean;
  date: string;
  dossiers: number;
};

type Row = {
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

function mapRole(dbRole: string): RoleInterne {
  switch (dbRole) {
    case "CONSEILLER": return "Conseiller";
    case "FINANCIER": return "Financier";
    case "ADMIN": return "Admin";
    case "SUPER_ADMIN": return "Super Admin";
    default: return "Conseiller";
  }
}

export default function AdminUtilisateursPage() {
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [data, setData] = React.useState<Row[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: UserApi[] | null) => {
        if (!d) {
          setError("Impossible de charger les utilisateurs.");
          setLoading(false);
          return;
        }
        const rows: Row[] = d.map((u) => ({
          id: u.id,
          nom: u.nom,
          initiales: u.initiales,
          email: u.email,
          role: mapRole(u.role),
          dossiers: u.dossiers,
          date: u.date,
          actif: u.actif,
        }));
        setData(rows);
        setLoading(false);
      })
      .catch(() => {
        setError("Erreur réseau lors du chargement des utilisateurs.");
        setLoading(false);
      });
  }, []);

  const actions: ActionItem<Row>[] = React.useMemo(() => [
    {
      label: "Voir le profil",
      icon: Eye,
      onClick: (row) => toast.success("Profil ouvert", { description: `${row.nom} — ${row.role}.` }),
    },
    {
      label: "Renvoyer l'invitation",
      icon: Mail,
      onClick: (row) => toast.success("Invitation renvoyée", { description: `E-mail envoyé à ${row.email}.` }),
    },
    {
      label: "Suspendre l'accès",
      icon: UserX,
      confirm: {
        title: "Suspendre l'accès de ce membre ?",
        description: (row) => `${row.nom} ne pourra plus se connecter au back-office. L'accès peut être réactivé à tout moment.`,
        confirmLabel: "Suspendre",
        onConfirm: (row) => toast.success("Membre suspendu", { description: `${row.nom} — accès révoqué.` }),
      },
    },
    {
      label: "Supprimer le compte",
      icon: Trash2,
      tone: "danger",
      confirm: {
        title: "Supprimer ce compte ?",
        description: (row) => `Cette action est irréversible. Toutes les données de ${row.nom} seront archivées.`,
        confirmLabel: "Supprimer",
        onConfirm: (row) => toast.success("Compte supprimé", { description: `${row.nom} — données archivées.` }),
      },
    },
  ], []);

  const columns: ColumnDef<Row>[] = React.useMemo(() => [
    createSelectColumn<Row>(),
    {
      id: "nom",
      accessorKey: "nom",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Membre" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-ligne"><AvatarFallback className="bg-lapis/10 font-mono text-xs font-semibold text-lapis">{row.original.initiales}</AvatarFallback></Avatar>
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
        return <Badge className={cn("font-mono text-[10px] uppercase", ROLE_TONE[row.original.role])}><Icon className="mr-1 h-3 w-3" strokeWidth={1.5} /> {row.original.role}</Badge>;
      },
      filterFn: (row, _id, value: string) => value === "tous" ? true : row.original.role === value,
    },
    { id: "dossiers", accessorKey: "dossiers", header: ({ column }) => <DataTableColumnHeader column={column} title="Dossiers" />, cell: ({ row }) => <span className="font-mono text-sm text-encre">{row.original.dossiers}</span> },
    { id: "date", accessorKey: "date", header: ({ column }) => <DataTableColumnHeader column={column} title="Créé le" />, cell: ({ row }) => <span className="font-mono text-xs text-ardoise">{formatDate(row.original.date)}</span> },
    {
      id: "actif",
      accessorKey: "actif",
      header: () => <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Actif</span>,
      cell: ({ row }) => <Switch defaultChecked={row.original.actif} onCheckedChange={(v) => toast.success(v ? "Membre activé" : "Membre suspendu", { description: row.original.nom })} aria-label={`Activer ${row.original.nom}`} />,
      enableSorting: false,
    },
    createActionsColumn<Row>(actions, { ariaLabel: (row) => `Actions sur ${row.nom}` }),
  ], [actions]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteOpen(false);
    toast.success("Invitation envoyée", { description: "Un e-mail d'invitation a été envoyé au nouveau membre." });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-lapis" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert className="border-carmin/40 bg-carmin/5">
        <AlertTriangle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Erreur de chargement</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">{error ?? "Données indisponibles."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Utilisateurs</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Personnel & rôles.</h1>
          <p className="text-sm text-ardoise">{data.length} membres · {data.filter((u) => u.actif).length} actifs</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-lapis text-blanc hover:bg-lapis/90">
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Inviter un membre
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-blanc sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-encre">Inviter un nouveau membre</DialogTitle>
              <DialogDescription className="text-sm text-ardoise">Le membre recevra un e-mail d'invitation pour rejoindre le back-office.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Prénom</Label>
                  <Input placeholder="Aïssatou" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Nom</Label>
                  <Input placeholder="Diallo" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">E-mail professionnel</Label>
                <Input type="email" placeholder="a.diallo@getadm.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Rôle</Label>
                <Select defaultValue="Conseiller">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conseiller">Conseiller</SelectItem>
                    <SelectItem value="Financier">Financier</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Annuler</Button>
                <Button type="submit" className="bg-lapis text-blanc hover:bg-lapis/90">Envoyer l'invitation</Button>
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
        toolbar={(table: Table<Row>) => (
          <Select
            value={(table.getColumn("role")?.getFilterValue() as string) ?? "tous"}
            onValueChange={(v) => table.getColumn("role")?.setFilterValue(v)}
          >
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Rôle" /></SelectTrigger>
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
          Les rôles déterminent les permissions : <strong>Conseiller</strong> (dossiers assignés), <strong>Financier</strong> (transactions & reçus), <strong>Admin</strong> (toutes les sections sauf paramètres système), <strong>Super Admin</strong> (accès complet incl. paramètres).
        </AlertDescription>
      </Alert>
    </div>
  );
}
