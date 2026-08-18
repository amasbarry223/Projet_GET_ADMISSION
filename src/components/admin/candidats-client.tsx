"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  createActionsColumn,
  type ActionItem,
} from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { GraduationCap, Plus, Pencil, Trash2, Loader2, Download, FileText, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

export type CandidatRow = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  nationalite: string | null;
  actif: boolean;
  kycVerifie: boolean;
  dossiers: number;
  date: string;
  lastLoginAt: string | null;
  conseillerId?: string | null;
  conseillerNom?: string | null;
  isAssignedToConseiller?: boolean;
};

export function CandidatsClient({
  initialData,
  canWrite,
}: {
  initialData: CandidatRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const data = initialData;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CandidatRow | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const [formPrenom, setFormPrenom] = React.useState("");
  const [formNom, setFormNom] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formTelephone, setFormTelephone] = React.useState("");
  const [formNationalite, setFormNationalite] = React.useState("");
  const [formActif, setFormActif] = React.useState(true);

  const resetForm = () => {
    setFormPrenom("");
    setFormNom("");
    setFormEmail("");
    setFormTelephone("");
    setFormNationalite("");
    setFormActif(true);
  };

  const openEdit = (row: CandidatRow) => {
    setEditing(row);
    setFormPrenom(row.prenom);
    setFormNom(row.nom);
    setFormEmail(row.email);
    setFormTelephone(row.telephone || "");
    setFormNationalite(row.nationalite || "");
    setFormActif(row.actif);
    setEditOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPrenom.trim() || !formNom.trim() || !formEmail.trim()) {
      toast.error("Champs obligatoires manquants");
      return;
    }
    setSaving(true);
    const result = await apiJson<{ tempPassword: string }>("/api/admin/candidats", "POST", {
      prenom: formPrenom,
      nom: formNom,
      email: formEmail,
      telephone: formTelephone || undefined,
      nationalite: formNationalite || undefined,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error("Création échouée", { description: result.error });
      return;
    }
    toast.success("Candidat créé", { description: `Mot de passe temporaire : ${result.data.tempPassword}` });
    setCreateOpen(false);
    resetForm();
    router.refresh();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const result = await apiJson(`/api/admin/candidats/${editing.id}`, "PUT", {
      prenom: formPrenom,
      nom: formNom,
      email: formEmail,
      telephone: formTelephone || undefined,
      nationalite: formNationalite || undefined,
      actif: formActif,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error("Modification échouée", { description: result.error });
      return;
    }
    toast.success("Candidat mis à jour");
    setEditOpen(false);
    setEditing(null);
    resetForm();
    router.refresh();
  };

  const toggleActif = async (row: CandidatRow) => {
    setUpdatingId(row.id);
    const result = await apiJson(`/api/admin/candidats/${row.id}`, "PUT", {
      actif: !row.actif,
    });
    setUpdatingId(null);
    if (!result.ok) {
      toast.error("Action échouée", { description: result.error });
      return;
    }
    toast.success(row.actif ? "Compte désactivé" : "Compte réactivé");
    router.refresh();
  };

  const handleDelete = async (row: CandidatRow) => {
    setUpdatingId(row.id);
    const result = await apiJson<{ success?: boolean; softDeleted?: boolean }>(
      `/api/admin/candidats/${row.id}`,
      "DELETE",
    );
    setUpdatingId(null);
    if (!result.ok) {
      toast.error("Suppression échouée", { description: result.error });
      return;
    }
    toast.success("Candidat supprimé");
    router.refresh();
  };

  const actions: ActionItem<CandidatRow>[] = React.useMemo(
    () => [
      {
        label: "Modifier",
        icon: Pencil,
        hidden: () => !canWrite,
        onClick: (row) => openEdit(row),
      },
      {
        label: (row) => (row.actif ? "Désactiver" : "Réactiver"),
        icon: Pencil,
        hidden: () => !canWrite,
        onClick: (row) => void toggleActif(row),
      },
      {
        label: "Supprimer",
        icon: Trash2,
        tone: "danger",
        hidden: () => !canWrite,
        confirm: {
          title: "Supprimer ce candidat ?",
          description: (row) => `${row.prenom} ${row.nom} sera définitivement supprimé avec l'ensemble de ses dossiers.`,
          confirmLabel: "Confirmer la suppression",
          onConfirm: handleDelete,
        },
      },
    ],
    [canWrite],
  );

  const columns: ColumnDef<CandidatRow>[] = React.useMemo(
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
      },
      {
        id: "telephone",
        accessorKey: "telephone",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Téléphone" />,
        cell: ({ row }) => <span className="text-sm text-ardoise">{row.original.telephone || "—"}</span>,
      },
      {
        id: "nationalite",
        accessorKey: "nationalite",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Nationalité" />,
        cell: ({ row }) => <span className="text-sm text-ardoise">{row.original.nationalite || "—"}</span>,
      },
      {
        id: "dossiers",
        accessorKey: "dossiers",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Dossiers" />,
        cell: ({ row }) => <span className="font-mono text-xs text-encre">{row.original.dossiers}</span>,
      },
      {
        id: "kyc",
        accessorKey: "kycVerifie",
        header: ({ column }) => <DataTableColumnHeader column={column} title="KYC" />,
        cell: ({ row }) => (
          <Badge className={cn("font-mono text-[10px] uppercase", row.original.kycVerifie ? "bg-vert/10 text-vert" : "bg-ambre/10 text-ambre")}>
            {row.original.kycVerifie ? "Vérifié" : "En attente"}
          </Badge>
        ),
      },
      {
        id: "actif",
        accessorKey: "actif",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
        cell: ({ row }) => (
          <Badge className={cn("font-mono text-[10px] uppercase", row.original.actif ? "bg-vert/10 text-vert" : "bg-carmin/10 text-carmin")}>
            {row.original.actif ? "Actif" : "Désactivé"}
          </Badge>
        ),
      },
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Inscrit le" />,
        cell: ({ row }) => <span className="font-mono text-xs text-ardoise">{formatDate(row.original.date)}</span>,
      },
      createActionsColumn<CandidatRow>(actions, { ariaLabel: (row) => `Actions pour ${row.prenom} ${row.nom}` }),
    ],
    [actions],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ardoise">{data.length} candidat(s) inscrit(s)</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open("/api/admin/export/candidats", "_blank")}>
            <Download className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open("/api/admin/export/candidats/pdf", "_blank")}>
            <FileText className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open("/api/admin/export/candidats/print", "_blank")}>
            <Printer className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Imprimer
          </Button>
          {canWrite && (
            <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-lapis text-blanc hover:bg-lapis/90" size="sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Ajouter un candidat
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg font-bold text-encre">Ajouter un candidat</DialogTitle>
                  <DialogDescription className="text-sm text-ardoise">
                    Un mot de passe temporaire sera généré — communiquez-le au candidat pour sa première connexion.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cand-prenom">Prénom</Label>
                      <Input id="cand-prenom" value={formPrenom} onChange={(e) => setFormPrenom(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cand-nom">Nom</Label>
                      <Input id="cand-nom" value={formNom} onChange={(e) => setFormNom(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cand-email">E-mail</Label>
                    <Input id="cand-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cand-tel">Téléphone</Label>
                      <Input id="cand-tel" value={formTelephone} onChange={(e) => setFormTelephone(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cand-nat">Nationalité</Label>
                      <Input id="cand-nat" value={formNationalite} onChange={(e) => setFormNationalite(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-lapis text-blanc hover:bg-lapis/90" disabled={saving}>
                      {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
                      Créer
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="candidat"
        searchPlaceholder="Rechercher un candidat…"
        pageSize={10}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-4">
            <GraduationCap className="h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
            <p className="text-sm text-ardoise">Aucun candidat inscrit.</p>
          </div>
        }
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-encre">Modifier le candidat</DialogTitle>
            <DialogDescription className="text-sm text-ardoise">
              Mettez à jour l&apos;identité, l&apos;e-mail ou le statut du compte.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-cand-prenom">Prénom</Label>
                <Input id="edit-cand-prenom" value={formPrenom} onChange={(e) => setFormPrenom(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-cand-nom">Nom</Label>
                <Input id="edit-cand-nom" value={formNom} onChange={(e) => setFormNom(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cand-email">E-mail</Label>
              <Input id="edit-cand-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-cand-tel">Téléphone</Label>
                <Input id="edit-cand-tel" value={formTelephone} onChange={(e) => setFormTelephone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-cand-nat">Nationalité</Label>
                <Input id="edit-cand-nat" value={formNationalite} onChange={(e) => setFormNationalite(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-ligne px-3 py-2.5">
              <Label htmlFor="edit-cand-actif" className="text-sm font-medium text-encre">Compte actif</Label>
              <Switch id="edit-cand-actif" checked={formActif} onCheckedChange={setFormActif} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-lapis text-blanc hover:bg-lapis/90" disabled={saving || updatingId === editing?.id}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
