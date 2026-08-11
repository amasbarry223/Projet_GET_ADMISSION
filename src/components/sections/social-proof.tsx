"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeInUp, motionSafeVariants, revealViewport } from "@/lib/animations";

export type Testimonial = {
  nom: string;
  citation: string;
  parcours: string;
  pays: string;
  photoUrl?: string | null;
};

const FALLBACK_PORTRAITS = [
  "/images/temoignages/temoignage-marieme.png",
  "/images/temoignages/temoignage-awa.png",
  "/images/temoignages/temoignage-paul.png",
  "/images/temoignages/temoignage-fatou.png",
] as const;

function initials(nom: string) {
  return nom
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StarRow({ className }: { className?: string }) {
  return (
    <div className={cn("mt-auto flex items-center gap-2", className)} aria-label="5 étoiles">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-full bg-white/90 px-2 py-1 shadow-inner"
        >
          <span className="text-xs font-semibold text-primary">★</span>
        </span>
      ))}
    </div>
  );
}

function TestimonialCard({
  t,
  photoUrl,
}: {
  t: Testimonial;
  photoUrl: string;
}) {
  return (
    <div className="h-[260px] w-[360px] shrink-0 md:h-[269px] md:w-[580px]">
      <article className="glossy-card relative h-full rounded-[40px] border-0 bg-[rgb(13,13,13)]/95 text-white shadow-sm">
        <div className="h-full p-6">
          <div className="flex h-full">
            <div className="flex flex-1 flex-col pr-4">
              <p className="line-clamp-4 leading-relaxed text-white/80 md:line-clamp-none">
                “{t.citation}”
              </p>
              <StarRow />
            </div>
            <div className="flex w-28 flex-col items-center justify-center md:w-40">
              <div className="relative size-24 overflow-hidden rounded-full border border-white/40 bg-primary/20 shadow-md md:size-36">
                <Image
                  src={photoUrl}
                  alt={t.nom}
                  width={144}
                  height={144}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="mt-3 text-center">
                <div className="font-medium leading-tight text-white">{t.nom}</div>
                <div className="line-clamp-2 text-xs text-white/60 md:text-sm">
                  {t.parcours}
                  {t.pays ? ` · ${t.pays}` : ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

export function SocialProof({
  testimonials,
  candidateCountLabel,
}: {
  testimonials: Testimonial[];
  candidateCountLabel?: string;
}) {
  const reduce = useReducedMotion();
  const withPhotos: Array<Testimonial & { photoUrl: string }> = testimonials.map((t, i) => ({
    nom: t.nom,
    citation: t.citation,
    parcours: t.parcours,
    pays: t.pays,
    photoUrl: t.photoUrl ?? FALLBACK_PORTRAITS[i % FALLBACK_PORTRAITS.length]!,
  }));

  const loop = React.useMemo(
    () => (withPhotos.length > 0 ? [...withPhotos, ...withPhotos] : []),
    [withPhotos],
  );

  if (withPhotos.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden bg-background py-24 text-foreground"
      aria-labelledby="temoignages-title"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="glow-primary absolute -left-20 top-10 h-72 w-72 opacity-40 blur-3xl" />
        <div className="glow-primary absolute -right-16 bottom-0 h-64 w-64 opacity-30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <motion.div
          className="relative mb-12 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={motionSafeVariants(reduce, fadeInUp)}
        >
          <p className="font-mono text-[11px] uppercase tracking-eyebrow text-primary">
            Voix du voyage
          </p>
          <h2
            id="temoignages-title"
            className="mt-4 font-display text-3xl font-bold text-foreground md:text-4xl"
          >
            Ils sont passés par GET Admission.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Des étudiants maliens racontent leur parcours avec GET Admission, de Bamako
            jusqu&apos;à la pré-admission.
          </p>

          {(candidateCountLabel || withPhotos.length > 0) && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                {withPhotos.slice(0, 5).map((t) => (
                  <span
                    key={t.nom}
                    className="relative flex h-9 w-9 overflow-hidden rounded-full border-2 border-background bg-primary/20"
                    title={t.nom}
                  >
                    {t.photoUrl ? (
                      <Image
                        src={t.photoUrl}
                        alt=""
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-mono text-[10px] font-bold text-primary">
                        {initials(t.nom)}
                      </span>
                    )}
                  </span>
                ))}
              </div>
              {candidateCountLabel ? (
                <p className="text-sm text-muted-foreground">{candidateCountLabel}</p>
              ) : null}
            </div>
          )}
        </motion.div>
      </div>

      <div className="relative mt-8">
        <div className="mask-edges relative overflow-hidden">
          <ul
            className={cn(
              "flex w-max gap-5",
              reduce
                ? "mx-auto max-w-content flex-wrap justify-center px-4"
                : "animate-marquee hover:[animation-play-state:paused]",
            )}
            aria-label="Témoignages GET Admission, défilement horizontal continu"
          >
            {(reduce ? withPhotos : loop).map((t, i) => (
              <li key={`${t.nom}-${i}`}>
                <TestimonialCard t={t} photoUrl={t.photoUrl!} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
