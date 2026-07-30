import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/espace", "/admin", "/api"],
    },
    sitemap: "https://getadm.com/sitemap.xml",
  };
}
