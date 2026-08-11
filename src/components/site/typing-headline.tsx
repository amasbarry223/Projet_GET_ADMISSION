"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type TypingSegment = { text: string; className?: string };

/**
 * Titre à effet machine à écrire, sans décalage de mise en page (l'espace final est
 * réservé dès le premier rendu via un calque fantôme invisible) et sans rien cacher
 * aux lecteurs d'écran / crawlers (texte complet toujours présent, cf. .sr-only).
 * Respecte prefers-reduced-motion : affiche le texte final directement, sans animation.
 */
export function TypingHeadline({
  segments,
  speed = 32,
  startDelay = 300,
  className,
}: {
  segments: TypingSegment[];
  /** Délai entre deux caractères, en ms */
  speed?: number;
  /** Délai avant le premier caractère, en ms */
  startDelay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const fullText = React.useMemo(() => segments.map((s) => s.text).join(""), [segments]);
  const [count, setCount] = React.useState(reduce ? fullText.length : 0);
  const [done, setDone] = React.useState(!!reduce);

  React.useEffect(() => {
    if (reduce) return;
    let i = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= fullText.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, [fullText, speed, startDelay, reduce]);

  // Offset de départ (nombre de caractères des segments précédents) pour chaque segment,
  // calculé sans muter de variable partagée entre itérations (règles react-compiler).
  const offsets = segments.reduce<number[]>(
    (acc, seg) => [...acc, (acc[acc.length - 1] ?? 0) + seg.text.length],
    [],
  );
  const typed = segments.map((seg, i) => {
    const start = i === 0 ? 0 : offsets[i - 1]!;
    const take = Math.max(0, Math.min(seg.text.length, count - start));
    return (
      <span key={i} className={seg.className}>
        {seg.text.slice(0, take)}
      </span>
    );
  });

  return (
    <span className={cn("relative inline-block", className)}>
      {/* Calque fantôme : réserve la hauteur finale (2 lignes) dès le départ, évite le CLS */}
      <span className="invisible" aria-hidden="true">
        {segments.map((seg, i) => (
          <span key={i} className={seg.className}>
            {seg.text}
          </span>
        ))}
      </span>
      <span className="absolute inset-0" aria-hidden="true">
        {typed}
        <span
          className={cn(
            "ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[0.1em] bg-current align-middle",
            !reduce && "animate-caret-blink",
            done && "opacity-40",
          )}
        />
      </span>
      {/* Texte complet, toujours disponible pour lecteurs d'écran et crawlers */}
      <span className="sr-only">{fullText}</span>
    </span>
  );
}
