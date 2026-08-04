"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { MotionButton } from "@/components/site/motion-button";
import { fadeInUp, motionSafeVariants, scaleIn } from "@/lib/animations";

/**
 * Hero vitrine — split équilibré :
 * texte à gauche (promesse + CTA), portrait cutout à droite (ancrage humain).
 */
export function HomeHero() {
  const reduce = useReducedMotion();
  const textVariants = motionSafeVariants(reduce, fadeInUp);
  const portraitVariants = motionSafeVariants(reduce, scaleIn);

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src="/images/campus-sorbonne.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-20"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/92 to-background" />
        <div className="glow-primary absolute -left-24 top-10 h-80 w-80 blur-3xl" />
        <div className="glow-primary absolute right-0 top-1/3 h-96 w-96 opacity-50 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-content items-center gap-8 px-4 py-14 sm:gap-10 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-6 lg:px-8 lg:py-24 xl:gap-10">
        {/* Colonne texte */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={textVariants}
          className="relative z-20 flex flex-col justify-center lg:pr-2"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-eyebrow text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Admissions UEMOA · Ouvert
            <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          </span>

          <h1 className="mt-6 max-w-[18ch] text-balance font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.35rem] lg:leading-[1.08] xl:text-6xl">
            Votre admission à{" "}
            <span className="text-primary">l&apos;étranger</span>, accompagnée de bout en bout.
          </h1>
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            GET Admission guide les étudiants d&apos;Afrique de l&apos;Ouest : université partenaire,
            dossier, paiement, attestation de pré-inscription.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
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

        {/* Colonne portrait — plan rapproché, fond transparent */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={portraitVariants}
          className="relative z-10 mx-auto flex w-full max-w-[340px] items-end justify-center sm:max-w-[400px] lg:max-w-none lg:justify-self-end"
        >
          <div
            className={`relative aspect-[3/4] w-full max-w-[440px] ${reduce ? "" : "animate-float"}`}
            style={reduce ? undefined : { willChange: "transform" }}
          >
            {/* Soft ground glow — ancre le cutout sans card */}
            <div
              className="pointer-events-none absolute inset-x-[12%] bottom-[4%] h-[22%] rounded-[50%] bg-primary/20 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-[18%] bottom-[8%] h-[12%] rounded-[50%] bg-foreground/25 blur-2xl"
              aria-hidden
            />
            <Image
              src="/images/hero-etudiante-mali.png"
              alt="Étudiante malienne souriante, face caméra, portant des lunettes et tenant passeport et documents de voyage"
              fill
              priority
              className="object-contain object-bottom drop-shadow-[0_28px_56px_rgba(0,0,0,0.5)]"
              sizes="(max-width: 640px) 85vw, (max-width: 1024px) 400px, 440px"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
