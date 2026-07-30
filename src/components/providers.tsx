"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/lib/auth-context";

/**
 * Root providers:
 * - NextAuth SessionProvider (vraie auth JWT)
 * - AuthProvider (legacy demo context — sera déprécié)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>{children}</AuthProvider>
    </SessionProvider>
  );
}

export { SmoothScrollProvider } from "@/lib/smooth-scroll";
