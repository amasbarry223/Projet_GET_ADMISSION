"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatFCFA, formatFCFACompact } from "@/lib/format";
import { resolveFraisAgence } from "@/lib/dossier/frais-agence";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MotionButton } from "@/components/site/motion-button";
import { Reveal, RevealItem, RevealStagger } from "@/components/site/reveal";

export type UniversiteDetailData = {
  id: string;
  slug: string;
  nom: string;
  pays: string;
  drapeau: string;
  ville: string;
  ecusson: string;
  description: string;
  domaines: string[];
  pointsForts: string[];
  imageCouleur: string;
  typeEtablissement?: "PUBLIC" | "PRIVE";
  fraisMin: number;
  fraisMax: number;
  coverUrl?: string | null;
  logoUrl?: string | null;
  siteUrl?: string | null;
  galleryUrls: string[];
};

export type FormationDetailData = {
  id: string;
  intitule: string;
  niveau: string;
  domaine: string;
  duree: string;
  fraisAgence: number;
  prerequis: string[];
  piecesRequises: string[];
};

type Props = {
  universite: UniversiteDetailData;
  formations: FormationDetailData[];
  piecesUniques: string[];
  dossierBaseHref: string;
  /** Map formationId → URL dossier / inscription */
  formationHrefs: Record<string, string>;
};

