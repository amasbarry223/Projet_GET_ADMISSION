import type { ReactNode } from "react";

/** Regroupe un ensemble de champs sous un intitulé — évite la grille plate de 10+ champs. */
export function LogementFormSection({
  title,
  description,
  children,
  first = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  first?: boolean;
}) {
  return (
    <div className={first ? "space-y-4" : "space-y-4 border-t border-ligne pt-6"}>
      <div>
        <h3 className="text-sm font-semibold text-encre">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-ardoise">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}
