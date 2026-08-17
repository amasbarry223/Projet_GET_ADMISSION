import type { Metadata } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mentions Légales & Politique de Confidentialité",
  description:
    "Mentions légales, conditions d'utilisation et politique de protection des données personnelles de la plateforme GET Admission.",
  alternates: {
    canonical: "https://get-admission.com/mentions-legales",
  },
  robots: {
    index: true,
    follow: true,
  },
};


export default async function MentionsLegalesPage() {
  const params = await db.parametre.findUnique({ where: { id: 1 } }).catch(() => null);
  const contenu =
    params?.mentionsLegales?.trim() ||
    `## Mentions légales — GET Admission

**Éditeur :** GET Admission — Agence d'admission universitaire

**Contact :** voir la page Contact

**Hébergement :** infrastructure cloud sécurisée

**Données personnelles :** Les données collectées (identité, pièces KYC, dossiers) sont traitées exclusivement pour la gestion des candidatures et conformément aux principes de protection des données. Vous disposez d'un droit d'accès, de rectification et de suppression via votre espace personnel ou en contactant l'agence.

**Cookies :** La plateforme utilise des cookies de session strictement nécessaires à l'authentification.

**Propriété intellectuelle :** L'ensemble des contenus de ce site est la propriété de GET Admission.`;

  const politique =
    params?.politiqueConfidentialite?.trim() ||
    `## Politique de confidentialité

GET Admission collecte et conserve les données nécessaires au traitement de votre dossier d'admission. La durée de conservation est limitée à la durée du parcours + obligations légales. Aucune cession commerciale à des tiers n'est effectuée hors universités partenaires concernées par votre candidature.`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="eyebrow mb-2">Informations légales</p>
      <h1 className="font-display text-3xl font-bold text-foreground">Mentions légales</h1>
      <article className="prose prose-sm mt-8 max-w-none text-foreground whitespace-pre-wrap">
        {contenu}
      </article>
      <hr className="my-10 border-border" />
      <h2 className="font-display text-2xl font-bold text-foreground">Confidentialité</h2>
      <article className="prose prose-sm mt-4 max-w-none text-foreground whitespace-pre-wrap">
        {politique}
      </article>
    </div>
  );
}
