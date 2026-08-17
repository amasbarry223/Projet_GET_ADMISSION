import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://get-admission.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/universites",
          "/universites/*",
          "/a-propos",
          "/faq",
          "/contact",
          "/mentions-legales",
          "/politique-confidentialite",
        ],
        disallow: [
          "/espace",
          "/espace/*",
          "/admin",
          "/admin/*",
          "/api",
          "/api/*",
          "/connexion",
          "/inscription",
          "/mot-de-passe-oublie",
          "/reinitialiser-mot-de-passe",
          "/verification-email",
          "/verification-otp",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

