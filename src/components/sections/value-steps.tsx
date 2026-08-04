"use client";

import { UserPlus, FileText, CreditCard, Stamp, type LucideIcon } from "lucide-react";
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
                    whileHover={reduce ? undefined : { y: -4 }}
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
            className="glass-card sticky top-28 rounded-xl p-6 shadow-lg"
          >
            <p className="font-mono text-[11px] uppercase tracking-eyebrow text-primary">Frais d&apos;agence</p>
            <p className="mt-3 font-display text-3xl font-bold text-foreground">
              dès {formatFCFA(280000)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Montant indicatif — selon le type d&apos;établissement. Paiement en ligne ou déclaration
              Mobile Money / Wave.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-foreground/85">
              <li className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Conseiller dédié</span>
                <span className="font-medium">Inclus</span>
              </li>
              <li className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Suivi 12 étapes</span>
                <span className="font-medium">Temps réel</span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">Attestation officielle</span>
                <span className="font-medium">Vérifiable</span>
              </li>
            </ul>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}
