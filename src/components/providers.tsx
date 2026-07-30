"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";

/**
 * Root providers:
 * - NextAuth SessionProvider (vraie auth JWT + RBAC)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export { SmoothScrollProvider } from "@/lib/smooth-scroll";
