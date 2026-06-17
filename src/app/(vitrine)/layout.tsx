import * as React from "react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SmoothScrollProvider } from "@/lib/smooth-scroll";

/**
 * Layout de la vitrine publique.
 * Monte le smooth scroll Lenis une seule fois, header sticky + footer collé en bas.
 */
export default function VitrineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScrollProvider>
      <div className="flex min-h-screen flex-col bg-porcelaine">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </SmoothScrollProvider>
  );
}
