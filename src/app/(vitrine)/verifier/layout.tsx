import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vérifier une Attestation de Pré-inscription Officielle",
  description:
    "Service de vérification en ligne d'authenticité des attestations officielles délivrées par GET Admission. Entrez le code de vérification ou scannez le QR code pour authentifier le document.",
  alternates: {
    canonical: "https://get-admission.com/verifier",
  },
  openGraph: {
    title: "Vérification d'Attestation Officielle | GET Admission",
    description:
      "Vérifiez en temps réel l'authenticité et la validité d'une attestation de pré-inscription émise par GET Admission.",
    url: "https://get-admission.com/verifier",
    type: "website",
  },
};

export default function VerifierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
