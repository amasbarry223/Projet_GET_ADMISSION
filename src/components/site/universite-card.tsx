"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatFCFACompact } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

/** Type local pour la carte université (compatible DB et API). */
export type UniversiteCardData = {
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
  coverUrl?: string | null;
  logoUrl?: string | null;
  siteUrl?: string | null;
};

type Props = {
  universite: UniversiteCardData;
  className?: string;
  showFooter?: boolean;
};

/**
 * Carte université — cover + logo, hover scale + ombre or.
 */
export function UniversiteCard({ universite, className, showFooter = true }: Props) {
  const domainesVisibles = universite.domaines.slice(0, 3);
  const restant = universite.domaines.length - domainesVisibles.length;
  const reduce = useReducedMotion();

  const inner = (
    <Link
      href={`/universites/${universite.slug}`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border border-ligne bg-blanc shadow-sm transition-shadow duration-300",
        "hover:shadow-[0_12px_36px_rgba(60,169,54,0.28)]",
        className
      )}
    >
      <div
        className={cn(
          "relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br",
          universite.imageCouleur
        )}
        aria-hidden
      >
        {universite.coverUrl ? (
          <Image
            src={universite.coverUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:768px) 100vw, 33vw"
            loading="lazy"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-encre/40 to-transparent" />
        <span className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-blanc bg-blanc/95 shadow-md">
          {universite.logoUrl ? (
            <Image
              src={universite.logoUrl}
              alt=""
              width={56}
              height={56}
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-mono text-sm font-bold tracking-tight text-lapis">
              {universite.ecusson}
            </span>
          )}
        </span>
        <span className="absolute right-3 top-3 z-10 text-2xl">{universite.drapeau}</span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-bold leading-tight text-encre">
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-base">
                {universite.drapeau}
              </span>
              <span className="line-clamp-2">{universite.nom}</span>
            </span>
          </h3>
          <p className="mt-1 text-sm text-ardoise">
            {universite.ville}, {universite.pays}
          </p>
        </div>

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
                Frais d&apos;agence
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-encre">
                {formatFCFACompact(universite.fraisMin)} –{" "}
                {formatFCFACompact(universite.fraisMax)}
              </p>
            </div>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ligne text-ardoise transition-colors group-hover:border-or group-hover:text-or"
              aria-hidden
            >
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </div>
        )}
      </div>
    </Link>
  );

  if (reduce) return inner;

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 380, damping: 28 }}>
      {inner}
    </motion.div>
  );
}
