import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFCFACompact } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

/** Type local pour la carte université (compatible DB et API). */
type Universite = {
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
  partenaire?: boolean;
};

type Props = {
  universite: Universite;
  className?: string;
  /** Afficher la flèche "voir" en bas (catalogue) — par défaut true */
  showFooter?: boolean;
};

/**
 * Carte université — utilisée sur l'accueil (vedettes) et le catalogue.
 * Tuile hautaine, lapis/blanc, ecusson dans un cercle blanc, frais en mono.
 */
export function UniversiteCard({ universite, className, showFooter = true }: Props) {
  const domainesVisibles = universite.domaines.slice(0, 3);
  const restant = universite.domaines.length - domainesVisibles.length;

  return (
    <Link
      href={`/universites/${universite.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-ligne bg-blanc shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none",
        className
      )}
    >
      {/* Bandeau gradient avec ecusson */}
      <div
        className={cn(
          "relative flex h-32 items-center justify-center bg-gradient-to-br",
          universite.imageCouleur
        )}
        aria-hidden
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blanc/95 shadow-sm">
          <span className="font-mono text-sm font-bold tracking-tight text-lapis">
            {universite.ecusson}
          </span>
        </span>
        <span className="absolute right-3 top-3 text-2xl" aria-hidden>
          {universite.drapeau}
        </span>
      </div>

      {/* Corps */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-bold leading-tight text-encre">
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-base">
                {universite.drapeau}
              </span>
              <span>{universite.nom}</span>
            </span>
          </h3>
          <p className="mt-1 text-sm text-ardoise">
            {universite.ville}, {universite.pays}
          </p>
        </div>

        {/* Domaines */}
        <div className="flex flex-wrap gap-1.5">
          {domainesVisibles.map((d) => (
            <Badge
              key={d}
              variant="secondary"
              className="bg-porcelaine font-mono text-[11px] font-medium text-ardoise"
            >
              {d}
            </Badge>
          ))}
          {restant > 0 && (
            <Badge
              variant="secondary"
              className="bg-porcelaine font-mono text-[11px] font-medium text-ardoise"
            >
              +{restant}
            </Badge>
          )}
        </div>

        {showFooter && (
          <div className="mt-auto flex items-end justify-between border-t border-ligne pt-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                Frais d'agence
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-encre">
                {formatFCFACompact(universite.fraisMin)} – {formatFCFACompact(universite.fraisMax)}
              </p>
            </div>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ligne text-ardoise transition-colors group-hover:border-lapis group-hover:text-lapis"
              aria-hidden
            >
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
