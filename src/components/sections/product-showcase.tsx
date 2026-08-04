"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BoardingPass } from "@/components/getadm/boarding-pass";
import { CheckCircle2, FileCheck2, MessageSquare, Radio } from "lucide-react";
import {
  fadeInUp,
  motionSafeVariants,
  revealViewport,
  staggerContainer,
  staggerItem,
} from "@/lib/animations";

type BoardingPreview = {
  reference: string;
  universiteNom: string;
  formationLabel: string;
  etat: string;
  etapeActuelle: number;
  etapeTotal: number;
  conseiller: string;
  fraisAgence: number;
  mrz: string;
};

const ANNOTATIONS = [
  { icon: Radio, label: "Suivi live", desc: "Statut mis à jour en temps réel" },
  { icon: FileCheck2, label: "Pièces", desc: "Check-list documentaire claire" },
  { icon: MessageSquare, label: "Conseiller", desc: "Messagerie intégrée" },
  { icon: CheckCircle2, label: "Attestation", desc: "Document vérifiable en ligne" },
];

export function ProductShowcase({ boarding }: { boarding: BoardingPreview | null }) {
  const reduce = useReducedMotion();

  return (
    <section className="py-24" aria-labelledby="showcase-title">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={motionSafeVariants(reduce, fadeInUp)}
        >
          <p className="eyebrow">Espace candidat</p>
          <h2
            id="showcase-title"
            className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Un dossier candidat, en un coup d&apos;œil.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Référence, étapes et suivi — ce que vous retrouvez dans votre espace.
          </p>
        </motion.div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
          <motion.div
            className="relative mx-auto w-full max-w-md"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={motionSafeVariants(reduce, fadeInUp)}
          >
            <div className="glow-primary absolute -inset-8 -z-10 blur-3xl" aria-hidden />
            {boarding ? (
              <BoardingPass
                reference={boarding.reference}
                universiteNom={boarding.universiteNom}
                formationLabel={boarding.formationLabel}
                etat={boarding.etat}
                etapeActuelle={boarding.etapeActuelle}
                etapeTotal={boarding.etapeTotal}
                conseiller={boarding.conseiller}
                fraisAgence={boarding.fraisAgence}
                mrz={boarding.mrz}
                variant="large"
                animateOnMount
              />
            ) : (
              <div className="glass-card rounded-xl p-8">
                <p className="font-display text-xl font-bold text-foreground">Carte d&apos;embarquement</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Disponible dès qu&apos;un dossier atteint la pré-admission.
                </p>
              </div>
            )}
          </motion.div>

          <motion.ul
            className="grid gap-4 sm:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={motionSafeVariants(reduce, staggerContainer)}
          >
            {ANNOTATIONS.map((item) => {
              const Icon = item.icon;
              return (
                <motion.li
                  key={item.label}
                  variants={motionSafeVariants(reduce, staggerItem)}
                  className="rounded-xl border border-border bg-card/50 p-5 backdrop-blur-sm"
                >
                  <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  <p className="mt-3 font-display font-bold text-foreground">{item.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </motion.li>
              );
            })}
          </motion.ul>
        </div>
      </div>
    </section>
  );
}
