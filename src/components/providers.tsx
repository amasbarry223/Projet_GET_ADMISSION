"use client";

import React, { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Root providers:
 * - NextAuth SessionProvider, scopé par défaut sur le portail candidat (cookie de session
 *   dédié, voir src/lib/auth.ts) — le site public, /connexion et /espace/* en héritent tel
 *   quel. /admin/* et /back-office imbriquent leur propre SessionProvider basePath="/api/auth/staff"
 *   pour porter une session staff totalement indépendante dans le même navigateur.
 * - React Query (cache partagé dossiers espace candidat)
 */
import { IdleSessionTimer } from "@/components/idle-session-timer";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <SessionProvider basePath="/api/auth/candidat">
      <IdleSessionTimer portal="candidat" />
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}

export { SmoothScrollProvider } from "@/lib/smooth-scroll";
