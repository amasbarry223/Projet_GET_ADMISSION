"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  fadeInUp,
  motionSafeVariants,
  revealViewport,
  staggerContainer,
  staggerItem,
} from "@/lib/animations";

const TIMELINE = [
  {
    titre: "Création de compte & choix",
    statut: "Disponible" as const,
    progress: 100,
    desc: "Inscription, université et formation en ligne.",
  },
  {
    titre: "Constitution du dossier",
    statut: "Disponible" as const,
    progress: 100,
    desc: "Pièces, profil académique et soumission guidée.",
  },
  {
    titre: "Traitement agence & paiement",
    statut: "Disponible" as const,
    progress: 100,
    desc: "Vérification conseiller, frais d'agence, reçus.",
  },
  {
    titre: "Pré-admission & attestation",
    statut: "En cours" as const,
    progress: 70,
    desc: "Décision université puis attestation vérifiable.",
  },
  {
    titre: "Suivi visa & départ",
    statut: "Bientôt" as const,
    progress: 25,
    desc: "Ressources complémentaires préparées pour la rentrée.",
  },
];

const STATUS_STYLE = {
  Disponible: "border-primary/30 bg-primary/10 text-primary",
  "En cours": "border-ambre/40 bg-ambre/10 text-ambre",
  Bientôt: "border-border bg-muted text-muted-foreground",
};

export function AccompanimentTimeline() {
  const reduce = useReducedMotion();

  return (
    <section className="border-y border-border bg-card/15 py-24" aria-labelledby="timeline-title">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={motionSafeVariants(reduce, fadeInUp)}
        >
          <p className="eyebrow">Accompagnement</p>
          <h2
            id="timeline-title"
            className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Du dossier à l&apos;attestation, sans zone d&apos;ombre.
          </h2>
        </motion.div>

        <motion.ol
          className="mx-auto mt-14 max-w-3xl space-y-4"
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={motionSafeVariants(reduce, staggerContainer)}
        >
          {TIMELINE.map((item, index) => (
            <motion.li
              key={item.titre}
              variants={motionSafeVariants(reduce, staggerItem)}
              className="rounded-xl border border-border bg-card/50 p-5 backdrop-blur-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-xs font-bold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-base font-bold text-foreground">{item.titre}</h3>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                    STATUS_STYLE[item.statut],
                  )}
                >
                  {item.statut}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${item.progress}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: reduce ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
