import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  HeartHandshake,
  Eye,
  Network,
  MapPin,
  Building2,
  Clock3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow, Reveal, RevealStagger, RevealItem } from "@/components/site/reveal";
import { formatFCFA } from "@/lib/format";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "À Propos de GET Admission — Notre Mission, Engagements & Équipe",
  description:
    "Découvrez l'histoire, la mission et les engagements de GET Admission. Une agence humaine dédiée à la réussite des projets d'études universitaires à l'international.",
  alternates: {
    canonical: "https://get-admission.com/a-propos",
  },
  openGraph: {
    title: "À Propos de GET Admission — Notre Mission & Engagements",
    description:
      "GET Admission est une agence d'intermédiation universitaire transparente, humaine et engagée pour la réussite de vos études à l'étranger.",
    url: "https://get-admission.com/a-propos",
    type: "website",
  },
};


const ICON_MAP = { HeartHandshake, Eye, Network } as const;

const PILIERS_DEFAUT = [
  {
    icon: "HeartHandshake",
    titre: "Accompagnement humain",
    description:
      "Chaque candidat est suivi par un conseiller dédié, joignable par messagerie. Pas de robot, pas de ticket anonyme : un interlocuteur unique qui connaît votre dossier.",
  },
  {
    icon: "Eye",
    titre: "Transparence du suivi",
    description:
      "Vous voyez l'avancement de votre dossier étape par étape, comme on suit un vol. Frais, délais, pièces attendues : tout est publié et horodaté.",
  },
  {
    icon: "Network",
    titre: "Réseau d'universités vérifiées",
    description:
      "Nos dix universités partenaires ont été visitées, leurs frais négociés et publiés, leurs délais de réponse mesurés. Vous savez toujours à quoi vous engager.",
  },
];

const EQUIPE_PHOTOS: Record<string, string> = {
  "Aïssatou Diallo": "/images/apropos/equipe-aissatou.png",
  "Olivier Nguema": "/images/apropos/equipe-olivier.png",
  "Mariama Konaté": "/images/apropos/equipe-mariama.png",
  "Yasmine Bensaid": "/images/apropos/equipe-yasmine.png",
};

const EQUIPE_PHOTOS_BY_ORDER = [
  "/images/apropos/equipe-aissatou.png",
  "/images/apropos/equipe-olivier.png",
  "/images/apropos/equipe-mariama.png",
  "/images/apropos/equipe-yasmine.png",
] as const;

function photoForMember(nom: string, index: number): string {
  return (
    EQUIPE_PHOTOS[nom] ??
    EQUIPE_PHOTOS_BY_ORDER[index % EQUIPE_PHOTOS_BY_ORDER.length] ??
    EQUIPE_PHOTOS_BY_ORDER[0]!
  );
}

/* --------------------------------- Page ----------------------------------- */

