"use client";

import { SessionProvider } from "next-auth/react";

/**
 * `next-auth/react` n'a pas son propre marqueur "use client" — il ne devient du code client
 * que via le fichier qui l'importe. Un Server Component (ex. src/app/admin/layout.tsx) qui
 * importerait SessionProvider directement le ferait évaluer côté serveur, où son
 * `createContext()` interne plante ("React Context is unavailable in Server Components").
 * Ce wrapper local, comme src/components/providers.tsx pour le portail candidat, est le point
 * de passage "use client" obligatoire pour le portail staff (/admin, /back-office).
 */
import { IdleSessionTimer } from "@/components/idle-session-timer";

export function StaffSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth/staff">
      <IdleSessionTimer portal="staff" />
      {children}
    </SessionProvider>
  );
}
