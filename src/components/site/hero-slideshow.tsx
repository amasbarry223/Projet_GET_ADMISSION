"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MotionButton } from "@/components/site/motion-button";

const SLIDES = [
  {
    src: "/images/hero/slide-01.jpg",
    alt: "Étudiants africains sur un campus international",
    eyebrow: "Votre passage vers l'international",
    headline: "L'admission à l'étranger, sans le parcours du combattant.",
    description:
      "Dossier vérifié, suivi en temps réel, attestation officielle — le voyage de l'étudiant, centralisé dans votre espace candidat.",
  },
  {
    src: "/images/hero/slide-02.jpg",
    alt: "Étudiante africaine en bibliothèque universitaire",
    eyebrow: "Un dossier solide, étape par étape",
    headline: "Constituez votre dossier avec un conseiller dédié.",
    description:
      "Pièces vérifiées, éligibilité confirmée, corrections guidées — chaque document compte pour votre pré-admission.",
  },
  {
    src: "/images/hero/slide-03.jpg",
    alt: "Groupe d'étudiants africains sur un campus",
    eyebrow: "Universités partenaires",
    headline: "Des destinations choisies pour votre réussite.",
    description:
      "France, Canada, Afrique et plus encore — des établissements partenaires pour un accompagnement sérieux et transparent.",
  },
  {
    src: "/images/hero/slide-04.jpg",
    alt: "Étudiant africain au départ pour ses études à l'étranger",
    eyebrow: "De la candidature au départ",
    headline: "Préparez votre départ en toute sérénité.",
    description:
      "Attestation de pré-inscription, suivi clair et conseils pratiques — vous avancez, nous restons à vos côtés.",
  },
] as const;

const INTERVAL_MS = 5500;

const copyTransition = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

export function HeroSlideshow() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const regionRef = React.useRef<HTMLElement>(null);
  const slide = SLIDES[index] ?? SLIDES[0]!;

  React.useEffect(() => {
    if (reduceMotion || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, paused]);

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);

  return (
    <section
      ref={regionRef}
      className="relative flex min-h-[88vh] items-center overflow-hidden bg-encre"
      aria-labelledby="hero-title"
      aria-roledescription="carousel"
      aria-label="Présentation GET Admission"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={(e) => {
        if (!regionRef.current?.contains(e.relatedTarget as Node)) resume();
      }}
    >
      {/* Toutes les images montées pour crossfade fluide + preload */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {SLIDES.map((s, i) => {
          const active = i === index;
          return (
            <motion.div
              key={s.src}
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: active ? 1 : 0 }}
              transition={{
                duration: reduceMotion ? 0 : 1.1,
                ease: "easeInOut",
              }}
              aria-hidden={!active}
            >
              <motion.div
                className="absolute inset-0"
                initial={false}
                animate={
                  reduceMotion
                    ? { scale: 1 }
                    : active
                      ? { scale: 1.06 }
                      : { scale: 1 }
                }
                transition={{
                  duration: reduceMotion ? 0 : INTERVAL_MS / 1000,
                  ease: "linear",
                }}
              >
                <Image
                  src={s.src}
                  alt=""
                  fill
                  priority={i === 0}
                  quality={80}
                  className="object-cover object-center"
                  sizes="100vw"
                />
              </motion.div>
            </motion.div>
          );
        })}

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-encre/85 via-encre/60 to-encre/30"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-encre/75 via-transparent to-encre/40"
          aria-hidden
        />
      </div>

      {/* Copy synchronisé au slide */}
      <div className="relative z-10 mx-auto w-full max-w-content px-4 pb-28 pt-24 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8 lg:pt-32">
        <div className="max-w-2xl">
          <h1
            id="hero-title"
            className="font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-tightest text-blanc sm:text-5xl lg:text-[4.5rem]"
          >
            GET Admission
          </h1>

          <div
            className="relative mt-5 min-h-[12rem] sm:min-h-[13rem] lg:min-h-[14rem]"
            aria-live="polite"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slide.src}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                {...(!reduceMotion ? { exit: { opacity: 0, y: -10 } } : {})}
                transition={copyTransition}
              >
                <p className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-eyebrow text-or">
                  <span className="h-px w-6 bg-current opacity-60" aria-hidden />
                  {slide.eyebrow}
                </p>
                <p className="mt-4 max-w-xl font-display text-xl font-semibold text-blanc sm:text-2xl">
                  {slide.headline}
                </p>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-blanc/80 sm:text-lg">
                  {slide.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MotionButton asChild size="lg">
              <Link href="/inscription">
                Créer mon compte
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </MotionButton>
            <MotionButton
              asChild
              size="lg"
              variant="outline"
              className="border-blanc/70 bg-transparent text-blanc hover:bg-blanc/10 hover:text-blanc"
            >
              <Link href="/universites">Découvrir les destinations</Link>
            </MotionButton>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 sm:bottom-8"
        role="tablist"
        aria-label="Slides"
      >
        {SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1} : ${s.eyebrow}`}
            onClick={() => setIndex(i)}
            className={cn(
              "h-2.5 min-w-[10px] rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blanc/80",
              i === index ? "w-8 bg-blanc" : "w-2.5 bg-blanc/45 hover:bg-blanc/70"
            )}
          />
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {slide.alt}. {slide.headline}
      </p>
    </section>
  );
}
