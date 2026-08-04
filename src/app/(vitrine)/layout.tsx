import * as React from "react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SmoothScrollProvider } from "@/lib/smooth-scroll";
import { VitrineThemeProvider } from "@/components/site/vitrine-theme-provider";

/**
 * Layout de la vitrine publique.
 * Thème dark-first isolé + smooth scroll Lenis + shell.
 */
export default function VitrineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VitrineThemeProvider>
      <SmoothScrollProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </SmoothScrollProvider>
    </VitrineThemeProvider>
  );
}
