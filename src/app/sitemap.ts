import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://get-admission.com";
  const now = new Date();

  // Pages statiques prioritaires
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/universites`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/a-propos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/verifier`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/mentions-legales`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/politique-confidentialite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Pages dynamiques des universités
  let universitePages: MetadataRoute.Sitemap = [];
  try {
    const universites = await db.universite.findMany({
      where: { estPlaceholder: false },
      select: { slug: true, updatedAt: true },
    });

    universitePages = universites.map((u) => ({
      url: `${baseUrl}/universites/${encodeURIComponent(u.slug)}`,
      lastModified: u.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.85,
    }));
  } catch {
    universitePages = [];
  }

  return [...staticPages, ...universitePages];
}

