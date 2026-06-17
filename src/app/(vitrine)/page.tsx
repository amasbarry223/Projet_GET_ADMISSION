import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  UserPlus,
  FileText,
  CreditCard,
  Stamp,
  Quote,
  Plane,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BoardingPass } from "@/components/getadm/boarding-pass";
import { Reveal, RevealStagger, RevealItem, Eyebrow } from "@/components/site/reveal";
import { UniversiteCard } from "@/components/site/universite-card";

import { UNIVERSITES, universiteParSlug } from "@/lib/mock/universites";
import { formationParId } from "@/lib/mock/formations";
import { DOSSIER_DEMO_CANDIDAT } from "@/lib/mock/dossiers";
import { ETATS } from "@/lib/mock/etats";
import { formatFCFA } from "@/lib/format";

/* ----------------------------- Données dérivées ---------------------------- */

const dossierDemo = DOSSIER_DEMO_CANDIDAT;
const universiteDemo = UNIVERSITES.find((u) => u.id === dossierDemo.universiteId);
const formationDemo = formationParId(dossierDemo.formationId);
const formationLabel = formationDemo
  ? formationDemo.intitule
  : dossierDemo.formationId;
const universiteNom = universiteDemo?.nom ?? dossierDemo.universiteId;

const universitesVedettes = UNIVERSITES.filter((u) => u.partenaires).slice(0, 6);

const BANDEAU_UNIVERSITES = UNIVERSITES.slice(0, 6);

const ETAPES = [
  {
    numero: "01",
    icon: UserPlus,
    titre: "Créez votre compte",
    description:
      "Inscription en ligne, choix de l'université et de la formation. Votre espace candidat est ouvert en quelques minutes.",
  },
  {
    numero: "02",
    icon: FileText,
    titre: "Constitution du dossier",
    description:
      "Téléversez vos pièces, votre conseiller vérifie l'éligibilité et vous guide vers la version finale du dossier.",
  },
  {
    numero: "03",
    icon: CreditCard,
    titre: "Paiement des frais d'agence",
    description:
      "Réglez les frais d'agence par Orange Money, Wave ou carte bancaire. Le reçu est disponible immédiatement.",
  },
  {
    numero: "04",
    icon: Stamp,
    titre: "Attestation de pré-inscription",
    description:
      "Une fois la pré-admission accordée par l'université, votre attestation officielle est disponible dans votre espace.",
  },
];

const STATISTIQUES = [
  { valeur: "1 248", libelle: "Dossiers traités" },
  { valeur: "10", libelle: "Universités partenaires" },
  { valeur: "6", libelle: "Pays couverts" },
  { valeur: "78 %", libelle: "Taux d'acceptation" },
];

const TEMOIGNAGES = [
  {
    nom: "Marième F.",
    parcours: "Master Transport · Hasselt",
    pays: "🇧🇪 Belgique",
    citation:
      "J'ai déposé mon dossier en janvier. Trois semaines plus tard, j'avais ma pré-admission. Le suivi pas à pas m'a évité toutes les erreurs classiques.",
  },
  {
    nom: "Awa T.",
    parcours: "Master Droit · Mohammed V",
    pays: "🇲🇦 Maroc",
    citation:
      "Mon conseiller répondait à chaque message sous 24 heures. J'ai pu suivre l'avancement comme on suit un colis, étape par étape.",
  },
  {
    nom: "Paul N.",
    parcours: "Master Commerce · UCT",
    pays: "🇿🇦 Afrique du Sud",
    citation:
      "Tout était transparent : frais, délais, pièces attendues. J'ai récupéré mon attestation directement à l'agence, tamponnée et signée.",
  },
];

/* --------------------------------- Page ----------------------------------- */

