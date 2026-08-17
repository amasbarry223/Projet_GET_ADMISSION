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
    default: "GET Admission — Agence d'admission universitaire et d'études à l'étranger",
    template: "%s | GET Admission",
  },
  description:
    "Agence spécialisée d'accompagnement aux admissions universitaires à l'étranger (France, Europe). Constitution de dossier académique, choix de formation, logement CROUS, visa et obtention d'attestation de pré-inscription officielle.",
  keywords: [
    "GET Admission",
    "admission universitaire",
    "études en France",
    "études à l'étranger",
    "pré-inscription université",
    "logement CROUS",
    "visa étudiant",
    "universités partenaires",
    "Campus France",
    "agence admission Afrique",
    "dossier d'admission",
    "attestation de préinscription",
  ],
  authors: [{ name: "GET Admission", url: SITE_URL }],
  creator: "GET Admission",
  publisher: "GET Admission",
  applicationName: "GET Admission",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "GET Admission",
    title: "GET Admission — Votre passage vers l'international",
    description:
      "Accompagnement complet pour vos admissions universitaires à l'étranger : dossier adaptatif, universités partenaires, suivi en temps réel et attestation officielle.",
    images: [
      {
        url: "/images/brand/logo-get-admission.png",
        width: 1200,
        height: 630,
        alt: "GET Admission — Plateforme d'admission universitaire",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GET Admission — Votre passage vers l'international",
    description:
      "Accompagnement complet pour vos admissions universitaires à l'étranger : dossier adaptatif, universités partenaires, suivi en temps réel et attestation officielle.",
    images: ["/images/brand/logo-get-admission.png"],
  },
  robots: {
    index: true,
    follow: true,
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
};

const jsonLdGlobal = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": `${SITE_URL}/#organization`,
      name: "GET Admission",
      url: SITE_URL,
      logo: `${SITE_URL}/images/brand/logo-get-admission.png`,
      description:
        "Agence d'accompagnement et d'intermédiation universitaire pour les étudiants souhaitant intégrer des universités partenaires à l'étranger.",
      sameAs: [],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        availableLanguage: ["French"],
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

