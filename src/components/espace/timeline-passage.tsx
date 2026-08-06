"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, CircleDot, Lock, X } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Etat = {
  code: string;
  ordre: number;
  libelle: string;
  description: string;
  categorie?: "brouillon" | "attente" | "valide" | "refuse";
};

type Props = {
  etats: Etat[];
  etapeActuelle: number;
  dateParEtat: Map<string, string> | Record<string, string>;
  /** Note de la dernière transition vers l’étape courante */
  noteCourante?: string | null;
  live?: boolean;
};

function datesMap(
  dateParEtat: Map<string, string> | Record<string, string>,
): Map<string, string> {
  return dateParEtat instanceof Map
    ? dateParEtat
    : new Map(Object.entries(dateParEtat));
}

export function TimelinePassage({
  etats,
  etapeActuelle,
  dateParEtat,
  noteCourante,
  live = false,
}: Props) {
  const reduce = useReducedMotion();
  const dates = datesMap(dateParEtat);
  const current = etats.find((e) => e.ordre === etapeActuelle) ?? etats[0];
  const isRefuse = current?.code === "refuse" || current?.categorie === "refuse";
  const progressPct = Math.min(100, Math.max(0, ((etapeActuelle - 1) / 11) * 100));

  const listRef = React.useRef<HTMLOListElement>(null);

  React.useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector<HTMLElement>("[data-current='true']");
    active?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [etapeActuelle, reduce]);

  return (
    <div className="space-y-5">
      {/* Rail de progression — boarding pass */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-primary/[0.03] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/80">
              Embarquement dossier
            </p>
            <AnimatePresence mode="wait">
              <motion.h3
                key={current?.code}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                {...(!reduce ? { exit: { opacity: 0, y: -6 } } : {})}
                transition={{ duration: 0.28 }}
                className="mt-1 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl"
              >
                {current?.libelle}
              </motion.h3>
            </AnimatePresence>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {noteCourante?.trim() || current?.description}
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full bg-primary",
                  live && "animate-pulse",
                )}
              />
              <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                {live ? "Live" : "Sync"} · {String(etapeActuelle).padStart(2, "0")}/12
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative h-2 overflow-hidden rounded-full bg-border/70">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/80 to-primary"
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>Départ</span>
            <span>Attestation</span>
          </div>
        </div>
      </div>

      {/* Liste des 12 étapes */}
      <ol ref={listRef} className="relative space-y-0">
        <span
          className="absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/50 via-border to-border"
          aria-hidden
        />
        {etats.map((etat, index) => {
          const isPast = etat.ordre < etapeActuelle;
          const isCurrent = etat.ordre === etapeActuelle;
          const skipped =
            isRefuse && etat.ordre > etapeActuelle && etat.code !== "refuse";
          const isFuture = etat.ordre > etapeActuelle && !skipped;
          const date = dates.get(etat.code.toLowerCase()) ?? dates.get(etat.code);
          const isTerminalRefuse = etat.code === "refuse" && isCurrent;
          const isTerminalCloture = etat.code === "cloture" && isCurrent;

          return (
            <motion.li
              key={etat.code}
              data-timeline-item
              data-current={isCurrent ? "true" : undefined}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduce ? 0 : Math.min(index * 0.03, 0.35), duration: 0.35 }}
              className={cn(
                "relative flex gap-4 py-2.5 pl-0",
                isCurrent && "rounded-xl bg-primary/[0.06] px-2 -mx-2 sm:px-3 sm:-mx-3",
              )}
            >
              <span
                className={cn(
                  "relative z-10 mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-full border-2 text-xs font-semibold shadow-sm transition-colors",
                  isPast && "border-primary bg-primary text-primary-foreground",
                  isCurrent &&
                    !isTerminalRefuse &&
                    "border-primary bg-card text-primary ring-4 ring-primary/15",
                  isTerminalRefuse && "border-destructive bg-destructive text-destructive-foreground",
                  isFuture && "border-border bg-card text-muted-foreground",
                  skipped && "border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground",
                )}
              >
                {isPast ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : isTerminalRefuse ? (
                  <X className="h-4 w-4" strokeWidth={2.5} />
                ) : isCurrent ? (
                  <CircleDot className={cn("h-4 w-4", live && "animate-pulse")} strokeWidth={2} />
                ) : skipped ? (
                  <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <span className="font-mono text-[11px]">{String(etat.ordre).padStart(2, "0")}</span>
                )}
              </span>

              <div className={cn("min-w-0 flex-1 pt-1", (isFuture || skipped) && "opacity-50")}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p
                    className={cn(
                      "text-sm font-semibold tracking-tight",
                      isCurrent && "text-primary",
                      isTerminalRefuse && "text-destructive",
                      !isCurrent && "text-foreground",
                    )}
                  >
                    {etat.libelle}
                  </p>
                  {date && (
                    <time className="font-mono text-[10px] text-muted-foreground">
                      {formatDate(date)}
                    </time>
                  )}
                  {isCurrent && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        isTerminalRefuse
                          ? "bg-destructive/15 text-destructive"
                          : "bg-primary/15 text-primary",
                      )}
                    >
                      {isTerminalRefuse ? "Terminé" : isTerminalCloture ? "Fin" : "En cours"}
                    </span>
                  )}
                  {skipped && (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      Non applicable
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {etat.description}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