export default function AccueilPage() {
  return (
    <>
      {/* ============================== Hero ============================== */}
      <section className="relative overflow-hidden bg-porcelaine" aria-labelledby="hero-title">
        {/* Motif fond : très subtil, lignes concentriques façon monde */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 30%, rgba(45,107,240,0.06), transparent 45%), radial-gradient(circle at 10% 80%, rgba(184,144,46,0.05), transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Colonne gauche */}
            <div>
              <Eyebrow>Votre passage vers l'international</Eyebrow>

              <h1
                id="hero-title"
                className="mt-6 font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-tightest text-encre sm:text-5xl lg:text-[4.5rem]"
              >
                L'admission à l'étranger, sans le parcours du combattant.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ardoise">
                GET Admission accompagne les étudiants d'Afrique de l'Ouest vers leurs universités
                partenaires. Dossier vérifié, suivi en temps réel, attestation officielle — tout est
                centralisé dans votre espace candidat.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-lapis text-blanc hover:bg-lapis/90">
                  <Link href="/inscription">
                    Créer mon dossier
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-ligne bg-blanc text-encre hover:bg-porcelaine"
                >
                  <Link href="/universites">Découvrir les universités</Link>
                </Button>
              </div>

              {/* Petit indicateur de confiance */}
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ardoise">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-vert" strokeWidth={1.75} />
                  Sans avance cachée
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-vert" strokeWidth={1.75} />
                  Suivi transparent
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-vert" strokeWidth={1.75} />
                  Conseiller dédié
                </li>
              </ul>
            </div>

            {/* Colonne droite : boarding pass */}
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-xl bg-gradient-to-br from-or-pale/40 to-transparent blur-2xl" aria-hidden />
              <BoardingPass
                reference={dossierDemo.reference}
                universiteNom={universiteNom}
                formationLabel={formationLabel}
                etat={dossierDemo.etat}
                etapeActuelle={dossierDemo.etapeActuelle}
                etapeTotal={ETATS.length}
                conseiller={dossierDemo.conseillerNom}
                fraisAgence={dossierDemo.fraisAgence}
                mrz={dossierDemo.mrz}
                variant="hero"
                animateOnMount
              />
              <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-eyebrow text-ardoise">
                Aperçu d'un dossier candidat · étape pré-admission
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Bandeau de confiance ====================== */}
      <section className="border-y border-ligne bg-blanc" aria-label="Universités partenaires">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center font-mono text-[12px] uppercase tracking-eyebrow text-ardoise">
            Ils accompagnent nos candidats
          </p>
          <div className="mt-5 flex gap-6 overflow-x-auto scroll-fine pb-1 sm:justify-center">
            {BANDEAU_UNIVERSITES.map((u) => (
              <Link
                key={u.id}
                href={`/universites/${u.slug}`}
                className="group flex shrink-0 flex-col items-center gap-2"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-ligne bg-porcelaine transition-colors group-hover:border-lapis">
                  <span className="font-mono text-xs font-bold text-lapis">{u.ecusson}</span>
                </span>
                <span className="text-xs font-medium text-encre/80 group-hover:text-lapis">
                  {u.nom}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <div className="rule-or" aria-hidden />
      </section>

      {/* ====================== Comment ça marche ======================= */}
      <section className="bg-porcelaine" aria-labelledby="etapes-title">
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <Eyebrow>Comment ça marche</Eyebrow>
              <h2
                id="etapes-title"
                className="mt-5 font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
              >
                Quatre étapes, un seul accompagnement.
              </h2>
              <p className="mt-4 text-ardoise">
                De la création du compte à l'attestation de pré-inscription, chaque étape est
                documentée et suivie par votre conseiller dédié.
              </p>
            </Reveal>
          </div>

          <RevealStagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ETAPES.map((etape) => {
              const Icon = etape.icon;
              return (
                <RevealItem key={etape.numero}>
                  <article className="group relative h-full rounded-lg border border-ligne bg-blanc p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
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

      {/* =================== Universités en vedette ===================== */}
      <section className="bg-blanc" aria-labelledby="vedettes-title">
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <Reveal className="max-w-2xl">
              <Eyebrow>Destinations</Eyebrow>
              <h2
                id="vedettes-title"
                className="mt-5 font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
              >
                Des universités partenaires, vérifiées.
              </h2>
              <p className="mt-4 text-ardoise">
                Chaque université a été visitée, ses frais sont publiés et ses délais de réponse
                connus. Vous savez toujours à quoi vous engager.
              </p>
            </Reveal>
            <Button
              asChild
              variant="outline"
              className="border-ligne bg-blanc text-encre hover:bg-porcelaine"
            >
              <Link href="/universites">
                Voir tout le catalogue
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Button>
          </div>

          <RevealStagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {universitesVedettes.map((u) => (
              <RevealItem key={u.id}>
                <UniversiteCard universite={u} className="h-full" />
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* ========================= Section chiffres ====================== */}
      <section className="bg-porcelaine" aria-labelledby="chiffres-title">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <Eyebrow>GET Admission en chiffres</Eyebrow>
              <h2
                id="chiffres-title"
                className="mt-5 font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
              >
                Un parcours mesurable, pas une promesse.
              </h2>
            </Reveal>
          </div>

          <RevealStagger className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {STATISTIQUES.map((stat) => (
              <RevealItem key={stat.libelle}>
                <div className="text-center">
                  <p className="font-display text-5xl font-bold tracking-tightest text-lapis">
                    {stat.valeur}
                  </p>
                  <p className="mt-2 text-sm text-ardoise">{stat.libelle}</p>
                </div>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* =========================== Témoignages ========================= */}
      <section className="bg-blanc" aria-labelledby="temoignages-title">
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <Eyebrow>Témoignages</Eyebrow>
              <h2
                id="temoignages-title"
                className="mt-5 font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
              >
                Ils sont passés par GET Admission.
              </h2>
            </Reveal>
          </div>

          <RevealStagger className="mt-12 grid gap-6 md:grid-cols-3">
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

      {/* ============================ CTA final ========================== */}
      <section className="bg-or-pale" aria-labelledby="cta-title">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-20 text-center sm:px-6 lg:px-8">
          <Reveal>
            <span className="eyebrow-or inline-flex items-center gap-2">
              <Plane className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              Prêt à décoller ?
            </span>
            <h2
              id="cta-title"
              className="mx-auto mt-5 max-w-2xl font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
            >
              Composez votre dossier aujourd'hui.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ardoise">
              Comptez cinq minutes pour créer votre compte. Votre conseiller prend le relais sous
              24 heures ouvrées.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-lapis text-blanc hover:bg-lapis/90">
                <Link href="/inscription">
                  Créer mon dossier
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-lapis/30 bg-blanc text-lapis hover:bg-blanc/60"
              >
                <Link href="/contact">Parler à un conseiller</Link>
              </Button>
            </div>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-eyebrow text-ardoise">
              Frais d'agence à partir de {formatFCFA(280000)}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
