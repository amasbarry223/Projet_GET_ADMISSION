"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/motion";
import { formatFCFACompact } from "@/lib/format";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export type CarnetUniv = {
  id: string;
  slug: string;
  nom: string;
  pays: string;
  drapeau: string;
  ville: string;
  ecusson: string;
  coverUrl?: string | null;
  logoUrl?: string | null;
  imageCouleur: string;
  fraisMin: number;
  fraisMax: number;
};

/**
 * Carnet horizontal — sticky CSS + scrub GSAP (sans pin).
 * Évite removeChild : ScrollTrigger.pin réparente le DOM hors de React.
 */
export function HorizontalCarnet({ universites }: { universites: CarnetUniv[] }) {
  const sectionRef = React.useRef<HTMLElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();

  React.useEffect(() => {
    if (reduce || !sectionRef.current || !trackRef.current || universites.length === 0) return;

    const section = sectionRef.current;
    const track = trackRef.current;

    const ctx = gsap.context(() => {
      const getDistance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      // Hauteur de section = viewport + course horizontale (spacer sticky)
      const applyHeight = () => {
        section.style.height = `${window.innerHeight + getDistance()}px`;
      };
      applyHeight();

      gsap.fromTo(
        track,
        { x: 0 },
        {
          x: () => -getDistance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
            invalidateOnRefresh: true,
            onRefresh: applyHeight,
          },
        }
      );
    }, section);

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ctx.revert();
      section.style.height = "";
      gsap.set(track, { clearProps: "transform" });
    };
  }, [reduce, universites.length]);

  if (universites.length === 0) return null;

  if (reduce) {
    return (
      <section className="relative overflow-hidden bg-card" aria-labelledby="carnet-title">
        <CarnetHeader />
        <div className="mt-10 flex gap-6 overflow-x-auto scroll-fine px-4 pb-20 sm:px-6 lg:px-8">
          <CarnetCards universites={universites} />
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative bg-card" aria-labelledby="carnet-title">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <CarnetHeader />
        <div
          ref={trackRef}
          className="mt-10 flex w-max gap-6 px-4 pb-8 sm:px-6 lg:px-8 will-change-transform"
        >
          <CarnetCards universites={universites} />
        </div>
      </div>
    </section>
  );
}

function CarnetHeader() {
  return (
    <div className="mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8">
      <p className="eyebrow">Destinations</p>
      <h2
        id="carnet-title"
        className="mt-3 font-display text-3xl font-bold tracking-tightest text-foreground sm:text-4xl"
      >
        Feuilletez le carnet de voyage.
      </h2>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Faites défiler pour découvrir nos établissements partenaires — comme les pages d&apos;un
        passeport.
      </p>
    </div>
  );
}

function CarnetCards({ universites }: { universites: CarnetUniv[] }) {
  return (
    <>
      {universites.map((u) => (
        <Link
          key={u.id}
          href={`/universites/${u.slug}`}
          className="group relative h-[420px] w-[min(82vw,340px)] shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(60,169,54,0.28)]"
        >
          <div className={cn("relative h-56 bg-gradient-to-br", u.imageCouleur)}>
            {u.coverUrl ? (
              <Image
                src={u.coverUrl}
                alt=""
                fill
                className="object-cover"
                sizes="340px"
                loading="lazy"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {u.logoUrl ? (
              <span className="absolute left-4 top-4 flex h-12 w-12 overflow-hidden rounded-full border-2 border-blanc bg-card shadow-md">
                <Image src={u.logoUrl} alt="" width={48} height={48} className="object-cover" />
              </span>
            ) : (
              <span className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-card font-mono text-xs font-bold text-primary shadow-md">
                {u.ecusson}
              </span>
            )}
            <span className="absolute right-4 top-4 text-2xl" aria-hidden>
              {u.drapeau}
            </span>
          </div>
          <div className="flex flex-col gap-2 p-5">
            <h3 className="font-display text-lg font-bold leading-tight text-foreground line-clamp-2">
              {u.nom}
            </h3>
            <p className="text-sm text-muted-foreground">
              {u.ville}, {u.pays}
            </p>
            <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
              <p className="font-mono text-xs font-semibold text-foreground">
                {formatFCFACompact(u.fraisMin)} – {formatFCFACompact(u.fraisMax)}
              </p>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-or" />
            </div>
          </div>
        </Link>
      ))}
      <div className="flex w-24 shrink-0 items-center justify-center self-center sm:w-40">
        <Link
          href="/universites"
          className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-xs uppercase tracking-eyebrow text-primary hover:bg-primary/15"
        >
          Catalogue →
        </Link>
      </div>
    </>
  );
}
