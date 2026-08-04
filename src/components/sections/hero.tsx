"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { MotionButton } from "@/components/site/motion-button";
import { BoardingPass } from "@/components/getadm/boarding-pass";
import { fadeInUp, motionSafeVariants, revealViewport, scaleIn } from "@/lib/animations";

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
} | null;

export function HomeHero({ boarding }: { boarding: BoardingPreview }) {
  const reduce = useReducedMotion();
  const variants = motionSafeVariants(reduce, fadeInUp);
  const cardVariants = motionSafeVariants(reduce, scaleIn);

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src="/images/campus-sorbonne.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-25"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="glow-primary absolute -left-24 top-10 h-80 w-80 blur-3xl" />
        <div className="glow-primary absolute -right-16 bottom-0 h-72 w-72 opacity-60 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-content gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants}
          className="flex flex-col justify-center"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-eyebrow text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Admissions UEMOA · Ouvert
            <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          </span>

          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Votre admission à{" "}
            <span className="text-primary">l&apos;étranger</span>, accompagnée de bout en bout.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            GET Admission guide les étudiants d&apos;Afrique de l&apos;Ouest : université partenaire,
            dossier, paiement, attestation de pré-inscription.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MotionButton asChild size="lg">
              <Link href="/inscription">
                Créer mon compte
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </MotionButton>
            <MotionButton asChild size="lg" variant="outline">
              <Link href="/universites">Explorer les universités</Link>
            </MotionButton>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="relative mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end"
        >
          <div
            className={`relative ${reduce ? "" : "animate-float"}`}
            style={reduce ? undefined : { willChange: "transform" }}
          >
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
                variant="hero"
                animateOnMount
              />
            ) : (
              <div className="glass-card rounded-xl p-8 shadow-lg">
                <p className="font-mono text-[11px] uppercase tracking-eyebrow text-primary">Aperçu dossier</p>
                <p className="mt-3 font-display text-2xl font-bold text-foreground">
                  Composez votre carte d&apos;embarquement académique.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Référence, étapes et conseiller dédié — visibles dès la soumission.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
