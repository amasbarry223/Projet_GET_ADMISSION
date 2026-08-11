"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type TypingSegment = { text: string; className?: string };

type Phase = "typing" | "holding" | "deleting" | "waiting";

/**
 * Titre à effet machine à écrire, en boucle (tape → pause → efface → tape…).
 * - Pas de décalage de mise en page : l'espace final est réservé dès le premier rendu
 *   via un calque fantôme invisible.
 * - Rien n'est caché aux lecteurs d'écran / crawlers : texte complet en .sr-only.
 * - Respecte prefers-reduced-motion : affiche le texte final directement, sans boucle.
 * - La boucle se met en pause hors viewport ou onglet masqué (pas de cycle inutile en fond).
 */
export function TypingHeadline({
  segments,
  typeSpeed = 42,
  deleteSpeed = 20,
  startDelay = 300,
  holdDuration = 2200,
  waitDuration = 500,
  loop = true,
  className,
}: {
  segments: TypingSegment[];
  /** Délai entre deux caractères tapés, en ms */
  typeSpeed?: number;
  /** Délai entre deux caractères effacés, en ms (plus rapide que la frappe) */
  deleteSpeed?: number;
  /** Délai avant le premier caractère, en ms */
  startDelay?: number;
  /** Pause une fois le texte entièrement tapé, en ms */
  holdDuration?: number;
  /** Pause une fois le texte entièrement effacé, avant de retaper, en ms */
  waitDuration?: number;
  /** Boucle indéfiniment (tape → pause → efface → pause → retape…) */
  loop?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const fullText = React.useMemo(() => segments.map((s) => s.text).join(""), [segments]);
  const [count, setCount] = React.useState(reduce ? fullText.length : 0);
  const rootRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (reduce) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let currentCount = 0;
    let currentPhase: Phase = "typing";
    let inView = true;
    let tabVisible = document.visibilityState === "visible";
    const isActive = () => inView && tabVisible;

    const step = () => {
      timeoutId = undefined;
      if (!isActive()) return;
      switch (currentPhase) {
        case "typing":
          currentCount += 1;
          setCount(currentCount);
          if (currentCount >= fullText.length) {
            if (!loop) return;
            currentPhase = "holding";
            timeoutId = setTimeout(step, holdDuration);
          } else {
            timeoutId = setTimeout(step, typeSpeed);
          }
          break;
        case "holding":
          currentPhase = "deleting";
          timeoutId = setTimeout(step, deleteSpeed);
          break;
        case "deleting":
          currentCount -= 1;
          setCount(currentCount);
          if (currentCount <= 0) {
            currentPhase = "waiting";
            timeoutId = setTimeout(step, waitDuration);
          } else {
            timeoutId = setTimeout(step, deleteSpeed);
          }
          break;
        case "waiting":
          currentPhase = "typing";
          timeoutId = setTimeout(step, typeSpeed);
          break;
      }
    };

    const resumeIfNeeded = () => {
      if (isActive() && timeoutId === undefined) step();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? true;
        if (!inView && timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        } else {
          resumeIfNeeded();
        }
      },
      { threshold: 0.1 },
    );
    if (rootRef.current) io.observe(rootRef.current);

    const onVisibilityChange = () => {
      tabVisible = document.visibilityState === "visible";
      if (!tabVisible && timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      } else {
        resumeIfNeeded();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    timeoutId = setTimeout(step, startDelay);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fullText, typeSpeed, deleteSpeed, holdDuration, waitDuration, startDelay, loop, reduce]);

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
    <span ref={rootRef} className={cn("relative inline-block", className)}>
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
        {!reduce && (
          <span className="animate-caret-blink ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[0.1em] bg-current align-middle" />
        )}
      </span>
      {/* Texte complet, toujours disponible pour lecteurs d'écran et crawlers */}
      <span className="sr-only">{fullText}</span>
    </span>
  );
}
