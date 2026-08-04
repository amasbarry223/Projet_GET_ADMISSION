"use client";

import * as React from "react";

/**
 * Retire la classe `dark` du document hors vitrine
 * (le thème vitrine l'applique sur <html> et peut persister à la navigation).
 */
export function ForceLightDocument() {
  React.useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }, []);
  return null;
}