const ease = [0.22, 1, 0.36, 1] as const;

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function UniversiteDetailView({
  universite,
  formations,
  piecesUniques,
  dossierBaseHref,
  formationHrefs,
}: Props) {
  const reduce = useReducedMotion();
  const [domaineFilter, setDomaineFilter] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(
    formations.length === 1 ? formations[0]!.id : null,
  );
  const [activeSection, setActiveSection] = React.useState("presentation");
  const fraisAgence = resolveFraisAgence(universite.typeEtablissement);

  const filtered = React.useMemo(() => {
    if (!domaineFilter) return formations;
    return formations.filter((f) => f.domaine === domaineFilter);
  }, [formations, domaineFilter]);

  React.useEffect(() => {
    const ids = ["presentation", "formations", "dossier"];
    const observers: IntersectionObserver[] = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const navItems = [
    { id: "presentation", label: "Présentation" },
    { id: "formations", label: "Formations" },
    { id: "dossier", label: "Dossier" },
  ] as const;

  return (
    <div className="bg-background pb-24 lg:pb-0">
      {/* Hero full-bleed */}
      <header className="relative min-h-[min(88svh,720px)] overflow-hidden">
        <div className={cn("absolute inset-0 bg-gradient-to-br", universite.imageCouleur)} />
        {universite.coverUrl ? (
          <Image
            src={universite.coverUrl}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Breadcrumb overlay */}
        <nav
          className="absolute left-0 right-0 top-0 z-20 border-b border-white/10 bg-black/20 backdrop-blur-sm"
          aria-label="Fil d'Ariane"
        >
          <div className="mx-auto flex max-w-content items-center gap-1.5 px-4 py-3 text-xs text-blanc/70 sm:px-6 lg:px-8">
            <Link href="/" className="hover:text-blanc">
              Accueil
            </Link>
            <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />
            <Link href="/universites" className="hover:text-blanc">
              Universités
            </Link>
            <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />
            <span className="truncate text-blanc">{universite.nom}</span>
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-[min(88svh,720px)] max-w-content flex-col justify-end px-4 pb-14 pt-24 sm:px-6 lg:px-8 lg:pb-20">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="max-w-3xl"
          >
            <div className="mb-6 flex items-center gap-4">
              <span className="relative flex h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-blanc/40 bg-card shadow-lg sm:h-20 sm:w-20">
                {universite.logoUrl ? (
                  <Image
                    src={universite.logoUrl}
                    alt=""
                    width={80}
                    height={80}
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-mono text-lg font-bold text-primary sm:text-xl">
                    {universite.ecusson}
                  </span>
                )}
              </span>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-eyebrow text-blanc/80">
                <span aria-hidden className="text-lg normal-case tracking-normal">
                  {universite.drapeau}
                </span>
                <span>{universite.pays}</span>
                <span className="text-blanc/40">·</span>
                <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  {universite.ville}
                </span>
              </div>
            </div>

            <h1 className="font-display text-4xl font-extrabold tracking-tight text-blanc text-balance sm:text-5xl lg:text-6xl">
              {universite.nom}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-blanc/85 sm:text-lg">
              {universite.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <MotionButton asChild size="lg">
                <Link href={dossierBaseHref}>
                  Candidater
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </Link>
              </MotionButton>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="border-blanc/35 bg-card/10 text-blanc backdrop-blur-sm hover:bg-card/20 hover:text-blanc"
                onClick={() => scrollToId("formations")}
              >
                Voir les formations
              </Button>
              {universite.siteUrl ? (
                <a
                  href={universite.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 text-sm text-blanc/75 underline-offset-4 hover:text-blanc hover:underline"
                >
                  Site officiel
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </motion.div>
        </div>
      </header>

      {/* Sticky subnav — sous le header site (h-20) */}
      <div className="sticky top-20 z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-content items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToId(item.id)}
              className={cn(
                "relative shrink-0 px-4 py-3.5 text-sm font-medium transition-colors",
                activeSection === item.id ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {activeSection === item.id ? (
                <motion.span
                  layoutId={reduce ? undefined : "univ-nav-ink"}
                  className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
            </button>
          ))}
          <div className="ml-auto hidden shrink-0 py-2 md:block">
            <MotionButton asChild size="sm">
              <Link href={dossierBaseHref}>
                Composer mon dossier
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </MotionButton>
          </div>
        </div>
      </div>

      {/* Galerie */}
      {universite.galleryUrls.length > 0 && (
        <section className="border-b border-border bg-card" aria-label="Galerie campus">
          <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
            <RevealStagger className="grid gap-3 sm:grid-cols-3">
              {universite.galleryUrls.slice(0, 3).map((src, i) => (
                <RevealItem key={src}>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
                    <Image
                      src={src}
                      alt={`Vue ${i + 1} — ${universite.nom}`}
                      fill
                      className="object-cover transition-transform duration-700 ease-out hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
                      sizes="(max-width:768px) 100vw, 33vw"
                      loading="lazy"
                    />
                  </div>
                </RevealItem>
              ))}
            </RevealStagger>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
          <div className="min-w-0 space-y-20">
            {/* Présentation */}
            <section id="presentation" className="scroll-mt-36" aria-labelledby="presentation-title">
              <Reveal>
                <p className="eyebrow">Présentation</p>
                <h2
                  id="presentation-title"
                  className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl"
                >
                  Une école ancrée à {universite.ville}.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {universite.description}
                </p>
              </Reveal>

              {universite.domaines.length > 0 && (
                <Reveal delay={0.08} className="mt-8">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">
                    Domaines — filtrez les formations
                  </p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par domaine">
                    <button
                      type="button"
                      onClick={() => setDomaineFilter(null)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                        domaineFilter === null
                          ? "bg-primary text-blanc"
                          : "bg-card text-foreground ring-1 ring-ligne hover:ring-lapis/40",
                      )}
                    >
                      Tous
                    </button>
                    {universite.domaines.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDomaineFilter((prev) => (prev === d ? null : d))}
                        className={cn(
                          "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                          domaineFilter === d
                            ? "bg-primary text-blanc"
                            : "bg-card text-foreground ring-1 ring-ligne hover:ring-lapis/40",
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </Reveal>
              )}

              {universite.pointsForts.length > 0 && (
                <Reveal delay={0.12} className="mt-12">
                  <p className="eyebrow">Points forts</p>
                  <h3 className="mt-3 font-display text-xl font-bold text-foreground sm:text-2xl">
                    Ce qui distingue cet établissement.
                  </h3>
                  <ul className="mt-6 space-y-0 divide-y divide-ligne border-y border-border">
                    {universite.pointsForts.map((point) => (
                      <li key={point} className="flex items-start gap-3 py-4">
                        <CheckCircle2
                          className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span className="text-base text-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}
            </section>

            {/* Formations interactives */}
            <section id="formations" className="scroll-mt-36" aria-labelledby="formations-title">
              <Reveal>
                <p className="eyebrow">Formations</p>
                <h2
                  id="formations-title"
                  className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                >
                  {filtered.length === 0
                    ? "Aucune formation pour ce filtre"
                    : `${filtered.length} formation${filtered.length > 1 ? "s" : ""} accessible${filtered.length > 1 ? "s" : ""}`}
                </h2>
              </Reveal>

              {formations.length === 0 ? (
                <p className="mt-8 text-sm text-muted-foreground">
                  Aucune formation n&apos;est actuellement ouverte. Contactez un conseiller pour les
                  prochaines campagnes.
                </p>
              ) : (
                <LayoutGroup>
                  <ul className="mt-8 space-y-3">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {filtered.map((f) => {
                        const open = expandedId === f.id;
                        return (
                          <motion.li
                            key={f.id}
                            layout={!reduce}
                            initial={reduce ? false : { opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduce ? undefined : { opacity: 0, y: -8 }}
                            transition={{ duration: 0.35, ease }}
                            className={cn(
                              "overflow-hidden rounded-xl border bg-card transition-shadow",
                              open
                                ? "border-primary/35 shadow-[0_12px_40px_rgba(60,169,54,0.12)]"
                                : "border-border hover:border-primary/25",
                            )}
                          >
                            <button
                              type="button"
                              aria-expanded={open}
                              onClick={() => setExpandedId(open ? null : f.id)}
                              className="flex w-full items-start gap-4 p-5 text-left sm:items-center sm:p-6"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="bg-primary/10 font-mono text-[10px] font-medium text-primary hover:bg-primary/10">
                                    {f.niveau}
                                  </Badge>
                                  <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">
                                    {f.domaine}
                                  </span>
                                  <span className="font-mono text-[10px] text-muted-foreground/60">·</span>
                                  <span className="font-mono text-[10px] text-muted-foreground">{f.duree}</span>
                                </div>
                                <p className="mt-2 font-display text-lg font-bold text-foreground sm:text-xl">
                                  {f.intitule}
                                </p>
                                <p className="mt-1 font-mono text-sm font-semibold text-primary">
                                  {formatFCFA(fraisAgence)}{" "}
                                  <span className="font-sans text-xs font-normal text-muted-foreground">
                                    frais d&apos;agence
                                    {universite.typeEtablissement === "PUBLIC"
                                      ? " (public)"
                                      : " (privé)"}
                                  </span>
                                </p>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none",
                                  open && "rotate-180 text-primary",
                                )}
                                strokeWidth={1.75}
                                aria-hidden
                              />
                            </button>

                            <AnimatePresence initial={false}>
                              {open && (
                                <motion.div
                                  key="details"
                                  initial={reduce ? false : { height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                                  transition={{ duration: 0.35, ease }}
                                  className="overflow-hidden"
                                >
                                  <div className="border-t border-border px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                                    {f.prerequis.length > 0 && (
                                      <div>
                                        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">
                                          Prérequis
                                        </p>
                                        <ul className="mt-2 space-y-1.5">
                                          {f.prerequis.map((p) => (
                                            <li
                                              key={p}
                                              className="flex items-start gap-2 text-sm text-foreground"
                                            >
                                              <CheckCircle2
                                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-vert"
                                                strokeWidth={1.75}
                                              />
                                              {p}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    <div className={f.prerequis.length ? "mt-4" : undefined}>
                                      <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">
                                        Documents du dossier
                                      </p>
                                      <p className="mt-2 text-sm text-muted-foreground">
                                        Les pièces académiques (bulletins, bac, relevés) sont
                                        adaptées automatiquement à votre profil lors de la
                                        constitution du dossier.
                                      </p>
                                      {f.piecesRequises.length > 0 && (
                                        <>
                                          <p className="mt-3 font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">
                                            Compléments demandés pour cette formation
                                          </p>
                                          <ul className="mt-2 flex flex-wrap gap-2">
                                            {f.piecesRequises.map((p) => (
                                              <li
                                                key={p}
                                                className="rounded-md bg-background px-2.5 py-1 text-xs text-foreground"
                                              >
                                                {p}
                                              </li>
                                            ))}
                                          </ul>
                                        </>
                                      )}
                                    </div>
                                    <MotionButton asChild size="lg" className="mt-5">
                                      <Link href={formationHrefs[f.id] ?? dossierBaseHref}>
                                        Choisir cette formation
                                        <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                                      </Link>
                                    </MotionButton>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                </LayoutGroup>
              )}

              {domaineFilter && filtered.length === 0 && formations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDomaineFilter(null)}
                  className="mt-4 text-sm font-medium text-primary hover:underline"
                >
                  Réinitialiser le filtre
                </button>
              )}
            </section>

            {/* Pièces */}
            <section aria-labelledby="pieces-title">
              <Reveal>
                <p className="eyebrow">Dossier</p>
                <h3
                  id="pieces-title"
                  className="mt-3 font-display text-2xl font-bold text-foreground sm:text-3xl"
                >
                  Un dossier adapté à votre parcours.
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Les pièces académiques demandées dépendent de votre profil (lycéen ou bachelier,
                  redoublements, interruptions). Elles sont générées automatiquement à la
                  constitution du dossier.
                </p>
                {piecesUniques.length > 0 && (
                  <>
                    <p className="mt-6 font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">
                      Compléments fréquents pour ces formations
                    </p>
                    <ul className="mt-3 columns-1 gap-x-10 sm:columns-2">
                      {piecesUniques.map((piece) => (
                        <li
                          key={piece}
                          className="mb-3 flex break-inside-avoid items-start gap-2.5 text-sm text-foreground"
                        >
                          <FileText
                            className="mt-0.5 h-4 w-4 shrink-0 text-or"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          {piece}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Reveal>
            </section>
          </div>

          {/* Rail CTA — en flux mobile, sticky desktop */}
          <aside
            id="dossier"
            className="scroll-mt-36 lg:sticky lg:top-36 lg:self-start"
            aria-labelledby="dossier-title"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-30 blur-2xl",
                  universite.imageCouleur,
                )}
              />
              <p className="eyebrow relative">Démarrer</p>
              <h3 id="dossier-title" className="relative mt-3 font-display text-xl font-bold text-foreground">
                Composer mon dossier
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                Un conseiller GET Admission vous guide pas à pas jusqu&apos;à l&apos;admission.
              </p>

              <div className="relative mt-5 border-y border-border py-4">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">
                  Frais d&apos;agence
                </p>
                <p className="mt-1 font-mono text-base font-semibold text-foreground">
                  {formatFCFA(fraisAgence)}
                  <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">
                    {universite.typeEtablissement === "PUBLIC" ? "établissement public" : "établissement privé"}
                  </span>
                </p>
              </div>

              <MotionButton asChild size="lg" className="relative mt-5 w-full">
                <Link href={dossierBaseHref}>
                  Candidater
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </Link>
              </MotionButton>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="relative mt-2 w-full border-border bg-card text-foreground hover:bg-background"
              >
                <Link href="/contact">
                  <Phone className="h-4 w-4" strokeWidth={1.75} />
                  Parler à un conseiller
                </Link>
              </Button>

              <ul className="relative mt-6 space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-vert" strokeWidth={1.5} />
                  Établissement vérifié
                </li>
                <li className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-vert" strokeWidth={1.5} />
                  Frais et délais publiés
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-vert" strokeWidth={1.5} />
                  Conseiller sous 24h ouvrées
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky CTA mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-content items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{universite.ville}</p>
            <p className="truncate font-mono text-sm font-semibold text-foreground">
              {formatFCFACompact(fraisAgence)}
            </p>
          </div>
          <MotionButton asChild size="lg" className="shrink-0">
            <Link href={dossierBaseHref}>
              Démarrer
              <ArrowRight className="h-4 w-4" />
            </Link>
          </MotionButton>
        </div>
      </div>
    </div>
  );
}
