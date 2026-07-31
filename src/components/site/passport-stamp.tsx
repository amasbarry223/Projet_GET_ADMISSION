"use client";

import * as React from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/lib/motion";

/** Tampon passeport qui s'imprime au chargement (GSAP timeline). */
export function PassportStamp({ className }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();

  React.useEffect(() => {
    if (reduce || !ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { scale: 2.2, opacity: 0, rotate: -18, filter: "blur(4px)" },
        {
          scale: 1,
          opacity: 1,
          rotate: -8,
          filter: "blur(0px)",
          duration: 0.85,
          ease: "back.out(1.6)",
          delay: 0.35,
        }
      );
    }, ref);
    return () => ctx.revert();
  }, [reduce]);

  return (
    <div
      ref={ref}
      className={className}
      aria-hidden
      style={reduce ? { transform: "rotate(-8deg)" } : { opacity: 0 }}
    >
      <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border-[3px] border-or bg-or-pale/70 shadow-[0_8px_24px_rgba(60,169,54,0.35)] sm:h-32 sm:w-32">
        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-or sm:h-24 sm:w-24">
          <p className="font-mono text-[9px] font-bold uppercase tracking-eyebrow text-or">Visa</p>
          <p className="mt-0.5 font-display text-sm font-bold text-lapis">GET</p>
          <p className="font-mono text-[8px] uppercase tracking-eyebrow text-or/80">Admission</p>
        </div>
      </div>
    </div>
  );
}
