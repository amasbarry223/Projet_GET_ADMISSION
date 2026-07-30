"use client";

import * as React from "react";
import type { ColumnDef, Table } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader, createSelectColumn, createActionsColumn, type ActionItem } from "@/components/data-table/data-table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatFCFA, formatFCFACompact } from "@/lib/format";
import { toast } from "sonner";
import { Plus, MapPin, Eye, Pencil, Trash2, GraduationCap, Info, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type FormationApi = {
  id: string;
  intitule: string;
  niveau: string;
  domaine: string;
  duree: string;
  fraisAgence: number;
};

type UniversiteApi = {
  id: string;
  slug: string;
  nom: string;
  pays: string;
  drapeau: string;
  ville: string;
  ecusson: string;
  domaines: string[];
  description: string;
  pointsForts: string[];
  imageCouleur: string;
  fraisMin: number;
  fraisMax: number;
  partenaire: boolean;
  formations: FormationApi[];
};

type Row = {
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

export default function AdminCataloguePage() {
  const [newOpen, setNewOpen] = React.useState(false);
  const [detailRow, setDetailRow] = React.useState<Row | null>(null);
  const [universites, setUniversites] = React.useState<UniversiteApi[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/universites")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: UniversiteApi[] | null) => {
        if (!d) {
          setError("Impossible de charger le catalogue.");
          setLoading(false);
          return;
        }
        setUniversites(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Erreur réseau lors du chargement du catalogue.");
        setLoading(false);
      });
  }, []);

  const data: Row[] = React.useMemo(() => {
    if (!universites) return [];
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
    if (!universites) return [];
    return Array.from(new Set(universites.map((u) => u.pays).filter(Boolean))).sort();
  }, [universites]);

  const domainesList = React.useMemo(() => {
    if (!universites) return [];
    return Array.from(new Set(universites.flatMap((u) => u.domaines ?? []).filter(Boolean))).sort();
  }, [universites]);

  const actions: ActionItem<Row>[] = React.useMemo(() => [
    {
      label: "Voir la fiche",
      icon: Eye,
      onClick: (row) => setDetailRow(row),
    },
    {
      label: "Modifier",
      icon: Pencil,
      onClick: (row) => { setDetailRow(row); toast.info("Mode édition", { description: `Fiche ${row.nom} ouverte en édition.` }); },
    },
    {
      label: "Supprimer l'université",
      icon: Trash2,
      tone: "danger",
      confirm: {
        title: "Supprimer cette université ?",
        description: (row) => `Cette action est irréversible. L'université ${row.nom} et ses ${row.formations} formation(s) seront retirées du catalogue.`,
        confirmLabel: "Supprimer",
        onConfirm: (row) => toast.success("Université supprimée", { description: `${row.nom} retirée du catalogue.` }),
      },
    },
  ], []);

  const columns: ColumnDef<Row>[] = React.useMemo(() => [
    createSelectColumn<Row>(),
    {
      id: "ecusson",
      header: () => <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Écusson</span>,
      cell: ({ row }) => {
        const u = universites?.find((x) => x.id === row.original.id);
        return (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-md font-mono text-[11px] font-bold text-blanc", `bg-gradient-to-br ${u?.imageCouleur ?? "from-lapis to-lapis-clair"}`)}>
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
      cell: ({ row }) => <span className="flex items-center gap-1.5 text-sm text-ardoise"><MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />{row.original.ville}</span>,
    },
    {
      id: "pays",
      accessorKey: "pays",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pays" />,
      cell: ({ row }) => <span className="text-sm text-encre">{row.original.pays}</span>,
      filterFn: (row, _id, value: string) => value === "tous" ? true : row.original.pays === value,
    },
    {
      id: "domaines",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Domaines" />,
      cell: ({ row }) => (
        <div className="flex max-w-[260px] flex-wrap gap-1">
          {row.original.domaines.slice(0, 3).map((d) => <Badge key={d} variant="outline" className="text-[10px] font-mono text-ardoise">{d}</Badge>)}
          {row.original.domaines.length > 3 && <Badge variant="outline" className="text-[10px] font-mono text-ardoise">+{row.original.domaines.length - 3}</Badge>}
        </div>
      ),
      enableSorting: false,
      filterFn: (row, _id, value: string) => value === "tous" ? true : row.original.domaines.includes(value),
    },
    {
      id: "formations",
      accessorKey: "formations",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Formations" />,
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 font-mono text-sm text-encre">
          <GraduationCap className="h-3.5 w-3.5 text-ardoise" strokeWidth={1.5} />{row.original.formations}
        </span>
      ),
    },
    {
      id: "frais",
      accessorFn: (row) => `${row.fraisMin}-${row.fraisMax}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Frais d'agence" />,
      cell: ({ row }) => <span className="font-mono text-xs text-encre">{formatFCFACompact(row.original.fraisMin)} – {formatFCFACompact(row.original.fraisMax)}</span>,
    },
    createActionsColumn<Row>(actions, { ariaLabel: (row) => `Actions sur ${row.nom}` }),
  ], [actions, universites]);

  const handleNew = (e: React.FormEvent) => {
    e.preventDefault();
    setNewOpen(false);
    toast.success("Université ajoutée", { description: "La nouvelle université a été ajoutée au catalogue." });
  };

  const detailUniversite = detailRow ? universites?.find((u) => u.id === detailRow.id) ?? null : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-lapis" />
      </div>
    );
  }

  if (error || !universites) {
    return (
      <Alert className="border-carmin/40 bg-carmin/5">
        <AlertTriangle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Erreur de chargement</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">{error ?? "Données indisponibles."}</AlertDescription>
      </Alert>
    );
  }

  const totalFormations = universites.reduce((acc, u) => acc + (u.formations?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Universités & formations.</h1>
          <p className="text-sm text-ardoise">{universites.length} universités · {totalFormations} formations</p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button className="bg-lapis text-blanc hover:bg-lapis/90">
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Ajouter une université
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-blanc sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-encre">Ajouter une université partenaire</DialogTitle>
              <DialogDescription className="text-sm text-ardoise">Renseignez les informations principales. Les formations seront ajoutées ensuite.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleNew} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Nom</Label>
                  <Input placeholder="Sorbonne Université" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Écusson (abr.)</Label>
                  <Input placeholder="SU" maxLength={4} className="font-mono uppercase" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Ville</Label>
                  <Input placeholder="Paris" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Pays</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {paysList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Frais min (FCFA)</Label>
                  <Input type="number" placeholder="350000" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Frais max (FCFA)</Label>
                  <Input type="number" placeholder="1750000" className="font-mono" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Annuler</Button>
                <Button type="submit" className="bg-lapis text-blanc hover:bg-lapis/90">Ajouter</Button>
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
        toolbar={(table: Table<Row>) => (
          <>
            <Select
              value={(table.getColumn("pays")?.getFilterValue() as string) ?? "tous"}
              onValueChange={(v) => table.getColumn("pays")?.setFilterValue(v)}
            >
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Pays" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les pays</SelectItem>
                {paysList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={(table.getColumn("domaines")?.getFilterValue() as string) ?? "tous"}
              onValueChange={(v) => table.getColumn("domaines")?.setFilterValue(v)}
            >
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Domaine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les domaines</SelectItem>
                {domainesList.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
      />

      <Alert className="border-ligne bg-blanc">
        <Info className="h-4 w-4 text-lapis" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Catalogue des universités partenaires</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          Chaque université peut être éditée (fiche détaillée avec formations) ou supprimée (retrait du catalogue). L'ajout d'une nouvelle université se fait via le bouton « Ajouter une université ».
        </AlertDescription>
      </Alert>

      {/* Sheet détail / édition */}
      <Sheet open={!!detailRow} onOpenChange={(open) => { if (!open) setDetailRow(null); }}>
        <SheetContent className="w-full sm:max-w-md bg-blanc overflow-y-auto">
          {detailUniversite && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-lg font-bold text-encre">{detailUniversite.nom}</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4">
                <p className="text-sm text-ardoise">{detailUniversite.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="font-mono text-[10px] uppercase text-ardoise">Ville</p><p className="text-encre">{detailUniversite.ville}</p></div>
                  <div><p className="font-mono text-[10px] uppercase text-ardoise">Pays</p><p className="text-encre">{detailUniversite.pays}</p></div>
                  <div><p className="font-mono text-[10px] uppercase text-ardoise">Frais min</p><p className="font-mono text-encre">{formatFCFA(detailUniversite.fraisMin)}</p></div>
                  <div><p className="font-mono text-[10px] uppercase text-ardoise">Frais max</p><p className="font-mono text-encre">{formatFCFA(detailUniversite.fraisMax)}</p></div>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase text-ardoise">Formations ({detailUniversite.formations?.length ?? 0})</p>
                  <ul className="mt-2 space-y-1.5">
                    {(detailUniversite.formations ?? []).map((f) => (
                      <li key={f.id} className="flex items-center justify-between rounded-md border border-ligne px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-encre">{f.intitule}</p>
                          <p className="text-xs text-ardoise">{f.niveau} · {f.domaine} · {f.duree}</p>
                        </div>
                        <span className="font-mono text-xs text-encre">{formatFCFA(f.fraisAgence)}</span>
                      </li>
                    ))}
                    {(detailUniversite.formations?.length ?? 0) === 0 && (
                      <li className="rounded-md border border-ligne px-3 py-2 text-sm text-ardoise">Aucune formation enregistrée.</li>
                    )}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-lapis text-blanc hover:bg-lapis/90" onClick={() => toast.success("Modifications enregistrées", { description: detailUniversite.nom })}>Enregistrer</Button>
                  <Button variant="outline" className="border-carmin/40 text-carmin hover:bg-carmin/5" onClick={() => { setDetailRow(null); toast.success("Université supprimée", { description: `${detailUniversite.nom} retirée du catalogue.` }); }}>
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
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
