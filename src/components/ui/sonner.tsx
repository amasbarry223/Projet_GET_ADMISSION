"use client";

import * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function useDocumentTheme(): NonNullable<ToasterProps["theme"]> {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      const root = document.documentElement;
      const observer = new MutationObserver(onStoreChange);
      observer.observe(root, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light",
  );
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useDocumentTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
