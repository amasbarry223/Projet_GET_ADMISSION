"use client";

import * as React from "react";
import { useServerInsertedHTML } from "next/navigation";

const STORAGE_KEY = "getadm-vitrine-theme";

export type VitrineTheme = "dark" | "light";

type ThemeContextValue = {
  theme: VitrineTheme;
  resolvedTheme: VitrineTheme;
  setTheme: (theme: VitrineTheme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyTheme(theme: VitrineTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

function readStoredTheme(): VitrineTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

const listeners = new Set<() => void>();
let currentTheme: VitrineTheme | null = null;

function getClientTheme(): VitrineTheme {
  if (currentTheme) return currentTheme;
  currentTheme = readStoredTheme();
  return currentTheme;
}

function setClientTheme(theme: VitrineTheme) {
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

/** Script anti-FOUC injecté hors de l’arbre React (pas d’avertissement React 19). */
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(t!=="light"&&t!=="dark")t="dark";var d=document.documentElement;d.classList.remove("light","dark");d.classList.add(t);d.style.colorScheme=t;}catch(e){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}})();`;

/**
 * Thème isolé à la vitrine : dark par défaut.
 * Au démontage (navigation hors vitrine), retire `dark` de <html>.
 */
export function VitrineThemeProvider({ children }: { children: React.ReactNode }) {
  const inserted = React.useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
  });

  const theme = React.useSyncExternalStore(subscribe, getClientTheme, () => "dark" as VitrineTheme);

  React.useEffect(() => {
    applyTheme(getClientTheme());
    return () => {
      currentTheme = null;
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.style.colorScheme = "light";
    };
  }, []);

  const setTheme = React.useCallback((next: VitrineTheme) => {
    setClientTheme(next);
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme: theme, setTheme }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
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
