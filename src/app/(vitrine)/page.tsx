import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  UserPlus,
  FileText,
  CreditCard,
  Stamp,
  Quote,
  Plane,
} from "lucide-react";

import { BoardingPass } from "@/components/getadm/boarding-pass";
import { Reveal, RevealStagger, RevealItem, Eyebrow } from "@/components/site/reveal";
import { HorizontalCarnet } from "@/components/site/horizontal-carnet";
import { AnimatedCounters } from "@/components/site/animated-counters";
import { MotionButton } from "@/components/site/motion-button";
import { HeroSlideshow } from "@/components/site/hero-slideshow";

import { db } from "@/lib/db";
import { ETATS } from "@/lib/etats";
import { formatFCFA } from "@/lib/format";

export const dynamic = "force-dynamic";

const ICON_MAP = {
  UserPlus,
  FileText,
  CreditCard,
  Stamp,
} as const;

const ETAPES_DEFAUT = [
  {
    numero: "01",
    icon: "UserPlus",
    titre: "Créez votre compte",
    description:
      "Inscription en ligne, choix de l'université et de la formation. Votre espace candidat est ouvert en quelques minutes.",
  },
  {
    numero: "02",
    icon: "FileText",
    titre: "Constitution du dossier",
    description:
      "Téléversez vos pièces, votre conseiller vérifie l'éligibilité et vous guide vers la version finale du dossier.",
  },
  {
    numero: "03",
    icon: "CreditCard",
    titre: "Paiement des frais d'agence",
    description:
      "Réglez les frais d'agence par Orange Money, Wave ou carte bancaire. Le reçu est disponible immédiatement.",
  },
  {
    numero: "04",
    icon: "Stamp",
    titre: "Attestation de pré-inscription",
    description:
      "Une fois la pré-admission accordée par l'université, votre attestation officielle est disponible dans votre espace.",
  },
];

