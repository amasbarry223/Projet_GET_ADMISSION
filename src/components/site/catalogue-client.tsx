"use client";

import * as React from "react";
import { Search, SlidersHorizontal, RotateCcw, Inbox } from "lucide-react";

import { UniversiteCard } from "@/components/site/universite-card";
import { Eyebrow, RevealStagger, RevealItem } from "@/components/site/reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ----------------------------- Types locaux ----------------------------- */
// Conformes à la forme attendue par <UniversiteCard />.
// Définis localement (aucune dépendance mock).

export type Niveau = string;

export type CatalogueFormation = {
  id: string;
  universiteId: string;
  intitule: string;
  niveau: string;
  domaine: string;
  duree: string;
  fraisAgence: number;
  prerequis: string[];
  piecesRequises: string[];
};

export type CatalogueUniversite = {
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
  partenaires: boolean;
  typeEtablissement?: "PUBLIC" | "PRIVE" | string;
  coverUrl?: string | null;
  logoUrl?: string | null;
  siteUrl?: string | null;
  formations: CatalogueFormation[];
};

/* ------------------------------- Constantes ------------------------------ */

type Tri = "nom" | "frais_asc" | "frais_desc";

const TRIS: { value: Tri; label: string }[] = [
  { value: "nom", label: "Nom (A → Z)" },
  { value: "frais_asc", label: "Frais croissants" },
  { value: "frais_desc", label: "Frais décroissants" },
];

const NIVEAUX_PRESETS = ["Licence", "Master", "Doctorat"] as const;

const PAGE_SIZE = 8;

/** Normalise pour une recherche insensible aux accents/majuscules ("École" ~ "ecole"). */
function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/* -------------------------------- Component ------------------------------- */

type Props = {
  universites: CatalogueUniversite[];
};

