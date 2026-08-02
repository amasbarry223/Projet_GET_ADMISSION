"use client";

import * as React from "react";

/** Flag global — peut être forcé à false pour désactiver toutes les animations. */
export const MOTION_ENABLED = true;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onChange = () => onStoreChange();
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion(): boolean {
  const reduced = React.useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  return !MOTION_ENABLED || reduced;
}

/** True si GSAP / Lenis / timelines sont autorisés. */
export function canAnimate(): boolean {
  return MOTION_ENABLED && !prefersReducedMotion();
}
