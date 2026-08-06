"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useAdminTheme } from "@/components/admin/admin-theme-provider";
import { Button } from "@/components/ui/button";

export function AdminThemeToggle() {
  const { resolvedTheme, setTheme } = useAdminTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-ardoise hover:text-lapis"
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}
    </Button>
  );
}