export default async function AProposPage() {
  const [STATISTIQUES, EQUIPE, piliersRow] = await Promise.all([
    db.statistique.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }).catch(() => []),
    db.membreEquipe.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }).catch(() => []),
    db.contenuSection.findUnique({ where: { cle: "piliers" } }).catch(() => null),
  ]);

  let piliersData = PILIERS_DEFAUT;
  if (piliersRow?.contenu) {
    try {
      const parsed = JSON.parse(piliersRow.contenu) as typeof PILIERS_DEFAUT;
      if (Array.isArray(parsed) && parsed.length > 0) piliersData = parsed;
    } catch {
      // fallback
    }
  }
  const PILIERS = piliersData.map((p) => ({
    ...p,
    icon: ICON_MAP[p.icon as keyof typeof ICON_MAP] ?? HeartHandshake,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: "https://get-admission.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "À propos",
            item: "https://get-admission.com/a-propos",
          },
        ],
      },
      {
        "@type": "AboutPage",
        "@id": "https://get-admission.com/a-propos#webpage",
        url: "https://get-admission.com/a-propos",
        name: "À Propos de GET Admission — Notre Mission, Engagements & Équipe",
        description:
          "Découvrez l'histoire, la mission et les engagements de GET Admission. Une agence humaine dédiée à la réussite des projets d'études universitaires à l'international.",
        mainEntity: {
          "@id": "https://get-admission.com/#organization",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero full-bleed */}
      <section
        className="relative isolate min-h-[min(92dvh,820px)] overflow-hidden"
        aria-labelledby="apropos-title"
      >
        <Image
          src="/images/apropos/hero.png"
          alt="Étudiante ouest-africaine marchant sur un campus au soleil couchant"
          fill
          priority
          className="object-cover object-[center_30%]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[rgba(18,14,10,0.82)] via-[rgba(18,14,10,0.55)] to-[rgba(18,14,10,0.2)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[rgba(18,14,10,0.75)] via-transparent to-[rgba(18,14,10,0.25)]"
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-[min(92dvh,820px)] max-w-content flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
          <Reveal>
            <p className="font-display text-sm font-semibold tracking-[0.22em] text-ambre uppercase sm:text-base">
              GET Admission
            </p>
            <h1
              id="apropos-title"
              className="mt-4 max-w-2xl text-balance font-display text-4xl font-extrabold tracking-tightest text-blanc sm:text-5xl lg:text-6xl"
            >
              Le passage vers l&apos;international.
            </h1>
            <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-blanc/80 sm:text-lg">
              Une agence d&apos;admission à taille humaine, basée à Bamako —
              pour les étudiants d&apos;Afrique de l&apos;Ouest.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-primary text-blanc hover:bg-primary/90">
                <Link href="/inscription">
                  Créer mon dossier
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-blanc/35 bg-transparent text-blanc hover:bg-blanc/10 hover:text-blanc"
              >
                <Link href="/contact">Parler à un conseiller</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-background" aria-labelledby="mission-title">
        <div className="mx-auto grid max-w-content items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-lg">
              <Image
                src="/images/apropos/mission.png"
                alt="Conseillère GET Admission accompagnant un étudiant sur son dossier"
                fill
                className="object-cover transition-transform duration-700 ease-out hover:scale-[1.03]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <Eyebrow>Notre mission</Eyebrow>
            <h2
              id="mission-title"
              className="mt-4 max-w-md text-balance font-display text-3xl font-bold tracking-tightest text-foreground sm:text-4xl"
            >
              Démocratiser l&apos;accès aux études à l&apos;étranger.
            </h2>
            <div className="mt-6 max-w-prose space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Trop de candidats ouest-africains talentueux abandonnent leurs projets d&apos;études à
                l&apos;étranger, non faute de moyens, mais faute d&apos;information fiable et
                d&apos;accompagnement structuré.
              </p>
              <p>
                Nous avons construit GET Admission autour d&apos;une promesse simple : rendre le
                parcours lisible. Chaque dossier est traité comme un embarquement — référence,
                étapes, statut, tampon. Chaque franc CFA demandé est justifié.
              </p>
              <p>
                Le résultat : {STATISTIQUES[0]?.valeur ?? "—"}{" "}
                {STATISTIQUES[0]?.libelle.toLowerCase() ?? "dossiers traités"},{" "}
                {STATISTIQUES[3]?.valeur ?? "—"} de{" "}
                {STATISTIQUES[3]?.libelle.toLowerCase() ?? "taux d'acceptation"}, et des étudiants
                aujourd&apos;hui inscrits de Paris au Cap.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Sur le terrain — miroir de Mission */}
      <section className="bg-card" aria-labelledby="recit-title">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto grid max-w-content items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
          <Reveal>
            <Eyebrow>Sur le terrain</Eyebrow>
            <h2
              id="recit-title"
              className="mt-4 max-w-md text-balance font-display text-3xl font-bold tracking-tightest text-foreground sm:text-4xl"
            >
              Des trajectoires concrètes, pas des slogans.
            </h2>
            <div className="mt-6 max-w-prose space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Derrière chaque acceptation, il y a des pièces rassemblées, des délais tenus et un
                conseiller qui répond. Notre rôle : réduire l&apos;incertitude pour que le talent
                puisse avancer.
              </p>
            </div>
            <ul className="mt-8 space-y-4">
              {[
                {
                  icon: MapPin,
                  label: "Bureau à Bamako, Bacodjicoroni-Golf",
                },
                {
                  icon: Building2,
                  label: "Universités partenaires visitées et vérifiées",
                },
                {
                  icon: Clock3,
                  label: "Suivi horodaté jusqu'à l'attestation",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                    <span className="pt-1.5 text-sm leading-relaxed text-foreground">
                      {item.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-lg">
              <Image
                src="/images/apropos/story.png"
                alt="Étudiants célébrant leur acceptation universitaire"
                fill
                className="object-cover transition-transform duration-700 ease-out hover:scale-[1.03]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Approche : piliers en liste éditoriale */}
      <section className="bg-background" aria-labelledby="approche-title">
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <Reveal>
              <Eyebrow>Notre approche</Eyebrow>
              <h2
                id="approche-title"
                className="mt-5 text-balance font-display text-3xl font-bold tracking-tightest text-foreground sm:text-4xl"
              >
                Trois piliers, une seule promesse.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Nous ne nous contentons pas de transmettre des dossiers. Nous structurons le
                parcours du candidat de bout en bout.
              </p>
            </Reveal>
          </div>

          <RevealStagger className="mt-14 divide-y divide-border border-y border-border">
            {PILIERS.map((pilier, index) => {
              const Icon = pilier.icon;
              return (
                <RevealItem key={pilier.titre}>
                  <article className="grid gap-6 py-8 md:grid-cols-[auto_1fr_1.4fr] md:items-start md:gap-10">
                    <span className="font-mono text-sm tabular-nums text-ambre">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      </span>
                      <h3 className="font-display text-xl font-bold text-foreground">
                        {pilier.titre}
                      </h3>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground md:pt-1">
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
      <section className="bg-card" aria-labelledby="chiffres-title">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Reveal>
              <Eyebrow>Chiffres clés</Eyebrow>
              <h2
                id="chiffres-title"
                className="mt-5 text-balance font-display text-3xl font-bold tracking-tightest text-foreground sm:text-4xl"
              >
                Un parcours mesurable, pas une promesse.
              </h2>
            </Reveal>
          </div>

          <RevealStagger className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {STATISTIQUES.map((stat) => (
              <RevealItem key={stat.libelle}>
                <div>
                  <p className="font-display text-5xl font-bold tracking-tightest text-primary">
                    {stat.valeur}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{stat.libelle}</p>
                </div>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* Équipe */}
      <section className="bg-background" aria-labelledby="equipe-title">
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <Reveal>
              <Eyebrow>L&apos;équipe</Eyebrow>
              <h2
                id="equipe-title"
                className="mt-5 text-balance font-display text-3xl font-bold tracking-tightest text-foreground sm:text-4xl"
              >
                Des conseillers qui connaissent le terrain.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Une équipe basée à Bamako, qui a elle-même étudié à l&apos;étranger.
              </p>
            </Reveal>
          </div>

          <RevealStagger className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {EQUIPE.map((personne, index) => (
              <RevealItem key={personne.nom}>
                <article className="group">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={photoForMember(personne.nom, index)}
                      alt={`Portrait de ${personne.nom}`}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  <p className="mt-4 font-display text-lg font-bold text-foreground">
                    {personne.nom}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{personne.role}</p>
                </article>
              </RevealItem>
            ))}
          </RevealStagger>

          <Reveal className="mt-16 max-w-3xl">
            <blockquote className="border-l-2 border-ambre pl-6">
              <p className="font-display text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
                « Nous avons conçu GET Admission comme un embarquement, pas comme une procédure.
                Chaque étape est visible, chaque délai est respecté, chaque franc est justifié. »
              </p>
              <footer className="mt-5 font-mono text-[11px] uppercase tracking-eyebrow text-muted-foreground">
                Direction générale · GET Admission
              </footer>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section
        className="relative isolate overflow-hidden"
        aria-labelledby="cta-title"
      >
        <Image
          src="/images/apropos/cta.png"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[rgba(18,14,10,0.72)]" aria-hidden />
        <div className="relative mx-auto max-w-content px-4 py-24 text-center sm:px-6 lg:px-8 lg:py-28">
          <Reveal>
            <h2
              id="cta-title"
              className="mx-auto max-w-2xl text-balance font-display text-3xl font-bold tracking-tightest text-blanc sm:text-4xl"
            >
              Un projet d&apos;études à l&apos;étranger ?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-blanc/75">
              Parlez à un conseiller dès aujourd&apos;hui. Le premier échange est gratuit et sans
              engagement.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-primary text-blanc hover:bg-primary/90">
                <Link href="/inscription">
                  Créer mon dossier
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-blanc/35 bg-transparent text-blanc hover:bg-blanc/10 hover:text-blanc"
              >
                <Link href="/contact">Parler à un conseiller</Link>
              </Button>
            </div>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-eyebrow text-blanc/55">
              Frais d&apos;agence à partir de {formatFCFA(280000)}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
