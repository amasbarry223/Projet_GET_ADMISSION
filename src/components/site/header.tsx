"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";

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

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled ? "bg-blanc/90 backdrop-blur-md border-b border-ligne shadow-sm" : "bg-transparent"
      )}
    >
      <div className="rule-or" aria-hidden />
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="Accueil GET Admission">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-lapis text-blanc shadow-sm">
            <Plane className="h-4 w-4 -rotate-12" strokeWidth={1.75} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-base font-bold tracking-tight text-encre">GET Admission</span>
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Le passage</span>
          </span>
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
                  active ? "text-lapis" : "text-encre/80 hover:text-lapis"
                )}
              >
                {item.label}
                {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-or" />}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-encre hover:text-lapis">
            <Link href="/connexion">Se connecter</Link>
          </Button>
          <Button asChild size="sm" className="bg-lapis text-blanc hover:bg-lapis/90">
            <Link href="/inscription">Créer mon dossier</Link>
          </Button>
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-blanc p-0">
              <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
              <div className="flex h-16 items-center justify-between border-b border-ligne px-4">
                <span className="font-display font-bold text-encre">GET Admission</span>
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
                <SheetClose asChild>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/connexion">Se connecter</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild className="w-full bg-lapis text-blanc hover:bg-lapis/90">
                    <Link href="/inscription">Créer mon dossier</Link>
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
