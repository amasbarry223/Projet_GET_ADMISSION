"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { COULEUR_BADGE, etatParCode, type EtatCode } from "@/lib/etats";
import { formatFCFA, formatFCFACompact } from "@/lib/format";
import { motion, useReducedMotion } from "framer-motion";
import { Plane, Stamp } from "lucide-react";

type Variant = "hero" | "large" | "compact";

type Props = {
  reference: string;
  universiteNom: string;
  formationLabel: string; // ex. "Master · Droit international"
  etat: EtatCode | string;
  etapeActuelle: number;
  etapeTotal: number;
  conseiller: string;
  fraisAgence: number;
  mrz: string;
  variant?: Variant;
  animateOnMount?: boolean;
  className?: string;
};

/**
 * Carte d'embarquement « Dossier » — élément signature de GET Admission.
 * Deux blocs séparés par une ligne perforée + encoches circulaires.
 * Bande MRZ en bas (Geist Mono, fond or-pale).
 */
export function BoardingPass({
  reference,
  universiteNom,
  formationLabel,
  etat,
  etapeActuelle,
  etapeTotal,
  conseiller,
  fraisAgence,
  mrz,
  variant = "large",
  animateOnMount = false,
  className,
}: Props) {
  const reduce = useReducedMotion();
  const e = etatParCode(etat);
  const couleur = COULEUR_BADGE[e.couleur];

  const isHero = variant === "hero";
  const isCompact = variant === "compact";

  return (
    <motion.article
      initial={animateOnMount && !reduce ? { opacity: 0, y: 12 } : false}
      whileInView={animateOnMount ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative w-full overflow-hidden rounded-lg border border-ligne bg-blanc shadow-md",
        isHero && "shadow-lg",
        className
      )}
    >
      {/* Filet doré d'en-tête */}
      <div className="rule-or" aria-hidden />

      <div className={cn("grid", isCompact ? "grid-cols-[1fr_auto]" : "grid-cols-1 md:grid-cols-[1fr_220px]")}>
        {/* Bloc gauche */}
        <div className={cn("p-5", isCompact && "p-4")}>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-eyebrow text-ardoise">
            <Plane className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>GET Admission · Dossier</span>
          </div>

          <div className="mt-3">
            <p className={cn("font-display font-bold text-encre leading-tight", isCompact ? "text-base" : isHero ? "text-2xl md:text-3xl" : "text-xl")}>
              {universiteNom}
            </p>
            <p className={cn("text-ardoise mt-1", isCompact ? "text-xs" : "text-sm")}>{formationLabel}</p>
          </div>

          {!isCompact && (
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-eyebrow text-ardoise">Embarquement</p>
                <p className="mt-1 font-mono text-sm text-encre">
                  Étape {etapeActuelle} <span className="text-ardoise">/ {etapeTotal}</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-eyebrow text-ardoise">Conseiller</p>
                <p className="mt-1 text-sm text-encre">{conseiller}</p>
              </div>
            </div>
          )}
        </div>

        {/* Perforation (desktop) */}
        <div className="relative hidden md:block">
          <div className="absolute inset-y-0 left-0 w-px perforation" aria-hidden />
          <span className="absolute -left-2.5 top-0 h-5 w-5 rounded-full bg-porcelaine" aria-hidden />
          <span className="absolute -left-2.5 bottom-0 h-5 w-5 rounded-full bg-porcelaine" aria-hidden />
        </div>

        {/* Bloc droit */}
        <div className={cn("relative flex flex-col justify-between gap-4 border-t border-dashed border-ligne p-5 md:border-l md:border-t-0", isCompact && "border-l border-t-0 p-4")}>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-eyebrow text-ardoise">Statut</p>
            <StampBadge etat={etat} animate={animateOnMount} />
          </div>
          {!isCompact && (
            <div>
              <p className="text-[11px] font-mono uppercase tracking-eyebrow text-ardoise">Frais</p>
              <p className="mt-1 font-mono text-sm font-semibold text-encre">{formatFCFA(fraisAgence)}</p>
            </div>
          )}
          {isCompact && (
            <p className="font-mono text-xs text-ardoise">{formatFCFACompact(fraisAgence)}</p>
          )}
        </div>
      </div>

      {/* Bande MRZ */}
      <div className="border-t border-ligne bg-or-pale/60 px-5 py-2">
        <pre className="mrz text-[11px] leading-relaxed text-encre/80 whitespace-pre overflow-x-auto scroll-fine">{mrz}</pre>
      </div>
    </motion.article>
  );
}

export function StampBadge({ etat, animate = false }: { etat: EtatCode | string; animate?: boolean }) {
  const reduce = useReducedMotion();
  const e = etatParCode(etat);
  const couleur = COULEUR_BADGE[e.couleur];

  return (
    <motion.div
      initial={animate && !reduce ? { opacity: 0, scale: 1.6, rotate: -12 } : false}
      animate={animate ? { opacity: 1, scale: 1, rotate: -6 } : undefined}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
      className={cn(
        "mt-8 inline-flex flex-col items-center justify-center rounded-md border-2 px-3 py-1.5",
        couleur.text,
        couleur.border,
        "bg-blanc/70 backdrop-blur-[1px]",
        !animate && "rotate-[-6deg]"
      )}
      style={{ transform: animate ? undefined : "rotate(-6deg)" }}
    >
      <span className="flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-eyebrow">
        <Stamp className="h-3 w-3" strokeWidth={1.5} />
        Visa
      </span>
      <span className="mt-0.5 font-mono text-xs font-bold uppercase tracking-eyebrow">{e.libelle}</span>
    </motion.div>
  );
}
