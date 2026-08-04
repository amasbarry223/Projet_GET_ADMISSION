"use client";

import type { Variants, Transition } from "framer-motion";

export const easeOutExpo: Transition = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1],
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: easeOutExpo,
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: easeOutExpo,
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: easeOutExpo,
  },
};

/** Viewport defaults for whileInView reveals */
export const revealViewport = {
  once: true,
  margin: "-100px" as const,
};

export function motionSafeVariants(reduced: boolean | null, variants: Variants): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
    };
  }
  return variants;
}
