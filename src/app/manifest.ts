import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GET Admission — Le passage vers l'international",
    short_name: "GET Admission",
    description: "Agence d'admission universitaire. Dossier, suivi temps réel, attestation officielle.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3F4F6",
    theme_color: "#3CA936",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    categories: ["education", "business"],
    lang: "fr",
  };
}
