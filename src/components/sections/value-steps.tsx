"use client";

import { UserPlus, FileText, CreditCard, Stamp, Receipt, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { formatFCFA } from "@/lib/format";
import {
  fadeInUp,
  motionSafeVariants,
  revealViewport,
  staggerContainer,
  staggerItem,
} from "@/lib/animations";

const ICON_MAP: Record<string, LucideIcon> = {
  UserPlus,
  FileText,
  CreditCard,
  Stamp,
};

export type ValueStep = {
  numero: string;
  titre: string;
  description: string;
  icon: string;
};

export function ValueSteps({ steps }: { steps: ValueStep[] }) {
  const reduce = useReducedMotion();

  return (
    <section className="border-y border-border bg-card/20 py-24" aria-labelledby="etapes-title">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_340px] lg:items-start">
          <div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={motionSafeVariants(reduce, fadeInUp)}
            >
              <p className="eyebrow">L&apos;itinéraire</p>
              <h2
                id="etapes-title"
                className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                Quatre escales, un seul accompagnement.
              </h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                De la création du compte à l&apos;attestation, chaque étape est documentée et suivie
                par votre conseiller.
              </p>
            </motion.div>

            <motion.div
              className="mt-12 grid gap-5 sm:grid-cols-2"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={motionSafeVariants(reduce, staggerContainer)}
            >
              {steps.map((etape) => {
                const Icon = ICON_MAP[etape.icon] ?? UserPlus;
                return (
                  <motion.article
                    key={etape.numero}
                    variants={motionSafeVariants(reduce, staggerItem)}
                    {...(!reduce ? { whileHover: { y: -4 } } : {})}
                    className="group h-full rounded-xl border border-border bg-card/60 p-6 shadow-sm backdrop-blur-sm transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-2xl font-bold text-primary">{etape.numero}</span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-lg font-bold text-foreground">{etape.titre}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{etape.description}</p>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>

          <motion.aside
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={motionSafeVariants(reduce, fadeInUp)}
            className="glass-card sticky top-28 overflow-hidden rounded-xl shadow-lg"
          >
            <div className="flex items-center gap-3 px-6 pt-6">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
                <Receipt className="h-4.5 w-4.5" strokeWidth={1.5} />
              </span>
              <p className="font-mono text-[11px] uppercase tracking-eyebrow text-primary">
                Frais d&apos;agence
              </p>
            </div>

            <div className="px-6 pt-5">
              <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">
                À partir de
              </p>
              <p className="mt-1.5 font-display text-3xl font-bold tracking-tight text-foreground">
                {formatFCFA(100000)}
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                Montant indicatif — selon le type d&apos;établissement. Paiement en ligne ou
                déclaration Mobile Money / Wave.
              </p>
            </div>

            {/* Ligne perforée — esprit billet, en écho à la carte d'embarquement GET Admission */}
            <div className="relative mt-6" aria-hidden>
              <div className="border-t border-dashed border-border" />
              <span className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-background" />
              <span className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-background" />
            </div>

            <motion.ul
              className="space-y-3 px-6 py-5"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={motionSafeVariants(reduce, staggerContainer)}
            >
              {[
                ["Conseiller dédié", "Inclus"],
                ["Suivi 12 étapes", "Temps réel"],
                ["Attestation officielle", "Vérifiable"],
              ].map(([label, value]) => (
                <motion.li
                  key={label}
                  variants={motionSafeVariants(reduce, staggerItem)}
                  className="flex items-baseline gap-2 font-mono text-xs"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="h-px flex-1 -translate-y-0.5 border-b border-dotted border-border" />
                  <span className="font-semibold text-foreground">{value}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}
