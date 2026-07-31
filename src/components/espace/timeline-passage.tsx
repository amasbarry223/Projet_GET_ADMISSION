"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePrefersReducedMotion } from "@/lib/motion";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

type Etat = {
  code: string;
  ordre: number;
  libelle: string;
  description: string;
};

type Props = {
  etats: Etat[];
  etapeActuelle: number;
  dateParEtat: Map<string, string> | Record<string, string>;
};

export function TimelinePassage({ etats, etapeActuelle, dateParEtat }: Props) {
  const listRef = React.useRef<HTMLOListElement>(null);
  const reduce = usePrefersReducedMotion();

  const dates =
    dateParEtat instanceof Map
      ? dateParEtat
      : new Map(Object.entries(dateParEtat));

  React.useEffect(() => {
    if (reduce || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>("[data-timeline-item]");
    const ctx = gsap.context(() => {
      items.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 28, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.55,
            ease: "back.out(1.4)",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          }
        );
        const stamp = el.querySelector("[data-stamp]");
        if (stamp) {
          gsap.fromTo(
            stamp,
            { scale: 1.6, rotate: -20, opacity: 0 },
            {
              scale: 1,
              rotate: 0,
              opacity: 1,
              duration: 0.45,
              ease: "back.out(2)",
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                toggleActions: "play none none none",
              },
              delay: 0.12,
            }
          );
        }
      });
    }, listRef);
    return () => ctx.revert();
  }, [reduce, etats.length]);

  return (
    <ol ref={listRef} className="relative space-y-1">
      <span className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden />
      {etats.map((etat) => {
        const isPast = etat.ordre < etapeActuelle;
        const isCurrent = etat.ordre === etapeActuelle;
        const isFuture = etat.ordre > etapeActuelle;
        const date = dates.get(etat.code.toLowerCase()) ?? dates.get(etat.code);
        return (
          <li
            key={etat.code}
            data-timeline-item
            className="relative flex gap-4 py-2"
            style={reduce ? undefined : { opacity: 0 }}
          >
            <span
              data-stamp
              className={cn(
                "relative z-10 mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 bg-card shadow-[0_2px_8px_rgba(60,169,54,0.25)]",
                isPast && "border-primary bg-primary text-primary-foreground",
                isCurrent && "border-primary bg-primary text-primary-foreground animate-pulse-soft ring-2 ring-primary/30",
                isFuture && "border-border text-muted-foreground"
              )}
            >
              {isPast ? (
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
              ) : isCurrent ? (
                <Clock className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
              )}
            </span>
            <div className={cn("flex-1 pt-0.5", isFuture && "opacity-55")}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(etat.ordre).padStart(2, "0")}
                </span>
                <p className={cn("text-sm font-semibold", isCurrent ? "text-primary" : "text-foreground")}>
                  {etat.libelle}
                </p>
                {date && (
                  <span className="font-mono text-[10px] text-muted-foreground">{formatDate(date)}</span>
                )}
                {isCurrent && (
                  <Badge className="bg-primary/20 font-mono text-[9px] uppercase tracking-eyebrow text-primary border-primary/20">
                    En cours
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{etat.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
