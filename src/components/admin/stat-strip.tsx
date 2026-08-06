import { cn } from "@/lib/utils";

export type StatItem = {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
};

/**
 * Bande de statistiques restreinte (register "product" — accent réservé au sens,
 * pas à la décoration). Remplace le pattern "carte KPI par métrique, une couleur
 * saturée chacune" — banni par PRODUCT.md (KPI-hero template) et par la règle
 * produit "Restrained is the floor".
 */
export function StatStrip({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 divide-y divide-ligne rounded-xl border border-ligne bg-card sm:grid-cols-3 sm:divide-y-0 sm:divide-x lg:grid-cols-5",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4">
          <p className="text-xs text-ardoise">{item.label}</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <p className="font-display text-2xl font-bold tracking-tight text-encre">{item.value}</p>
            {typeof item.delta === "number" && item.delta !== 0 && (
              <span
                className={cn(
                  "font-mono text-xs font-medium",
                  item.delta >= 0 ? "text-vert" : "text-carmin",
                )}
              >
                {item.delta >= 0 ? "+" : ""}
                {item.delta}%
              </span>
            )}
          </div>
          {item.deltaLabel && <p className="mt-0.5 text-[11px] text-ardoise/80">{item.deltaLabel}</p>}
        </div>
      ))}
    </div>
  );
}
