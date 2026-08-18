import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const generalSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const SITE_URL = "https://get-admission.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tonomi — Agence d'admission universitaire & études à l'étranger",
    template: "%s | Tonomi (GET Admission)",
  },
  description:
    "Tonomi (GET Admission) est la plateforme et agence leader d'accompagnement aux admissions universitaires à l'étranger (France, Europe). Constitution de dossier académique, universités partenaires, réservation de logement CROUS, assistance visa étudiant et délivrance d'attestations de pré-inscription certifiées.",
  keywords: [
    "Tonomi",
    "Tonomi admission",
    "Tonomi études en France",
    "Tonomi GET Admission",
    "Tonomi visa étudiant",
    "Tonomi logement CROUS",
    "Tonomi pré-inscription",
    "plateforme Tonomi",
    "agence Tonomi",
    "GET Admission",
    "admission universitaire France",
    "étudier en France",
    "étudier à l'étranger",
    "pré-inscription université France",
    "inscription université Sénégal",
    "inscription université Côte d'Ivoire",
    "inscription université Guinée",
    "inscription université Cameroun",
    "inscription université Mali",
    "inscription université Gabon",
    "inscription université Congo",
    "inscription université Togo",
    "inscription université Bénin",
    "Campus France accompagnement",
    "logement CROUS étudiant",
    "garant logement étudiant France",
    "visa étudiant France long séjour",
    "attestation de pré-inscription officielle",
    "dossier académique international",
    "universités partenaires France",
    "bourse d'études étranger",
    "frais d'agence admission",
  ],
  authors: [{ name: "Tonomi", url: SITE_URL }],
  creator: "Tonomi",
  publisher: "Tonomi",
  applicationName: "Tonomi",
  category: "Education",
  alternates: {
    canonical: SITE_URL,
    languages: {
      "fr-FR": SITE_URL,
      "fr-SN": SITE_URL,
      "fr-CI": SITE_URL,
      "fr-GN": SITE_URL,
      "fr-CM": SITE_URL,
      "fr-ML": SITE_URL,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: ["fr_SN", "fr_CI", "fr_GN", "fr_CM", "fr_ML"],
    url: SITE_URL,
    siteName: "Tonomi",
    title: "Tonomi — Votre passerelle officielle vers les universités internationales",
    description:
      "Tonomi (GET Admission) vous accompagne de bout en bout : choix de formation, admission garantie dans nos universités partenaires, logement CROUS et visa étudiant.",
    images: [
      {
        url: "/images/brand/logo-get-admission.png",
        width: 1200,
        height: 630,
        alt: "Tonomi — Plateforme d'admission universitaire et d'études à l'étranger",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tonomi — Votre passerelle officielle vers les universités internationales",
    description:
      "Tonomi vous accompagne dans votre admission universitaire en France et en Europe. Suivi de dossier en temps réel, logement CROUS et visa.",
    images: ["/images/brand/logo-get-admission.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon-32x32.png"],
  },
  other: {
    "geo.region": "FR",
    "geo.placename": "Paris",
    "format-detection": "telephone=yes",
  },
};

const jsonLdGlobal = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": `${SITE_URL}/#organization`,
      name: "Tonomi",
      alternateName: ["GET Admission", "Tonomi International", "Tonomi GET Admission"],
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/brand/logo-get-admission.png`,
        width: "512",
        height: "512",
      },
      image: `${SITE_URL}/images/brand/logo-get-admission.png`,
      description:
        "Tonomi est la plateforme et agence d'intermédiation universitaire spécialisée dans l'accompagnement et l'admission des étudiants internationaux dans les universités partenaires en France et en Europe.",
      areaServed: [
        { "@type": "Country", name: "France" },
        { "@type": "Country", name: "Sénégal" },
        { "@type": "Country", name: "Côte d'Ivoire" },
        { "@type": "Country", name: "Guinée" },
        { "@type": "Country", name: "Cameroun" },
        { "@type": "Country", name: "Mali" },
        { "@type": "Country", name: "Gabon" },
        { "@type": "Country", name: "Congo" },
        { "@type": "Country", name: "Togo" },
        { "@type": "Country", name: "Bénin" },
      ],
      knowsAbout: [
        "Admission Universitaire",
        "Campus France",
        "Visa Étudiant",
        "Logement CROUS",
        "Attestation de Pré-inscription",
        "Études Supérieures en France",
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "contact@get-admission.com",
          availableLanguage: ["French", "English"],
        },
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        bestRating: "5",
        ratingCount: "380",
        reviewCount: "295",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "GET Admission",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/universites?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
      inLanguage: "fr-FR",
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#service-admission`,
      name: "Accompagnement et Admission Universitaire",
      provider: { "@id": `${SITE_URL}/#organization` },
      serviceType: "Accompagnement académique et pré-inscription universitaire",
      description:
        "Création et validation de dossier académique, orientation vers les formations et délivrance d'attestations de pré-inscription officielles.",
      areaServed: "Worldwide",
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#service-logement`,
      name: "Réservation de Logement Étudiant & CROUS",
      provider: { "@id": `${SITE_URL}/#organization` },
      serviceType: "Accompagnement au logement étudiant",
      description: "Assistance et réservation de logements étudiants et résidences CROUS certifiées.",
      areaServed: "France",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGlobal) }}
        />
      </head>
      <body
        className={`${bricolage.variable} ${generalSans.variable} ${geistMono.variable} antialiased bg-porcelaine text-encre`}
      >
        <Providers>{children}</Providers>
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}

