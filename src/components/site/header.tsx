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

const NAV = [
  { href: "/universites", label: "Universités" },
  { href: "/a-propos", label: "À propos" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isCandidat = status === "authenticated" && role === "CANDIDAT";
  const isStaff = status === "authenticated" && role && role !== "CANDIDAT";
  const overDarkHero = pathname === "/" && !scrolled;

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const primaryHref = isCandidat ? "/espace" : isStaff ? "/admin" : "/inscription";
  const primaryLabel = isCandidat ? "Mon espace" : isStaff ? "Back-office" : "Créer mon compte";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled ? "bg-blanc/90 backdrop-blur-md border-b border-ligne shadow-sm" : "bg-transparent"
      )}
    >
      <div className="rule-or" aria-hidden />
      <div className="mx-auto flex h-20 max-w-content items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={cn(
            "flex shrink-0 items-center group",
            overDarkHero && "drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]"
          )}
          aria-label="Accueil GET Admission"
        >
          <BrandLogo height={52} className="max-h-14 w-auto max-w-[220px] sm:max-w-[280px]" priority />
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Navigation principale">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  overDarkHero
                    ? active
                      ? "text-blanc"
                      : "text-blanc/80 hover:text-blanc"
                    : active
                      ? "text-lapis"
                      : "text-encre/80 hover:text-lapis"
                )}
              >
                {item.label}
                {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-or" />}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {status !== "authenticated" && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                overDarkHero
                  ? "text-blanc hover:bg-blanc/10 hover:text-blanc"
                  : "text-encre hover:text-lapis"
              )}
            >
              <Link href="/connexion">Se connecter</Link>
            </Button>
          )}
          <Button asChild size="sm" className="bg-lapis text-blanc hover:bg-lapis/90">
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
        </div>

        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ouvrir le menu"
                className={cn(overDarkHero && "text-blanc hover:bg-blanc/10 hover:text-blanc")}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-blanc p-0">
              <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
              <div className="flex h-20 items-center justify-between border-b border-ligne px-4">
                <BrandLogo height={44} className="max-w-[200px]" />
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Fermer">
                    <X className="h-5 w-5" />
                  </Button>
                </SheetClose>
              </div>
              <nav className="flex flex-col p-2" aria-label="Navigation mobile">
                {NAV.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded-md px-3 py-3 text-base font-medium text-encre hover:bg-porcelaine hover:text-lapis"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-2 flex flex-col gap-2 px-4">
                {status !== "authenticated" && (
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/connexion">Se connecter</Link>
                    </Button>
                  </SheetClose>
                )}
                <SheetClose asChild>
                  <Button asChild className="w-full bg-lapis text-blanc hover:bg-lapis/90">
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
