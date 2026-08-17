import type { Metadata } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Politique de Confidentialité & Protection des Données",
  description:
    "Engagement et politique de protection des données personnelles de GET Admission. Sécurité, finalités de traitement et droits d'accès.",
  alternates: {
    canonical: "https://get-admission.com/politique-confidentialite",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function PolitiqueConfidentialitePage() {
  const params = await db.parametre.findUnique({ where: { id: 1 } }).catch(() => null);
  const politique =
    params?.politiqueConfidentialite?.trim() ||
    `## Protection de vos données personnelles

GET Admission s'engage à garantir la confidentialité et la sécurité des informations personnelles transmises par les candidats lors de la constitution de leur dossier d'admission.

### 1. Finalités du traitement
Les données recueillies (identité, pièces académiques, relevés de notes, coordonnées) sont utilisées exclusivement pour :
- L'évaluation et la constitution des dossiers d'admission auprès des universités partenaires,
- L'instruction des demandes d'hébergement (CROUS / partenaires privés) et d'accompagnement visa,
- L'émission de l'attestation de pré-inscription officielle.

### 2. Destinataires des données
Vos documents sont uniquement accessibles au personnel habilité de GET Admission (conseillers, responsables pédagogiques et financiers) et transmis aux universités partenaires concernées par vos candidatures. Aucune donnée n'est cédée ou commercialisée à des tiers.

### 3. Durée de conservation
Les données sont conservées pendant toute la durée du parcours d'accompagnement et conformément aux obligations légales et réglementaires d'archivage.

### 4. Vos droits
Vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Vous pouvez exercer ce droit à tout moment via votre espace candidat ou en nous écrivant via la page Contact.`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="prose prose-sm prose-slate max-w-none">
        <h1 className="font-display text-3xl font-bold text-encre">Politique de Confidentialité</h1>
        <div className="mt-8 space-y-6 whitespace-pre-line text-ardoise leading-relaxed">
          {politique}
        </div>
      </div>
    </div>
  );
}
