import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  FileText,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

import { db } from "@/lib/db";
import { formatFCFA, formatFCFACompact } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const univs = await db.universite.findMany({ select: { slug: true } });
  return univs.map((u) => ({ slug: u.slug }));
}

export default async function UniversiteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await db.universite.findUnique({
    where: { slug },
    include: { formations: true },
  });
  if (!row) notFound();

  // Normalise : parse les champs JSON string (SQLite limitation).
  const universite = {
    ...row,
    domaines: JSON.parse(row.domaines) as string[],
    pointsForts: JSON.parse(row.pointsForts) as string[],
  };
  const formations = row.formations.map((f) => ({
    ...f,
    prerequis: JSON.parse(f.prerequis) as string[],
    piecesRequises: JSON.parse(f.piecesRequises) as string[],
  }));

  // PiecesRequises dédupliquées (toutes formations confondues)
  const piecesUniques = Array.from(new Set(formations.flatMap((f) => f.piecesRequises))).sort(
    (a, b) => a.localeCompare(b, "fr")
  );

  return (
    <>
      {/* Fil d'ariane */}
      <div className="border-b border-ligne bg-blanc">
        <div className="mx-auto max-w-content px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="text-ardoise hover:text-lapis">
                    Accueil
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3 w-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/universites" className="text-ardoise hover:text-lapis">
                    Universités
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3 w-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-encre">{universite.nom}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Bandeau d'en-tête */}
      <header
        className={cn("relative overflow-hidden bg-gradient-to-br", universite.imageCouleur)}
      >
        {/* Scrim pour lisibilité du texte blanc */}
        <div
          aria-hidden
          className="absolute inset-0 bg-encre/35"
        />
        <div className="relative mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blanc shadow-md">
              <span className="font-mono text-xl font-bold text-lapis">
                {universite.ecusson}
              </span>
            </span>
            <div>
              <div className="flex items-center gap-2 text-blanc/90">
                <span className="text-2xl" aria-hidden>
                  {universite.drapeau}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-eyebrow">
                  {universite.pays}
                </span>
              </div>
              <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tightest text-blanc sm:text-5xl">
                {universite.nom}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-blanc/90">
                <MapPin className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                {universite.ville}, {universite.pays}
              </p>
            </div>
          </div>
        </div>
        <div className="rule-or" aria-hidden />
      </header>

      {/* Corps : 2 colonnes */}
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          {/* Colonne principale */}
          <main className="min-w-0 space-y-12">
            {/* Présentation */}
            <section aria-labelledby="presentation-title">
              <p className="eyebrow">Présentation</p>
              <h2
                id="presentation-title"
                className="mt-3 font-display text-2xl font-bold tracking-tightest text-encre sm:text-3xl"
              >
                Une université partenaire vérifiée.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-ardoise">
                {universite.description}
              </p>
            </section>

            {/* Points forts */}
            <section aria-labelledby="points-forts-title">
              <p className="eyebrow">Points forts</p>
              <h3
                id="points-forts-title"
                className="mt-3 font-display text-xl font-bold text-encre"
              >
                Ce qui distingue cette université.
              </h3>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {universite.pointsForts.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 rounded-md border border-ligne bg-blanc p-4"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-vert"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="text-sm text-encre">{point}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Formations */}
            <section aria-labelledby="formations-title">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Formations</p>
                  <h2
                    id="formations-title"
                    className="mt-3 font-display text-2xl font-bold tracking-tightest text-encre sm:text-3xl"
                  >
                    {formations.length} formation{formations.length > 1 ? "s" : ""} accessible
                    {formations.length > 1 ? "s" : ""}
                  </h2>
                </div>
              </div>

              {formations.length === 0 ? (
                <p className="mt-6 rounded-md border border-ligne bg-blanc p-6 text-sm text-ardoise">
                  Aucune formation n'est actuellement ouverte pour cette université. Contactez un
                  conseiller pour connaître les prochaines campagnes.
                </p>
              ) : (
                <div className="mt-6 overflow-hidden rounded-lg border border-ligne bg-blanc shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-porcelaine">
                        <TableHead className="pl-4 text-encre">Formation</TableHead>
                        <TableHead className="text-encre">Niveau</TableHead>
                        <TableHead className="text-encre">Domaine</TableHead>
                        <TableHead className="text-encre">Durée</TableHead>
                        <TableHead className="text-right text-encre">Frais d'agence</TableHead>
                        <TableHead className="pr-4 text-right text-encre">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formations.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="pl-4">
                            <span className="font-medium text-encre">{f.intitule}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="bg-lapis/10 font-mono text-[11px] font-medium text-lapis"
                            >
                              {f.niveau}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-ardoise">{f.domaine}</TableCell>
                          <TableCell className="font-mono text-xs text-ardoise">{f.duree}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold text-encre">
                            {formatFCFA(f.fraisAgence)}
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="border-lapis/30 text-lapis hover:bg-porcelaine"
                            >
                              <Link href="/inscription">
                                Choisir
                                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            {/* Pièces généralement requises */}
            {piecesUniques.length > 0 && (
              <section aria-labelledby="pieces-title">
                <p className="eyebrow">Pièces généralement requises</p>
                <h3
                  id="pieces-title"
                  className="mt-3 font-display text-xl font-bold text-encre"
                >
                  Préparez votre dossier en amont.
                </h3>
                <div className="mt-5 rounded-lg border border-ligne bg-or-pale/40 p-6">
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {piecesUniques.map((piece) => (
                      <li key={piece} className="flex items-start gap-2.5 text-sm text-encre">
                        <FileText
                          className="mt-0.5 h-4 w-4 shrink-0 text-or"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span>{piece}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 text-xs text-ardoise">
                    Liste indicative. Votre conseiller vous confirmera les pièces exactes selon la
                    formation choisie.
                  </p>
                </div>
              </section>
            )}
          </main>

          {/* Sidebar sticky */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-ligne bg-blanc p-6 shadow-sm">
              <div className="rule-or -mx-6 -mt-6 mb-5" aria-hidden />
              <p className="eyebrow">Démarrer</p>
              <h3 className="mt-3 font-display text-xl font-bold text-encre">
                Démarrer mon dossier
              </h3>
              <p className="mt-2 text-sm text-ardoise">
                Choisissez votre formation et un conseiller vous accompagne pas à pas.
              </p>

              <div className="mt-5 rounded-md border border-ligne bg-porcelaine p-4">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                  Frais d'agence
                </p>
                <p className="mt-1 font-mono text-base font-semibold text-encre">
                  {formatFCFACompact(universite.fraisMin)} – {formatFCFACompact(universite.fraisMax)}
                </p>
              </div>

              <Button asChild size="lg" className="mt-5 w-full bg-lapis text-blanc hover:bg-lapis/90">
                <Link href="/inscription">
                  Créer mon dossier
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="mt-2 w-full border-ligne bg-blanc text-encre hover:bg-porcelaine"
              >
                <Link href="/contact">
                  <Phone className="h-4 w-4" strokeWidth={1.75} />
                  Parler à un conseiller
                </Link>
              </Button>

              {/* Reassurance */}
              <ul className="mt-6 space-y-2.5 border-t border-ligne pt-5 text-xs text-ardoise">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-vert" strokeWidth={1.5} />
                  Université vérifiée par GET Admission
                </li>
                <li className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-vert" strokeWidth={1.5} />
                  Frais et délais publiés, sans surprise
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-vert" strokeWidth={1.5} />
                  Conseiller dédié sous 24h ouvrées
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
