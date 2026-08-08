"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type MarqueeUniversity = {
  id: string;
  slug: string;
  nom: string;
  ecusson: string;
  logoUrl?: string | null;
};

const LOGO_CLASS =
  "h-14 w-auto max-w-[14rem] object-contain opacity-95 transition duration-300 group-hover:scale-[1.04] group-hover:opacity-100 md:h-16 md:max-w-[16rem]";

function PartnerLogo({
  src,
  nom,
  onBroken,
}: {
  src: string;
  nom: string;
  onBroken: () => void;
}) {
  const isSvg = src.toLowerCase().endsWith(".svg");

  if (isSvg) {
    return (
       
      <img
        src={src}
        alt={`Logo ${nom}`}
        className={LOGO_CLASS}
        onError={onBroken}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={`Logo ${nom}`}
      width={280}
      height={80}
      className={LOGO_CLASS}
      onError={onBroken}
    />
  );
}

export function PartnerMarquee({ universities }: { universities: MarqueeUniversity[] }) {
  const withLogo = React.useMemo(
    () => universities.filter((u) => Boolean(u.logoUrl)),
    [universities],
  );
  const [hidden, setHidden] = React.useState<Record<string, boolean>>({});

  const visible = withLogo.filter((u) => !hidden[u.id]);
  const items = visible.length > 0 ? [...visible, ...visible] : [];

  if (visible.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden border-b border-border py-12"
      aria-label="Universités partenaires"
    >
      <p className="mb-8 text-center font-mono text-[11px] uppercase tracking-eyebrow text-muted-foreground">
        Ils accompagnent nos candidats
      </p>

      <div className="mask-edges group relative overflow-hidden">
        <ul
          className={cn(
            "flex w-max items-center gap-12 px-6 md:gap-16",
            "animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none",
          )}
        >
          {items.map((u, i) => (
            <li key={`${u.id}-${i}`} className="shrink-0 list-none">
              <Link
                href={`/universites/${u.slug}`}
                className="group flex h-20 items-center justify-center md:h-24"
                title={u.nom}
              >
                <PartnerLogo
                  src={u.logoUrl!}
                  nom={u.nom}
                  onBroken={() =>
                    setHidden((prev) => (prev[u.id] ? prev : { ...prev, [u.id]: true }))
                  }
                />
                <span className="sr-only">{u.nom}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