export default async function AccueilPage() {
  const univRows = await db.universite.findMany({
    where: { partenaire: true },
    take: 12,
    orderBy: { nom: "asc" },
  });
  const mapUniv = (u: (typeof univRows)[0]) => ({
    ...u,
    domaines: JSON.parse(u.domaines) as string[],
    pointsForts: JSON.parse(u.pointsForts) as string[],
  });
  const BANDEAU_UNIVERSITES = univRows.map(mapUniv);
  const carnetUnivs = univRows.map(mapUniv);

  const dossierDemo = await db.dossier.findFirst({
    where: { etat: "PRE_ADMISSION" },
    include: {
      universite: true,
      formation: true,
      conseiller: { select: { prenom: true, nom: true } },
    },
  });

  const [statistiquesRows, temoignagesRows, etapesRow] = await Promise.all([
    db.statistique.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
    db.temoignage.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
    db.contenuSection.findUnique({ where: { cle: "etapes" } }),
  ]);
  const STATISTIQUES = statistiquesRows;
  const TEMOIGNAGES = temoignagesRows;

  let etapesData = ETAPES_DEFAUT;
  if (etapesRow?.contenu) {
    try {
      const parsed = JSON.parse(etapesRow.contenu) as typeof ETAPES_DEFAUT;
      if (Array.isArray(parsed) && parsed.length > 0) etapesData = parsed;
    } catch {
      /* fallback */
    }
  }
  const ETAPES = etapesData.map((e) => ({
    ...e,
    icon: ICON_MAP[e.icon as keyof typeof ICON_MAP] ?? UserPlus,
  }));

  const formationLabel = dossierDemo?.formation?.intitule ?? "Formation";
  const universiteNom = dossierDemo?.universite?.nom ?? "Université partenaire";
  const conseillerNom = dossierDemo?.conseiller
    ? `${dossierDemo.conseiller.prenom} ${dossierDemo.conseiller.nom}`
    : "Conseiller dédié";

  return (
    <>
      {/* Départ — Hero slideshow */}
      <HeroSlideshow />

      {/* Confiance */}
      <section className="border-y border-ligne bg-blanc" aria-label="Universités partenaires">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center font-mono text-[12px] uppercase tracking-eyebrow text-ardoise">
            Ils accompagnent nos candidats
          </p>
          <div className="mt-5 flex gap-6 overflow-x-auto scroll-fine pb-1 sm:justify-center">
            {BANDEAU_UNIVERSITES.slice(0, 10).map((u) => (
              <Link
                key={u.id}
                href={`/universites/${u.slug}`}
                className="group flex shrink-0 flex-col items-center gap-2"
              >
                <span className="relative flex h-12 w-12 overflow-hidden rounded-full border border-ligne bg-porcelaine transition-colors group-hover:border-or">
                  {u.logoUrl ? (
                    <Image src={u.logoUrl} alt="" width={48} height={48} className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-mono text-xs font-bold text-lapis">
                      {u.ecusson}
                    </span>
                  )}
                </span>
                <span className="max-w-[7rem] truncate text-center text-xs font-medium text-encre/80 group-hover:text-lapis">
                  {u.ecusson}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <div className="rule-or" aria-hidden />
      </section>

      {dossierDemo && (
        <section className="bg-blanc" aria-labelledby="dossier-demo-title">
          <div className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <Reveal>
                <Eyebrow>Aperçu dossier</Eyebrow>
                <h2
                  id="dossier-demo-title"
                  className="mt-5 font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
                >
                  Un dossier candidat, en un coup d&rsquo;œil.
                </h2>
                <p className="mt-4 text-ardoise">
                  Référence, étapes et suivi — ce que vous retrouvez dans votre espace.
                </p>
              </Reveal>
            </div>
            <Reveal className="relative mx-auto mt-12 max-w-lg">
              <div
                className="absolute -inset-4 -z-10 rounded-xl bg-gradient-to-br from-or-pale/40 to-transparent blur-2xl"
                aria-hidden
              />
              <BoardingPass
                reference={dossierDemo.reference}
                universiteNom={universiteNom}
                formationLabel={formationLabel}
                etat={dossierDemo.etat}
                etapeActuelle={dossierDemo.etapeActuelle}
                etapeTotal={ETATS.length}
                conseiller={conseillerNom}
                fraisAgence={dossierDemo.fraisAgence}
                mrz={dossierDemo.mrz}
                variant="hero"
                animateOnMount
              />
              <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-eyebrow text-ardoise">
                Aperçu d&rsquo;un dossier candidat · étape pré-admission
              </p>
            </Reveal>
          </div>
        </section>
      )}

      {/* Escales */}
      <section className="bg-porcelaine" aria-labelledby="etapes-title">
        <div className="mx-auto max-w-content px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <Eyebrow>L&rsquo;itinéraire</Eyebrow>
              <h2
                id="etapes-title"
                className="mt-5 font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
              >
                Quatre escales, un seul accompagnement.
              </h2>
              <p className="mt-4 text-ardoise">
                De la création du compte à l&apos;attestation, chaque étape est documentée et suivie
                par votre conseiller.
              </p>
            </Reveal>
          </div>

          <RevealStagger className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {ETAPES.map((etape) => {
              const Icon = etape.icon;
              return (
                <RevealItem key={etape.numero}>
                  <article className="group relative h-full rounded-lg border border-ligne bg-blanc p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(60,169,54,0.18)]">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-3xl font-bold text-or">{etape.numero}</span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-porcelaine text-lapis">
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-lg font-bold text-encre">{etape.titre}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ardoise">{etape.description}</p>
                  </article>
                </RevealItem>
              );
            })}
          </RevealStagger>
        </div>
      </section>

      {/* Destinations — carnet horizontal */}
      <HorizontalCarnet universites={carnetUnivs} />

      {/* Preuves */}
      <section className="bg-porcelaine" aria-labelledby="chiffres-title">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <Eyebrow>Preuves de passage</Eyebrow>
              <h2
                id="chiffres-title"
                className="mt-5 font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
              >
                Un parcours mesurable, pas une promesse.
              </h2>
            </Reveal>
          </div>
          <AnimatedCounters
            className="mt-14"
            stats={STATISTIQUES.map((s) => ({ valeur: s.valeur, libelle: s.libelle }))}
          />
        </div>
      </section>

      {/* Voix */}
      <section className="bg-blanc" aria-labelledby="temoignages-title">
        <div className="mx-auto max-w-content px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <Eyebrow>Voix du voyage</Eyebrow>
              <h2
                id="temoignages-title"
                className="mt-5 font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
              >
                Ils sont passés par GET Admission.
              </h2>
            </Reveal>
          </div>

          <RevealStagger className="mt-14 grid gap-6 md:grid-cols-3">
            {TEMOIGNAGES.map((temoignage) => (
              <RevealItem key={temoignage.nom}>
                <article className="flex h-full flex-col rounded-lg border border-ligne bg-porcelaine p-6 shadow-sm">
                  <Quote className="h-6 w-6 text-or" strokeWidth={1.5} aria-hidden />
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-encre">
                    « {temoignage.citation} »
                  </p>
                  <div className="mt-6 border-t border-ligne pt-4">
                    <p className="font-display font-bold text-encre">{temoignage.nom}</p>
                    <p className="mt-0.5 text-xs text-ardoise">
                      {temoignage.parcours} · {temoignage.pays}
                    </p>
                  </div>
                </article>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* Embarquement */}
      <section className="bg-or-pale" aria-labelledby="cta-title">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-24 text-center sm:px-6 lg:px-8">
          <Reveal>
            <span className="eyebrow-or inline-flex items-center gap-2">
              <Plane className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              Embarquement
            </span>
            <h2
              id="cta-title"
              className="mx-auto mt-5 max-w-2xl font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
            >
              Composez votre dossier aujourd&apos;hui.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ardoise">
              Comptez cinq minutes pour créer votre compte. Votre conseiller prend le relais sous 24
              heures ouvrées.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <MotionButton asChild size="lg">
                <Link href="/inscription">
                  Créer mon compte
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </Link>
              </MotionButton>
              <MotionButton asChild size="lg" variant="outline">
                <Link href="/contact">Parler à un conseiller</Link>
              </MotionButton>
            </div>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-eyebrow text-ardoise">
              Frais d&apos;agence à partir de {formatFCFA(280000)}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
