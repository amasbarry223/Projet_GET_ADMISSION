import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contactez-nous — Conseillers & Agence",
  description:
    "Prenez contact avec l'équipe GET Admission. Posez vos questions sur les démarches d'admission, les universités partenaires ou prenez rendez-vous avec un conseiller.",
  alternates: {
    canonical: "https://get-admission.com/contact",
  },
  openGraph: {
    title: "Contact — GET Admission",
    description:
      "Notre équipe est à votre écoute pour vous accompagner dans votre projet d'études universitaires.",
    url: "https://get-admission.com/contact",
    type: "website",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
