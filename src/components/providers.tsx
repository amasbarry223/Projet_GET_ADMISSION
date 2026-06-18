"use client";

import React from "react";
import { AuthProvider } from "@/lib/auth-context";
import { SmoothScrollProvider } from "@/lib/smooth-scroll";

/**
 * Root providers:
 * - Auth (mock, role selector)
 * - Smooth scroll (Lenis) — active on the public vitrine only, mounted where needed
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export { SmoothScrollProvider };
