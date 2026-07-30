import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GET Admission — Le passage vers l'international",
    short_name: "GET Admission",
    description: "Agence d'admission universitaire. Dossier, suivi temps réel, attestation officielle.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F6FB",
    theme_color: "#173A7A",
    icons: [
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml" },
    ],
    categories: ["education", "business"],
    lang: "fr",
  };
}
