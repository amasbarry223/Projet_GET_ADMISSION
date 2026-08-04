"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTone =
  | "lapis"
  | "cyan"
  | "bleu"
  | "vert"
  | "jaune"
  | "rouge"
  | "violet"
  | "or"
  | "ambre"
  | "carmin";

const TONE_CONFIG: Record<KpiTone, { iconBg: string; iconText: string; accent: string }> = {
  lapis: { iconBg: "bg-lapis/10", iconText: "text-lapis", accent: "text-lapis" },
  cyan: { iconBg: "bg-cyan-pale", iconText: "text-cyan", accent: "text-cyan" },
  bleu: { iconBg: "bg-bleu-pale", iconText: "text-bleu-vif", accent: "text-bleu-vif" },
  vert: { iconBg: "bg-vert-pale", iconText: "text-vert-vif", accent: "text-vert-vif" },
  jaune: { iconBg: "bg-jaune-pale", iconText: "text-jaune", accent: "text-jaune" },
  rouge: { iconBg: "bg-rouge-pale", iconText: "text-rouge", accent: "text-rouge" },
  violet: { iconBg: "bg-violet-pale", iconText: "text-violet", accent: "text-violet" },
  or: { iconBg: "bg-or-pale", iconText: "text-or", accent: "text-or" },
  ambre: { iconBg: "bg-ambre/10", iconText: "text-ambre", accent: "text-ambre" },
  carmin: { iconBg: "bg-carmin/10", iconText: "text-carmin", accent: "text-carmin" },
};

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  delta?: number;
  deltaLabel?: string;
  tone?: KpiTone;
  className?: string;
}

/**
 * Carte KPI inspirée du modèle enterprise dashboard.
 * Layout : icône dans conteneur teinté (carré 48px arrondi) + valeur grande + label gris + delta.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  delta,
  deltaLabel,
  tone = "lapis",
  className,
}: KpiCardProps) {
  const config = TONE_CONFIG[tone];
  const hasDelta = typeof delta === "number";
  const up = (delta ?? 0) >= 0;

  return (
    <Card className={cn(
      "border-ligne bg-blanc p-5 shadow-sm transition-shadow duration-300 hover:shadow-[0_8px_24px_rgba(60,169,54,0.16)]",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", config.iconBg)}>
          <Icon className={cn("h-6 w-6", config.iconText)} strokeWidth={1.5} />
        </div>
        {hasDelta && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold",
              up ? "bg-vert-pale text-vert-vif" : "bg-rouge-pale text-rouge"
            )}
          >
            {up ? <TrendingUp className="h-3 w-3" strokeWidth={2} /> : <TrendingDown className="h-3 w-3" strokeWidth={2} />}
            {up ? "+" : ""}{delta}%
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-[28px] font-bold leading-tight text-encre">{value}</p>
      <p className="mt-0.5 text-[13px] text-ardoise">
        {label}
        {suffix && <span className="text-ardoise/70"> · {suffix}</span>}
      </p>
      {deltaLabel && hasDelta && (
        <p className={cn("mt-1 text-[11px] font-medium", up ? "text-vert-vif" : "text-rouge")}>
          {up ? "↑" : "↓"} {deltaLabel}
        </p>
      )}
    </Card>
  );
}

/**
 * Section header with title + optional filter dropdown (period selector).
 * Inspiré du modèle : "Chart title" à gauche, dropdown "Last 6 weeks" à droite.
 */
export function ChartSectionHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="font-display text-base font-bold text-encre">{title}</h2>
      </div>
      {children && <div className="flex-none">{children}</div>}
    </div>
  );
}
