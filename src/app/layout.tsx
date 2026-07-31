import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
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

export const metadata: Metadata = {
  title: "GET Admission — Votre passage vers l'international",
  description:
    "Agence d'admission universitaire. Créez votre dossier, choisissez votre université partenaire, suivez l'avancement en temps réel et récupérez votre attestation de pré-inscription.",
  keywords: [
    "GET Admission",
    "admission universitaire",
    "études à l'étranger",
    "Afrique de l'Ouest",
    "pré-inscription",
    "universités partenaires",
  ],
  authors: [{ name: "GET Admission" }],
  applicationName: "GET Admission",
  // Favicon : monogramme GET (lisible en onglet) + Apple = logo complet
  // Les fichiers src/app/icon.png et apple-icon.png sont aussi servis par Next.js.
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${bricolage.variable} ${generalSans.variable} ${geistMono.variable} antialiased bg-porcelaine text-encre`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
