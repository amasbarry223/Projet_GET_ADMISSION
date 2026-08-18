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

const contactJsonLd = {
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
          name: "Contact",
          item: "https://get-admission.com/contact",
        },
      ],
    },
    {
      "@type": "ContactPage",
      "@id": "https://get-admission.com/contact#webpage",
      url: "https://get-admission.com/contact",
      name: "Contactez l'agence GET Admission",
      description:
        "Contactez nos conseillers spécialisés en admission universitaire internationale, visa étudiant et logement CROUS.",
      mainEntity: {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: "contact@get-admission.com",
        availableLanguage: ["French", "English"],
      },
    },
  ],
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      {children}
    </>
  );
}
