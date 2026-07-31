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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { formatFCFA, formatFCFACompact } from "@/lib/format";
import { toast } from "sonner";
import { Plus, MapPin, Eye, Pencil, Trash2, GraduationCap, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { normalizeUniversite } from "@/lib/types";

export type UniversiteNormalized = ReturnType<typeof normalizeUniversite>;

export type CatalogueRow = {
  id: string;
  nom: string;
  ecusson: string;
  drapeau: string;
  ville: string;
  pays: string;
  domaines: string[];
  formations: number;
  fraisMin: number;
  fraisMax: number;
};

export function CatalogueClient({ initialData }: { initialData: UniversiteNormalized[] }) {
  const router = useRouter();
  const [newOpen, setNewOpen] = React.useState(false);
  const [detailRow, setDetailRow] = React.useState<CatalogueRow | null>(null);
  // On lit directement la prop `initialData` (pas de useState) afin que
  // `router.refresh()` (re-render du Server Component) se reflète dans l'UI.
  const universites = initialData;

  // État du formulaire d'ajout
  const [formNom, setFormNom] = React.useState("");
  const [formEcusson, setFormEcusson] = React.useState("");
  const [formVille, setFormVille] = React.useState("");
  const [formPays, setFormPays] = React.useState("");
  const [formFraisMin, setFormFraisMin] = React.useState("");
  const [formFraisMax, setFormFraisMax] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [editSiteUrl, setEditSiteUrl] = React.useState("");
  const [editCoverUrl, setEditCoverUrl] = React.useState("");
  const [editLogoUrl, setEditLogoUrl] = React.useState("");
  const [editGallery, setEditGallery] = React.useState("");

  React.useEffect(() => {
    if (!detailRow) return;
    const u = universites.find((x) => x.id === detailRow.id);
    if (!u) return;
    setEditSiteUrl(u.siteUrl ?? "");
    setEditCoverUrl(u.coverUrl ?? "");
    setEditLogoUrl(u.logoUrl ?? "");
    setEditGallery((u.galleryUrls ?? []).join("\n"));
  }, [detailRow, universites]);

  const resetForm = () => {
    setFormNom("");
    setFormEcusson("");
    setFormVille("");
    setFormPays("");
    setFormFraisMin("");
    setFormFraisMax("");
  };

  const data: CatalogueRow[] = React.useMemo(() => {
    return universites.map((u) => ({
      id: u.id,
      nom: u.nom,
      ecusson: u.ecusson,
      drapeau: u.drapeau,
      ville: u.ville,
      pays: u.pays,
      domaines: u.domaines ?? [],
      formations: u.formations?.length ?? 0,
      fraisMin: u.fraisMin,
      fraisMax: u.fraisMax,
    }));
  }, [universites]);

  const paysList = React.useMemo(() => {
    return Array.from(new Set(universites.map((u) => u.pays).filter(Boolean))).sort();
  }, [universites]);

  const domainesList = React.useMemo(() => {
    return Array.from(new Set(universites.flatMap((u) => u.domaines ?? []).filter(Boolean))).sort();
  }, [universites]);

  const actions: ActionItem<CatalogueRow>[] = React.useMemo(
    () => [
      {
        label: "Voir la fiche",
        icon: Eye,
        onClick: (row) => setDetailRow(row),
      },
      {
        label: "Modifier",
        icon: Pencil,
        onClick: (row) => {
          setDetailRow(row);
          toast.info("Mode édition", { description: `Fiche ${row.nom} ouverte en édition.` });
        },
      },
      {
        label: "Supprimer l'université",
        icon: Trash2,
        tone: "danger",
        confirm: {
          title: "Supprimer cette université ?",
          description: (row) =>
            `Cette action est irréversible. L'université ${row.nom} et ses ${row.formations} formation(s) seront retirées du catalogue.`,
          confirmLabel: "Supprimer",
          onConfirm: (row) => handleDelete(row.id, row.nom),
        },
      },
    ],
    []
  );

  const columns: ColumnDef<CatalogueRow>[] = React.useMemo(
    () => [
      createSelectColumn<CatalogueRow>(),
      {
        id: "ecusson",
        header: () => (
          <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Écusson</span>
        ),
        cell: ({ row }) => {
          const u = universites?.find((x) => x.id === row.original.id);
          return (
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md font-mono text-[11px] font-bold text-blanc",
                `bg-gradient-to-br ${u?.imageCouleur ?? "from-lapis to-lapis-clair"}`
              )}
            >
              {row.original.ecusson}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "nom",
        accessorKey: "nom",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Université" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-base">{row.original.drapeau}</span>
            <span className="text-sm font-medium text-encre">{row.original.nom}</span>
          </div>
        ),
      },
      {
        id: "ville",
        accessorKey: "ville",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ville" />,
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-sm text-ardoise">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
            {row.original.ville}
          </span>
        ),
      },
      {
        id: "pays",
        accessorKey: "pays",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Pays" />,
        cell: ({ row }) => <span className="text-sm text-encre">{row.original.pays}</span>,
        filterFn: (row, _id, value: string) => (value === "tous" ? true : row.original.pays === value),
      },
      {
        id: "domaines",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Domaines" />,
        cell: ({ row }) => (
          <div className="flex max-w-[260px] flex-wrap gap-1">
            {row.original.domaines.slice(0, 3).map((d) => (
              <Badge key={d} variant="outline" className="text-[10px] font-mono text-ardoise">
                {d}
              </Badge>
            ))}
            {row.original.domaines.length > 3 && (
              <Badge variant="outline" className="text-[10px] font-mono text-ardoise">
                +{row.original.domaines.length - 3}
              </Badge>
            )}
          </div>
        ),
        enableSorting: false,
        filterFn: (row, _id, value: string) => (value === "tous" ? true : row.original.domaines.includes(value)),
      },
      {
        id: "formations",
        accessorKey: "formations",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Formations" />,
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 font-mono text-sm text-encre">
            <GraduationCap className="h-3.5 w-3.5 text-ardoise" strokeWidth={1.5} />
            {row.original.formations}
          </span>
        ),
      },
      {
        id: "frais",
        accessorFn: (row) => `${row.fraisMin}-${row.fraisMax}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Frais d'agence" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-encre">
            {formatFCFACompact(row.original.fraisMin)} – {formatFCFACompact(row.original.fraisMax)}
          </span>
        ),
      },
      createActionsColumn<CatalogueRow>(actions, { ariaLabel: (row) => `Actions sur ${row.nom}` }),
    ],
    [actions, universites]
  );

  const handleNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/universites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: formNom,
          pays: formPays,
          drapeau: "",
          ville: formVille,
          ecusson: formEcusson,
          domaines: [],
          description: "",
          pointsForts: [],
          imageCouleur: "",
          fraisMin: Number(formFraisMin) || 0,
          fraisMax: Number(formFraisMax) || 0,
          partenaire: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Ajout échoué", { description: (err as any)?.error ?? "Erreur serveur." });
        return;
      }
      toast.success("Université ajoutée", {
        description: `${formNom} a été ajoutée au catalogue.`,
      });
      setNewOpen(false);
      resetForm();
      router.refresh();
    } catch {
      toast.error("Ajout échoué", { description: "Erreur réseau." });
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!detailUniversite) return;
    setSaving(true);
    try {
      const u = detailUniversite;
      const res = await fetch(`/api/universites/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: u.nom,
          pays: u.pays,
          drapeau: u.drapeau ?? "",
          ville: u.ville,
          ecusson: u.ecusson ?? "",
          domaines: u.domaines ?? [],
          description: u.description ?? "",
          pointsForts: u.pointsForts ?? [],
          imageCouleur: u.imageCouleur ?? "",
          siteUrl: editSiteUrl.trim() || "",
          coverUrl: editCoverUrl.trim() || null,
          logoUrl: editLogoUrl.trim() || null,
          galleryUrls: editGallery
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          fraisMin: u.fraisMin,
          fraisMax: u.fraisMax,
          partenaire: u.partenaire,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Enregistrement échoué", { description: (err as any)?.error ?? "Erreur serveur." });
        return;
      }
      toast.success("Modifications enregistrées", { description: u.nom });
      router.refresh();
    } catch {
      toast.error("Enregistrement échoué", { description: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nom: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/universites/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Suppression échouée", { description: (err as any)?.error ?? "Erreur serveur." });
        return;
      }
      toast.success("Université supprimée", { description: `${nom} retirée du catalogue.` });
      setDetailRow(null);
      router.refresh();
    } catch {
      toast.error("Suppression échouée", { description: "Erreur réseau." });
    } finally {
      setDeleting(false);
    }
  };

  const detailUniversite = detailRow ? universites?.find((u) => u.id === detailRow.id) ?? null : null;

  const totalFormations = universites.reduce((acc, u) => acc + (u.formations?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
            Universités &amp; formations.
          </h1>
          <p className="text-sm text-ardoise">
            {universites.length} universités · {totalFormations} formations
          </p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button className="bg-lapis text-blanc hover:bg-lapis/90">
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Ajouter une université
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-blanc sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-encre">
                Ajouter une université partenaire
              </DialogTitle>
              <DialogDescription className="text-sm text-ardoise">
                Renseignez les informations principales. Les formations seront ajoutées ensuite.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleNew} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Nom</Label>
                  <Input
                    value={formNom}
                    onChange={(e) => setFormNom(e.target.value)}
                    placeholder="Sorbonne Université"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Écusson (abr.)</Label>
                  <Input
                    value={formEcusson}
                    onChange={(e) => setFormEcusson(e.target.value)}
                    placeholder="SU"
                    maxLength={4}
                    className="font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Ville</Label>
                  <Input
                    value={formVille}
                    onChange={(e) => setFormVille(e.target.value)}
                    placeholder="Paris"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Pays</Label>
                  <Select value={formPays} onValueChange={setFormPays}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {paysList.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Frais min (FCFA)</Label>
                  <Input
                    type="number"
                    value={formFraisMin}
                    onChange={(e) => setFormFraisMin(e.target.value)}
                    placeholder="350000"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Frais max (FCFA)</Label>
                  <Input
                    type="number"
                    value={formFraisMax}
                    onChange={(e) => setFormFraisMax(e.target.value)}
                    placeholder="1750000"
                    className="font-mono"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNewOpen(false)} disabled={creating}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-lapis text-blanc hover:bg-lapis/90" disabled={creating}>
                  {creating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
                  Ajouter
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
        searchPlaceholder="Rechercher par nom…"
        pageSize={8}
        toolbar={(table: Table<CatalogueRow>) => (
          <>
            <Select
              value={(table.getColumn("pays")?.getFilterValue() as string) ?? "tous"}
              onValueChange={(v) => table.getColumn("pays")?.setFilterValue(v)}
            >
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Pays" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les pays</SelectItem>
                {paysList.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={(table.getColumn("domaines")?.getFilterValue() as string) ?? "tous"}
              onValueChange={(v) => table.getColumn("domaines")?.setFilterValue(v)}
            >
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Domaine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les domaines</SelectItem>
                {domainesList.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      />

      <Alert className="border-ligne bg-blanc">
        <Info className="h-4 w-4 text-lapis" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">
          Catalogue des universités partenaires
        </AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          Chaque université peut être éditée (fiche détaillée avec formations) ou supprimée (retrait du
          catalogue). L'ajout d'une nouvelle université se fait via le bouton « Ajouter une université ».
        </AlertDescription>
      </Alert>

      {/* Sheet détail / édition */}
      <Sheet open={!!detailRow} onOpenChange={(open) => { if (!open) setDetailRow(null); }}>
        <SheetContent className="w-full sm:max-w-md bg-blanc overflow-y-auto">
          {detailUniversite && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-lg font-bold text-encre">
                  {detailUniversite.nom}
                </SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4">
                <p className="text-sm text-ardoise">{detailUniversite.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-mono text-[10px] uppercase text-ardoise">Ville</p>
                    <p className="text-encre">{detailUniversite.ville}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase text-ardoise">Pays</p>
                    <p className="text-encre">{detailUniversite.pays}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase text-ardoise">Frais min</p>
                    <p className="font-mono text-encre">{formatFCFA(detailUniversite.fraisMin)}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase text-ardoise">Frais max</p>
                    <p className="font-mono text-encre">{formatFCFA(detailUniversite.fraisMax)}</p>
                  </div>
                </div>

                <div className="space-y-3 border-t border-ligne pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-eyebrow text-or">Médias Le Passage</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="siteUrl" className="text-xs text-ardoise">Site officiel</Label>
                    <Input
                      id="siteUrl"
                      value={editSiteUrl}
                      onChange={(e) => setEditSiteUrl(e.target.value)}
                      placeholder="https://"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="coverUrl" className="text-xs text-ardoise">Cover URL</Label>
                    <Input
                      id="coverUrl"
                      value={editCoverUrl}
                      onChange={(e) => setEditCoverUrl(e.target.value)}
                      placeholder="/images/partenaires/.../cover.webp"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="logoUrl" className="text-xs text-ardoise">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      value={editLogoUrl}
                      onChange={(e) => setEditLogoUrl(e.target.value)}
                      placeholder="/images/partenaires/.../logo.png"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gallery" className="text-xs text-ardoise">Galerie (1 chemin / ligne)</Label>
                    <textarea
                      id="gallery"
                      value={editGallery}
                      onChange={(e) => setEditGallery(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-ligne bg-blanc px-3 py-2 font-mono text-xs text-encre"
                      placeholder="/images/.../gallery-1.webp"
                    />
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase text-ardoise">
                    Formations ({detailUniversite.formations?.length ?? 0})
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {(detailUniversite.formations ?? []).map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between rounded-md border border-ligne px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-encre">{f.intitule}</p>
                          <p className="text-xs text-ardoise">
                            {f.niveau} · {f.domaine} · {f.duree}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-encre">{formatFCFA(f.fraisAgence)}</span>
                      </li>
                    ))}
                    {(detailUniversite.formations?.length ?? 0) === 0 && (
                      <li className="rounded-md border border-ligne px-3 py-2 text-sm text-ardoise">
                        Aucune formation enregistrée.
                      </li>
                    )}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-lapis text-blanc hover:bg-lapis/90"
                    onClick={handleSave}
                    disabled={saving || deleting}
                  >
                    {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
                    Enregistrer
                  </Button>
                  <Button
                    variant="outline"
                    className="border-carmin/40 text-carmin hover:bg-carmin/5"
                    onClick={() => handleDelete(detailUniversite.id, detailUniversite.nom)}
                    disabled={saving || deleting}
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Trash2 className="h-4 w-4" strokeWidth={1.5} />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
