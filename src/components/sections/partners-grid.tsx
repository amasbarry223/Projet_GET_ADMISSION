"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import {
  fadeInUp,
  motionSafeVariants,
  revealViewport,
  staggerContainer,
  staggerItem,
} from "@/lib/animations";
import { MediaImage } from "@/components/media-image";

export type PartnerCard = {
  id: string;
  slug: string;
  nom: string;
  ville: string;
  pays: string;
  drapeau: string;
  ecusson: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
};

export function PartnersGrid({ partners }: { partners: PartnerCard[] }) {
  const reduce = useReducedMotion();
  const list = partners.slice(0, 6);

  return (
    <section className="border-y border-border bg-card/15 py-24" aria-labelledby="partners-title">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex flex-wrap items-end justify-between gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={motionSafeVariants(reduce, fadeInUp)}
        >
          <div>
            <p className="eyebrow">Écosystème</p>
            <h2
              id="partners-title"
              className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Universités partenaires.
            </h2>
          </div>
          <Link
            href="/universites"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Voir le catalogue <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </motion.div>

        <motion.div
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={motionSafeVariants(reduce, staggerContainer)}
        >
          {list.map((u) => (
            <motion.div key={u.id} variants={motionSafeVariants(reduce, staggerItem)}>
              <Link
                href={`/universites/${u.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card/50 transition hover:border-primary/40"
              >
                <div className="relative h-36 bg-muted">
                  {u.coverUrl ? (
                    <Image
                      src={u.coverUrl}
                      alt=""
                      fill
                      className="object-cover opacity-80 transition group-hover:scale-105"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  <span className="absolute bottom-3 left-3 text-xl">{u.drapeau}</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-8 w-8 overflow-hidden rounded-full border border-border bg-muted">
                      {u.logoUrl ? (
                        <MediaImage src={u.logoUrl} alt="" width={32} height={32} className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-mono text-[9px] text-primary">
                          {u.ecusson.slice(0, 3)}
                        </span>
                      )}
                    </span>
                    <p className="font-display font-bold text-foreground group-hover:text-primary">{u.nom}</p>
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" strokeWidth={1.5} />
                    {u.ville}, {u.pays}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
