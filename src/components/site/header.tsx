"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
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

const springPill = { type: "spring" as const, stiffness: 420, damping: 34 };

export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isCandidat = status === "authenticated" && role === "CANDIDAT";
  const overDarkHero = pathname === "/" && !scrolled;

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Navbar vitrine = parcours candidat uniquement (pas d'entrée Back-office).
  const primaryHref = isCandidat ? "/espace" : "/inscription";
  const primaryLabel = isCandidat ? "Mon espace" : "Créer mon compte";
  const showPrimaryCta = status !== "authenticated" || isCandidat;

  return (
    <header className="sticky top-0 z-40 w-full pointer-events-none">
      <div className="px-3 pt-3 sm:px-4 sm:pt-4">
        <div
          className={cn(
            "pointer-events-auto mx-auto flex max-w-content items-center justify-between gap-2 rounded-full border px-3 transition-all duration-300 sm:px-4",
            scrolled ? "h-12 shadow-[0_8px_32px_rgba(46,131,41,0.10)]" : "h-14 shadow-[0_8px_28px_rgba(26,26,26,0.08)]",
            overDarkHero
              ? "border-blanc/15 bg-encre/40 backdrop-blur-xl"
              : "border-ligne/80 bg-blanc/80 backdrop-blur-xl"
          )}
        >
          <Link
            href="/"
            className={cn(
              "flex shrink-0 items-center",
              overDarkHero && "drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]"
            )}
            aria-label="Accueil GET Admission"
          >
            <BrandLogo
              height={scrolled ? 36 : 44}
              className={cn(
                "w-auto max-w-[160px] transition-[height] duration-300 sm:max-w-[220px]",
                scrolled ? "max-h-9" : "max-h-11"
              )}
              priority
            />
          </Link>

          <LayoutGroup>
            <nav className="hidden md:flex items-center gap-0.5" aria-label="Navigation principale">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative px-3.5 py-1.5 text-sm font-medium rounded-full transition-[color,transform,background-color] duration-200",
                      !reduce && "hover:scale-[1.02]",
                      overDarkHero
                        ? active
                          ? "text-blanc"
                          : "text-blanc/75 hover:bg-blanc/10 hover:text-blanc"
                        : active
                          ? "text-lapis"
                          : "text-encre/75 hover:bg-or-pale/70 hover:text-lapis"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={reduce ? undefined : "nav-active-pill"}
                        className={cn(
                          "absolute inset-0 z-0 rounded-full",
                          overDarkHero ? "bg-blanc/15" : "bg-or-pale"
                        )}
                        transition={springPill}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </LayoutGroup>

          <div className="hidden md:flex items-center gap-1.5">
            {status !== "authenticated" && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-full px-4",
                  overDarkHero
                    ? "text-blanc hover:bg-blanc/10 hover:text-blanc"
                    : "text-encre hover:bg-or-pale hover:text-lapis"
                )}
              >
                <Link href="/connexion?portal=etudiant">Se connecter</Link>
              </Button>
            )}
            {showPrimaryCta && (
              <Button
                asChild
                size="sm"
                className={cn(
                  "rounded-full bg-lapis px-4 text-blanc shadow-[0_0_0_0_rgba(60,169,54,0.35)] hover:bg-or hover:shadow-[0_0_0_6px_rgba(60,169,54,0.12)]",
                  !reduce && "transition-transform hover:scale-[1.03]"
                )}
              >
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
            )}
          </div>

          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Ouvrir le menu"
                  className={cn(
                    "rounded-full",
                    overDarkHero && "text-blanc hover:bg-blanc/10 hover:text-blanc"
                  )}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[min(100%,340px)] border-l border-ligne bg-blanc p-0 gap-0 [&>button.absolute]:hidden"
              >
                <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
                <div className="flex h-16 items-center justify-between border-b border-ligne px-5">
                  <BrandLogo height={40} className="max-w-[180px]" />
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" aria-label="Fermer" className="rounded-full">
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>

                <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Navigation mobile">
                  {NAV.map((item, i) => {
                    const active =
                      pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "rounded-2xl px-4 py-3.5 font-display text-lg font-medium transition-colors",
                            "animate-fade-up",
                            active
                              ? "bg-or-pale text-lapis"
                              : "text-encre hover:bg-porcelaine hover:text-lapis"
                          )}
                          style={
                            reduce
                              ? undefined
                              : { animationDelay: `${i * 60}ms` }
                          }
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </nav>

                <div className="mt-auto flex flex-col gap-2 border-t border-ligne px-5 py-5">
                  <div className="mb-1 h-px w-12 rounded-full bg-lapis/40" aria-hidden />
                  {status !== "authenticated" && (
                    <SheetClose asChild>
                      <Button asChild variant="outline" className="w-full rounded-full">
                        <Link href="/connexion?portal=etudiant">Se connecter</Link>
                      </Button>
                    </SheetClose>
                  )}
                  {showPrimaryCta && (
                    <SheetClose asChild>
                      <Button
                        asChild
                        className="w-full rounded-full bg-lapis text-blanc hover:bg-or"
                      >
                        <Link href={primaryHref}>{primaryLabel}</Link>
                      </Button>
                    </SheetClose>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
