import * as React from "react";
import Link from "next/link";
import { ArrowRight, HeartHandshake, Eye, Network, Quote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow, Reveal, RevealStagger, RevealItem } from "@/components/site/reveal";
import { formatFCFA } from "@/lib/format";

const PILIERS = [
  {
    icon: HeartHandshake,
    titre: "Accompagnement humain",
    description:
      "Chaque candidat est suivi par un conseiller dédié, joignable par messagerie. Pas de robot, pas de ticket anonyme : un interlocuteur unique qui connaît votre dossier.",
  },
  {
    icon: Eye,
    titre: "Transparence du suivi",
    description:
      "Vous voyez l'avancement de votre dossier étape par étape, comme on suit un vol. Frais, délais, pièces attendues : tout est publié et horodaté.",
  },
  {
    icon: Network,
    titre: "Réseau d'universités vérifiées",
    description:
      "Nos dix universités partenaires ont été visitées, leurs frais négociés et publiés, leurs délais de réponse mesurés. Vous savez toujours à quoi vous engager.",
  },
];

const STATISTIQUES = [
  { valeur: "1 248", libelle: "Dossiers traités" },
  { valeur: "10", libelle: "Universités partenaires" },
  { valeur: "6", libelle: "Pays couverts" },
  { valeur: "78 %", libelle: "Taux d'acceptation" },
];

const EQUIPE = [
  { initiales: "AD", nom: "Aïssatou Diallo", role: "Conseillère pédagogique" },
  { initiales: "ON", nom: "Olivier Nguema", role: "Conseiller partenariats" },
  { initiales: "MK", nom: "Mariama Konaté", role: "Responsable finance" },
];

export default function AProposPage() {
  return (
    <>
      {/* Hero éditorial */}
      <section className="bg-porcelaine" aria-labelledby="apropos-title">
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <Eyebrow>À propos</Eyebrow>
            <h1
              id="apropos-title"
              className="mt-6 font-display text-4xl font-extrabold tracking-tightest text-encre sm:text-5xl"
            >
              GET Admission, le passage vers l'international.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ardoise">
              GET Admission est une agence d'admission universitaire basée à Dakar, Abidjan et Lomé.
              Nous accompagnons les étudiants d'Afrique de l'Ouest dans leurs démarches vers des
              universités partenaires en France, Belgique, Canada, Maroc, Tunisie, Liban, Cameroun,
              Sénégal et Afrique du Sud.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-blanc" aria-labelledby="mission-title">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <p className="eyebrow">Notre mission</p>
              <h2
                id="mission-title"
                className="mt-4 font-display text-3xl font-bold tracking-tightest text-encre"
              >
                Démocratiser l'accès aux études à l'étranger.
              </h2>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="space-y-4 text-base leading-relaxed text-ardoise">
                <p>
                  Trop de candidats ouest-africains talentueux abandonnent leurs projets d'études à
                  l'étranger, non faute de moyens, mais faute d'information fiable et
                  d'accompagnement structuré. Les procédures sont opaques, les intermédiaires
                  nombreux, les délais imprévisibles.
                </p>
                <p>
                  Nous avons construit GET Admission autour d'une promesse simple : rendre le
                  parcours lisible. Chaque dossier est traité comme un embarquement — référence,
                  étapes, statut, tampon. Chaque franc CFA demandé est justifié. Chaque réponse d'une
                  université est tracée.
                </p>
                <p>
                  Le résultat : 1 248 dossiers traités, 78 % de taux d'acceptation, et des étudiants
                  aujourd'hui inscrits de Paris au Cap.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Approche : 3 piliers */}
      <section className="bg-porcelaine" aria-labelledby="approche-title">
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <Eyebrow>Notre approche</Eyebrow>
              <h2
                id="approche-title"
                className="mt-5 font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
              >
                Trois piliers, une seule promesse.
              </h2>
              <p className="mt-4 text-ardoise">
                Nous ne nous contentons pas de transmettre des dossiers. Nous structurons le
                parcours du candidat de bout en bout.
              </p>
            </Reveal>
          </div>

          <RevealStagger className="mt-12 grid gap-6 md:grid-cols-3">
            {PILIERS.map((pilier) => {
              const Icon = pilier.icon;
              return (
                <RevealItem key={pilier.titre}>
                  <article className="h-full rounded-lg border border-ligne bg-blanc p-6 shadow-sm">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-lapis/10 text-lapis">
                      <Icon className="h-6 w-6" strokeWidth={1.5} />
                    </span>
                    <h3 className="mt-5 font-display text-lg font-bold text-encre">
                      {pilier.titre}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-ardoise">
                      {pilier.description}
                    </p>
                  </article>
                </RevealItem>
              );
            })}
          </RevealStagger>
        </div>
      </section>

      {/* Chiffres clés */}
      <section className="bg-blanc" aria-labelledby="chiffres-title">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <Eyebrow>Chiffres clés</Eyebrow>
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

      {/* Équipe */}
      <section className="bg-porcelaine" aria-labelledby="equipe-title">
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <Eyebrow>L'équipe</Eyebrow>
              <h2
                id="equipe-title"
                className="mt-5 font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
              >
                Des conseillers qui connaissent le terrain.
              </h2>
              <p className="mt-4 text-ardoise">
                Une équipe basée à Dakar, Abidjan et Lomé, qui a elle-même étudié à l'étranger.
              </p>
            </Reveal>
          </div>

          <RevealStagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {EQUIPE.map((personne) => (
              <RevealItem key={personne.nom}>
                <article className="flex items-center gap-4 rounded-lg border border-ligne bg-blanc p-6 shadow-sm">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-lapis text-blanc">
                    <span className="font-mono text-sm font-bold">{personne.initiales}</span>
                  </span>
                  <div>
                    <p className="font-display font-bold text-encre">{personne.nom}</p>
                    <p className="mt-0.5 text-sm text-ardoise">{personne.role}</p>
                  </div>
                </article>
              </RevealItem>
            ))}
          </RevealStagger>

          {/* Citation fondatrice */}
          <Reveal className="mx-auto mt-16 max-w-3xl">
            <figure className="rounded-lg border border-ligne bg-or-pale/40 p-8 text-center">
              <Quote className="mx-auto h-7 w-7 text-or" strokeWidth={1.5} aria-hidden />
              <blockquote className="mt-4 font-display text-xl font-medium leading-relaxed text-encre">
                « Nous avons conçu GET Admission comme un embarquement, pas comme une procédure.
                Chaque étape est visible, chaque délai est respecté, chaque franc est justifié. »
              </blockquote>
              <figcaption className="mt-5 text-sm text-ardoise">
                Direction générale · GET Admission
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-or-pale" aria-labelledby="cta-title">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-20 text-center sm:px-6 lg:px-8">
          <Reveal>
            <h2
              id="cta-title"
              className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tightest text-encre sm:text-4xl"
            >
              Un projet d'études à l'étranger ?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ardoise">
              Parlez à un conseiller dès aujourd'hui. Le premier échange est gratuit et sans
              engagement.
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
