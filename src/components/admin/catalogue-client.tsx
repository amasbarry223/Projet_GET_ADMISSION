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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { formatFCFA, formatFCFACompact } from "@/lib/format";
import { apiJson } from "@/lib/api-client";
import { resolveFraisAgence } from "@/lib/dossier/frais-agence";
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
  typeEtablissement?: "PUBLIC" | "PRIVE";
};

export function CatalogueClient({ initialData }: { initialData: UniversiteNormalized[] }) {
  const router = useRouter();
  const [newOpen, setNewOpen] = React.useState(false);
  // On lit directement la prop `initialData` (pas de useState) afin que
  // `router.refresh()` (re-render du Server Component) se reflète dans l'UI.
  const universites = initialData;

  // État du formulaire d'ajout
  const [formNom, setFormNom] = React.useState("");
  const [formEcusson, setFormEcusson] = React.useState("");
  const [formVille, setFormVille] = React.useState("");
  const [formPays, setFormPays] = React.useState("");
  const [formType, setFormType] = React.useState<"PUBLIC" | "PRIVE">("PRIVE");
  const [creating, setCreating] = React.useState(false);

  const resetForm = () => {
    setFormNom("");
    setFormEcusson("");
    setFormVille("");
    setFormPays("");
    setFormType("PRIVE");
  };

  const data: CatalogueRow[] = React.useMemo(() => {
    return universites.map((u) => {
      const typeEtablissement = (u as { typeEtablissement?: "PUBLIC" | "PRIVE" })
        .typeEtablissement;
      return {
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
        ...(typeEtablissement !== undefined ? { typeEtablissement } : {}),
      };
    });
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
        onClick: (row) => router.push(`/admin/catalogue/${row.id}`),
      },
      {
        label: "Modifier",
        icon: Pencil,
        onClick: (row) => router.push(`/admin/catalogue/${row.id}`),
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
     
    [router],
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
          <div className="space-y-0.5">
            <span className="font-mono text-xs text-encre">
              {formatFCFACompact(row.original.fraisMin)} – {formatFCFACompact(row.original.fraisMax)}
            </span>
            <p className="font-mono text-[10px] uppercase text-ardoise">
              {row.original.typeEtablissement === "PUBLIC" ? "Public" : "Privé"}
            </p>
          </div>
        ),
      },
      createActionsColumn<CatalogueRow>(actions, { ariaLabel: (row) => `Actions sur ${row.nom}` }),
    ],
    [actions, universites]
  );

  const handleNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    // fraisMin/fraisMax ne sont pas envoyés : le serveur les calcule toujours
    // depuis typeEtablissement + barème agence (voir /api/universites POST).
    const result = await apiJson("/api/universites", "POST", {
      nom: formNom,
      pays: formPays,
      drapeau: "",
      ville: formVille,
      ecusson: formEcusson,
      domaines: [],
      description: "",
      pointsForts: [],
      imageCouleur: "",
      typeEtablissement: formType,
      partenaire: true,
    });
    setCreating(false);
    if (!result.ok) {
      toast.error("Ajout échoué", { description: result.error });
      return;
    }
    toast.success("Université ajoutée", { description: `${formNom} a été ajoutée au catalogue.` });
    setNewOpen(false);
    resetForm();
    router.refresh();
  };

  const handleDelete = async (id: string, nom: string) => {
    const result = await apiJson(`/api/universites/${id}`, "DELETE");
    if (!result.ok) {
      toast.error("Suppression échouée", { description: result.error });
      return;
    }
    toast.success("Université supprimée", { description: `${nom} retirée du catalogue.` });
    router.refresh();
  };

  const totalFormations = universites.reduce((acc, u) => acc + (u.formations?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
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
          <DialogContent className="bg-card sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-encre">
                Ajouter une université partenaire
              </DialogTitle>
              <DialogDescription className="text-sm text-ardoise">
                Renseignez les informations principales. Les formations seront ajoutées ensuite.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleNew} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-sm font-medium text-encre">Type d&apos;établissement</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as "PUBLIC" | "PRIVE")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="PRIVE">Privé</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-ardoise">
                    Public ou privé sert seulement à fixer les frais d&apos;agence GET Admission.
                    Ce n&apos;est pas le prix de l&apos;école.
                  </p>
                  <div className="rounded-xl border border-ligne bg-porcelaine/60 px-3 py-2.5">
                    <p className="text-xs font-medium text-encre">Frais d&apos;agence GET Admission</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-encre">
                      {formatFCFA(resolveFraisAgence(formType))}
                    </p>
                  </div>
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
        emptyState={
          <div className="flex flex-col items-center gap-3 py-2">
            <GraduationCap className="h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
            <p className="text-sm font-medium text-encre">Aucune université</p>
            <p className="text-xs text-ardoise">Aucun établissement ne correspond à ces filtres.</p>
          </div>
        }
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

      <Alert className="border-ligne bg-card">
        <Info className="h-4 w-4 text-lapis" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">
          Catalogue des universités partenaires
        </AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          Ouvrez une fiche pour éditer les médias, frais et formations. L&apos;ajout se fait via « Ajouter
          une université ».
        </AlertDescription>
      </Alert>
    </div>
  );
}
