import { NextResponse } from "next/server";

// Manifeste dédié au back-office — installable séparément de la vitrine et de
// l'espace candidat (voir metadata.manifest dans admin/layout.tsx).
//
// Next.js ne génère la convention de fichier manifest.ts qu'à la racine de
// `app/` (pas de scoping par segment de route) — route handler manuel ici.
export async function GET() {
  return NextResponse.json(
    {
      name: "GET Admission — Back-office",
      short_name: "GA Back-office",
      description: "Back-office GET Admission — dossiers, KYC, paiements, catalogue et pilotage de l'agence.",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      background_color: "#F3F4F6",
      theme_color: "#3CA936",
      icons: [
        { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
      categories: ["business", "productivity"],
      lang: "fr",
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
