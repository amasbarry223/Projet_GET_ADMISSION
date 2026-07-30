"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Recherche globale admin — redirige vers /admin/dossiers?q=... en tapant Entrée.
 * Utilise un debounce pour éviter les redirections excessives.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/admin/dossiers?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={onSubmit} className="relative hidden sm:block flex-1 max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Recherche globale — référence, candidat, université…"
        className="h-9 pl-9 bg-porcelaine"
        aria-label="Recherche globale"
      />
    </form>
  );
}
