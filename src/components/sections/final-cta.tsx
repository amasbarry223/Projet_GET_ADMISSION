"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Plane } from "lucide-react";
import { MotionButton } from "@/components/site/motion-button";
import { formatFCFA } from "@/lib/format";
import { fadeInUp, motionSafeVariants, revealViewport } from "@/lib/animations";

export function FinalCta() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-28" aria-labelledby="cta-title">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="glow-primary absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-content px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={motionSafeVariants(reduce, fadeInUp)}
        >
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-eyebrow text-primary">
            <Plane className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            Embarquement
          </span>
          <h2
            id="cta-title"
            className="mx-auto mt-5 max-w-2xl font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Composez votre dossier aujourd&apos;hui.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Comptez cinq minutes pour créer votre compte. Votre conseiller prend le relais sous 24
            heures ouvrées.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MotionButton asChild size="lg">
              <Link href="/inscription">
                Créer mon compte
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </MotionButton>
            <MotionButton asChild size="lg" variant="outline">
              <Link href="/contact">Parler à un conseiller</Link>
            </MotionButton>
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-eyebrow text-muted-foreground">
            Frais d&apos;agence à partir de {formatFCFA(280000)}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
