import * as React from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

/**
 * État vide partagé — listes, tables, pages sans données.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-ligne bg-porcelaine/50 px-6 py-12 text-center",
        className,
      )}
      role="status"
    >
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-lapis/10 text-lapis">
          {icon}
        </div>
      ) : null}
      <p className="font-display text-base font-bold text-encre">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-ardoise">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
