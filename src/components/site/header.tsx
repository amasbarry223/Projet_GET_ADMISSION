"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/site/theme-toggle";

const NAV = [
  { href: "/universites", label: "Universités" },
  { href: "/a-propos", label: "À propos" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

/**
 * Navbar vitrine — glass sticky au scroll, dark/light via ThemeToggle.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const isCandidat = status === "authenticated" && role === "CANDIDAT";

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Espace public : toujours les 2 CTA visiteurs, sauf candidat connecté → « Mon espace »
  const primaryHref = isCandidat ? "/espace" : "/inscription";
  const primaryLabel = isCandidat ? "Mon espace" : "Créer mon compte";
  const showLogin = !isCandidat;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-[background-color,border-color,box-shadow] duration-300",
        scrolled
          ? "border-border bg-background/80 shadow-md backdrop-blur-xl"
          : "border-transparent bg-background/60 backdrop-blur-md",
      )}
    >
      <div className="rule-or" aria-hidden />
      <div className="mx-auto flex h-[4.5rem] max-w-content items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Accueil GET Admission"
        >
          <BrandLogo height={48} className="max-h-12 w-auto max-w-[200px] sm:max-w-[240px]" priority />
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Navigation principale">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-md px-3.5 py-2 text-[0.9375rem] font-semibold tracking-tight transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/85 hover:bg-muted hover:text-primary",
                )}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-primary"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {showLogin && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 border-border bg-card px-4 font-semibold text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary"
            >
              <Link href="/connexion">Se connecter</Link>
            </Button>
          )}
          <Button asChild size="sm" className="h-9 bg-primary px-4 font-semibold text-primary-foreground hover:bg-or">
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Ouvrir le menu"
                className="h-10 w-10 border-border text-foreground hover:bg-muted"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,320px)] border-border bg-background p-0">
              <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
              <div className="flex h-[4.5rem] items-center justify-between border-b border-border px-4">
                <BrandLogo height={40} className="max-w-[180px]" />
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Fermer" className="text-foreground hover:bg-muted">
                    <X className="h-5 w-5" />
                  </Button>
                </SheetClose>
              </div>
              <nav className="flex flex-col gap-1 p-3" aria-label="Navigation mobile">
                {NAV.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "rounded-md px-3 py-3 text-base font-semibold transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted hover:text-primary",
                        )}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
              <div className="flex flex-col gap-2 border-t border-border px-4 py-4">
                {showLogin && (
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full font-semibold">
                      <Link href="/connexion">Se connecter</Link>
                    </Button>
                  </SheetClose>
                )}
                <SheetClose asChild>
                  <Button asChild className="w-full bg-primary font-semibold text-primary-foreground hover:bg-or">
                    <Link href={primaryHref}>{primaryLabel}</Link>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
