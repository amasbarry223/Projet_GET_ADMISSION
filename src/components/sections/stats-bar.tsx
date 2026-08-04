"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedCounters } from "@/components/site/animated-counters";
import { fadeInUp, motionSafeVariants, revealViewport } from "@/lib/animations";

export function StatsBar({ stats }: { stats: { valeur: string; libelle: string }[] }) {
  const reduce = useReducedMotion();
  const variants = motionSafeVariants(reduce, fadeInUp);

  return (
    <section className="relative py-24" aria-labelledby="chiffres-title">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={variants}
        >
          <p className="eyebrow">Preuves de passage</p>
          <h2
            id="chiffres-title"
            className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Un parcours mesurable, pas une promesse.
          </h2>
        </motion.div>
        <AnimatedCounters className="mt-14" stats={stats} />
      </div>
    </section>
  );
}