export function CatalogueClient({ universites }: Props) {
  const [recherche, setRecherche] = React.useState("");
  const [pays, setPays] = React.useState<string>("tous");
  const [domaine, setDomaine] = React.useState<string>("tous");
  const [niveau, setNiveau] = React.useState<string>("tous");
  const [typeEtab, setTypeEtab] = React.useState<string>("tous");
  const [tri, setTri] = React.useState<Tri>("nom");
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

  // Listes dérivées des données (PAYS_LIST / DOMAINES_LIST viennent de la DB)
  const paysList = React.useMemo(
    () =>
      Array.from(new Set(universites.map((u) => u.pays))).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    [universites]
  );
  const domainesList = React.useMemo(
    () =>
      Array.from(new Set(universites.flatMap((u) => u.domaines))).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    [universites]
  );
  const niveauxList = React.useMemo(() => {
    const fromData = universites.flatMap((u) => u.formations.map((f) => f.niveau)).filter(Boolean);
    return Array.from(new Set<string>([...NIVEAUX_PRESETS, ...fromData])).sort((a, b) =>
      a.localeCompare(b, "fr"),
    );
  }, [universites]);

  // Réinitialise le "charger plus" à chaque changement de filtre (ajustement pendant le render).
  const filterKey = `${recherche}|${pays}|${domaine}|${niveau}|${typeEtab}|${tri}`;
  const [prevFilterKey, setPrevFilterKey] = React.useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  // Pour chaque université, calculer les niveaux effectivement disponibles (via formations).
  const niveauxParUniversite = React.useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const u of universites) map.set(u.id, new Set());
    for (const u of universites) {
      for (const f of u.formations) {
        const set = map.get(u.id);
        if (set) set.add(f.niveau);
      }
    }
    return map;
  }, [universites]);

  const resultat = React.useMemo(() => {
    const q = normalizeSearch(recherche.trim());
    const liste = universites.filter((u) => {
      if (pays !== "tous" && u.pays !== pays) return false;
      if (domaine !== "tous" && !u.domaines.includes(domaine)) return false;
      if (typeEtab !== "tous" && (u.typeEtablissement ?? "PRIVE") !== typeEtab) return false;
      if (niveau !== "tous") {
        const nv = niveauxParUniversite.get(u.id);
        if (!nv || !nv.has(niveau)) return false;
      }
      if (q) {
        const formationsHay = u.formations.map((f) => `${f.intitule} ${f.domaine} ${f.niveau}`).join(" ");
        const hay = normalizeSearch(
          `${u.nom} ${u.ville} ${u.pays} ${u.domaines.join(" ")} ${formationsHay}`,
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...liste].sort((a, b) => {
      if (tri === "nom") return a.nom.localeCompare(b.nom, "fr");
      if (tri === "frais_asc") return a.fraisMin - b.fraisMin;
      if (tri === "frais_desc") return b.fraisMax - a.fraisMax;
      return 0;
    });
  }, [recherche, pays, domaine, niveau, typeEtab, tri, niveauxParUniversite, universites]);

  const visible = resultat.slice(0, visibleCount);
  const hasMore = visibleCount < resultat.length;

  const resetFiltres = () => {
    setRecherche("");
    setPays("tous");
    setDomaine("tous");
    setNiveau("tous");
    setTypeEtab("tous");
    setTri("nom");
  };

  const filtresActifs =
    recherche.trim() !== "" ||
    pays !== "tous" ||
    domaine !== "tous" ||
    niveau !== "tous" ||
    typeEtab !== "tous" ||
    tri !== "nom";

  return (
    <>
      {/* En-tête */}
      <section className="bg-background" aria-labelledby="catalogue-title">
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8">
          <Eyebrow>Catalogue</Eyebrow>
          <h1
            id="catalogue-title"
            className="mt-5 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl"
          >
            Universités partenaires
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Universités vérifiées sur plusieurs destinations. Filtrez par pays, domaine ou
            niveau d&rsquo;études pour trouver votre formation.
          </p>
          <p className="mt-6 font-mono text-[12px] uppercase tracking-eyebrow text-muted-foreground">
            {resultat.length} université{resultat.length > 1 ? "s" : ""} trouvée
            {resultat.length > 1 ? "s" : ""}
          </p>
        </div>
      </section>

      <div className="sticky top-[4.5rem] z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto max-w-content px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Rechercher par nom, ville, domaine, formation…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="border-border bg-card/60 pl-9"
                aria-label="Recherche d'une université"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center">
              <Select value={pays} onValueChange={setPays}>
                <SelectTrigger className="w-full border-border bg-card/60 lg:w-[160px]" aria-label="Filtrer par pays">
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

              <Select value={domaine} onValueChange={setDomaine}>
                <SelectTrigger className="w-full border-border bg-card/60 lg:w-[170px]" aria-label="Filtrer par domaine">
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

              <Select value={niveau} onValueChange={setNiveau}>
                <SelectTrigger className="w-full border-border bg-card/60 lg:w-[150px]" aria-label="Filtrer par niveau">
                  <SelectValue placeholder="Niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les niveaux</SelectItem>
                  {niveauxList.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeEtab} onValueChange={setTypeEtab}>
                <SelectTrigger className="w-full border-border bg-card/60 lg:w-[160px]" aria-label="Filtrer par type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Public & privé</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVE">Privé</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tri} onValueChange={(v) => setTri(v as Tri)}>
                <SelectTrigger className="w-full border-border bg-card/60 lg:w-[180px]" aria-label="Trier">
                  <SlidersHorizontal className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
                  <SelectValue placeholder="Trier" />
                </SelectTrigger>
                <SelectContent>
                  {TRIS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtresActifs && (
            <div className="mt-3 flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFiltres}
                className="h-7 text-muted-foreground hover:text-primary"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>
      </div>

      <section className="bg-background" aria-label="Résultats">
        <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
          {visible.length === 0 ? (
            <div className="glass-card mx-auto flex max-w-md flex-col items-center rounded-xl p-12 text-center shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Inbox className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <h2 className="mt-5 font-display text-xl font-bold text-foreground">
                Aucune université ne correspond à ces filtres.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Élargissez votre recherche ou réinitialisez les critères pour retrouver l&rsquo;ensemble
                du catalogue.
              </p>
              <Button
                onClick={resetFiltres}
                className="mt-6 bg-primary text-primary-foreground hover:bg-or"
              >
                <RotateCcw className="mr-1 h-4 w-4" strokeWidth={1.75} />
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <>
              <RevealStagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((u) => (
                  <RevealItem key={u.id}>
                    <UniversiteCard universite={u} className="h-full" />
                  </RevealItem>
                ))}
              </RevealStagger>

              {hasMore && (
                <div className="mt-12 flex justify-center">
                  <Button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    size="lg"
                    variant="outline"
                    className="border-border bg-card/60 text-foreground hover:bg-muted"
                  >
                    Charger plus d&rsquo;universités
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
