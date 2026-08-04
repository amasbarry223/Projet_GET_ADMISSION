import * as React from "react";

import { HomeHero } from "@/components/sections/hero";
import { PartnerMarquee } from "@/components/sections/partner-marquee";
import { StatsBar } from "@/components/sections/stats-bar";
import { ValueSteps } from "@/components/sections/value-steps";
import { ProductShowcase } from "@/components/sections/product-showcase";
import { AccompanimentTimeline } from "@/components/sections/accompaniment-timeline";
import { SocialProof } from "@/components/sections/social-proof";
import { PartnersGrid } from "@/components/sections/partners-grid";
import { FinalCta } from "@/components/sections/final-cta";
import { HorizontalCarnet } from "@/components/site/horizontal-carnet";

import { db } from "@/lib/db";
import { ETATS } from "@/lib/etats";
import { isValidPartnerLogo } from "@/lib/partner-logos";

export const dynamic = "force-dynamic";

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
      "Déclarez votre paiement (Mobile Money, Wave, virement ou espèces). L'agence confirme l'encaissement, puis le reçu est disponible dans votre espace.",
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
  const universities = univRows.map(mapUniv);

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

  let steps = ETAPES_DEFAUT;
  if (etapesRow?.contenu) {
    try {
      const parsed = JSON.parse(etapesRow.contenu) as typeof ETAPES_DEFAUT;
      if (Array.isArray(parsed) && parsed.length > 0) steps = parsed;
    } catch {
      /* fallback */
    }
  }

  const boarding = dossierDemo
    ? {
        reference: dossierDemo.reference,
        universiteNom: dossierDemo.universite?.nom ?? "Université partenaire",
        formationLabel: dossierDemo.formation?.intitule ?? "Formation",
        etat: dossierDemo.etat,
        etapeActuelle: dossierDemo.etapeActuelle,
        etapeTotal: ETATS.length,
        conseiller: dossierDemo.conseiller
          ? `${dossierDemo.conseiller.prenom} ${dossierDemo.conseiller.nom}`
          : "Conseiller dédié",
        fraisAgence: dossierDemo.fraisAgence,
        mrz: dossierDemo.mrz,
      }
    : null;

  const candidateStat = statistiquesRows.find((s) =>
    /candidat|étudi|inscrit/i.test(s.libelle),
  );

  return (
    <>
      <HomeHero />
      <PartnerMarquee
        universities={universities
          .filter((u) => isValidPartnerLogo(u.logoUrl))
          .map((u) => ({
            id: u.id,
            slug: u.slug,
            nom: u.nom,
            ecusson: u.ecusson,
            logoUrl: u.logoUrl,
          }))}
      />
      <StatsBar stats={statistiquesRows.map((s) => ({ valeur: s.valeur, libelle: s.libelle }))} />
      <ValueSteps steps={steps} />
      <ProductShowcase boarding={boarding} />
      <HorizontalCarnet universites={universities} />
      <AccompanimentTimeline />
      <SocialProof
        testimonials={temoignagesRows.map((t) => ({
          nom: t.nom,
          citation: t.citation,
          parcours: t.parcours,
          pays: t.pays,
        }))}
        candidateCountLabel={
          candidateStat ? `${candidateStat.valeur} ${candidateStat.libelle.toLowerCase()}` : undefined
        }
      />
      <PartnersGrid
        partners={universities.map((u) => ({
          id: u.id,
          slug: u.slug,
          nom: u.nom,
          ville: u.ville,
          pays: u.pays,
          drapeau: u.drapeau,
          ecusson: u.ecusson,
          logoUrl: u.logoUrl,
          coverUrl: u.coverUrl,
        }))}
      />
      <FinalCta />
    </>
  );
}
