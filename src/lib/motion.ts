"use client";

import * as React from "react";

/** Flag global — peut être forcé à false pour désactiver toutes les animations. */
export const MOTION_ENABLED = true;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return !MOTION_ENABLED || reduced;
}

/** True si GSAP / Lenis / timelines sont autorisés. */
export function canAnimate(): boolean {
  return MOTION_ENABLED && !prefersReducedMotion();
}
