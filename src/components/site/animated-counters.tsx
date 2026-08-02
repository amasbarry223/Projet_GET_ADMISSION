"use client";

import * as React from "react";
import { useInView, useMotionValue, useSpring, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

function parseStatValue(raw: string): { target: number; prefix: string; suffix: string } {
  const cleaned = raw.replace(/\s/g, "");
  const match = cleaned.match(/^([^\d]*)([\d.,]+)(.*)$/);
  if (!match) return { target: 0, prefix: "", suffix: raw };
  const num = parseFloat(match[2].replace(",", "."));
  return {
    target: Number.isFinite(num) ? num : 0,
    prefix: match[1] ?? "",
    suffix: match[3] ?? "",
  };
}

function Counter({ valeur, libelle }: { valeur: string; libelle: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const { target, prefix, suffix } = parseStatValue(valeur);
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = React.useState(valeur);

  React.useEffect(() => {
    if (!inView) return;
    if (reduce || target === 0) {
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) setDisplay(valeur);
      });
      return () => {
        cancelled = true;
      };
    }
    motionVal.set(0);
    motionVal.set(target);
  }, [inView, reduce, target, valeur, motionVal]);

  React.useEffect(() => {
    if (reduce) return;
    const unsub = spring.on("change", (v) => {
      const rounded = target >= 100 ? Math.round(v).toLocaleString("fr-FR") : v.toFixed(target % 1 ? 1 : 0);
      setDisplay(`${prefix}${rounded}${suffix}`);
    });
    return unsub;
  }, [spring, prefix, suffix, target, reduce]);

  return (
    <div className="text-center">
      <span
        ref={ref}
        className="font-display text-4xl font-extrabold tracking-tight text-lapis sm:text-5xl"
      >
        {display}
      </span>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-eyebrow text-ardoise">{libelle}</p>
    </div>
  );
}

export function AnimatedCounters({
  stats,
  className,
}: {
  stats: { valeur: string; libelle: string }[];
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={cn("grid gap-10 sm:grid-cols-2 lg:grid-cols-4", className)}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {stats.map((s) => (
        <Counter key={s.libelle} valeur={s.valeur} libelle={s.libelle} />
      ))}
    </motion.div>
  );
}
