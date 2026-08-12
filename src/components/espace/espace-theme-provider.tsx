"use client";

import * as React from "react";
import { useServerInsertedHTML } from "next/navigation";

const STORAGE_KEY = "getadm-espace-theme";

export type EspaceTheme = "dark" | "light";

type ThemeContextValue = {
  theme: EspaceTheme;
  resolvedTheme: EspaceTheme;
  setTheme: (theme: EspaceTheme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyTheme(theme: EspaceTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

function readStoredTheme(): EspaceTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

const listeners = new Set<() => void>();
let currentTheme: EspaceTheme | null = null;

function getClientTheme(): EspaceTheme {
  if (currentTheme) return currentTheme;
  currentTheme = readStoredTheme();
  return currentTheme;
}

function setClientTheme(theme: EspaceTheme) {
  currentTheme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Script anti-FOUC injecté hors de l'arbre React. */
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(t!=="light"&&t!=="dark")t="light";var d=document.documentElement;d.classList.remove("light","dark");d.classList.add(t);d.style.colorScheme=t;}catch(e){}})();`;

/**
 * Thème isolé à l'espace candidat : clair par défaut (comme le back-office), indépendant
 * du thème vitrine. Au démontage (navigation hors espace), retire `dark`.
 */
export function EspaceThemeProvider({ children }: { children: React.ReactNode }) {
  const inserted = React.useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
  });

  const theme = React.useSyncExternalStore(subscribe, getClientTheme, () => "light" as EspaceTheme);

  React.useEffect(() => {
    applyTheme(getClientTheme());
    return () => {
      currentTheme = null;
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.style.colorScheme = "light";
    };
  }, []);

  const setTheme = React.useCallback((next: EspaceTheme) => {
    setClientTheme(next);
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme: theme, setTheme }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useEspaceTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "light",
      resolvedTheme: "light",
      setTheme: () => undefined,
    };
  }
  return ctx;
}
