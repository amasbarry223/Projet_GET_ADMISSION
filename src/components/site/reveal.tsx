"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "article" | "span";
};

/** Reveal au scroll : fade + translate Y de 16px, ease premium. */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </Comp>
  );
}

type StaggerProps = {
  children: React.ReactNode;
  className?: string;
  gap?: number; // ms between items
};

/** Container qui stagger ses enfants RevealItem. */
export function RevealStagger({ children, className, gap = 60 }: StaggerProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: gap / 1000 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={{
        hidden: reduce ? {} : { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({ children, className, tone = "lapis" }: { children: React.ReactNode; className?: string; tone?: "lapis" | "or" }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-eyebrow", tone === "lapis" ? "text-lapis" : "text-or", className)}>
      <span className="h-px w-6 bg-current opacity-60" aria-hidden />
      {children}
    </span>
  );
}
