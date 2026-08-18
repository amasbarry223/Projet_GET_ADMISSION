import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";

import { db } from "@/lib/db";
import { resolveFraisAgence } from "@/lib/dossier/frais-agence";
import {
  UniversiteDetailView,
  type FormationDetailData,
  type UniversiteDetailData,
} from "@/components/site/universite-detail-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const univ = await db.universite.findUnique({
    where: { slug },
    select: { nom: true, pays: true, ville: true, description: true, coverUrl: true, logoUrl: true, estPlaceholder: true },
  }).catch(() => null);
  if (!univ || univ.estPlaceholder) return { title: "Université non trouvée" };

  const canonicalUrl = `https://get-admission.com/universites/${encodeURIComponent(slug)}`;
  const ogImage = univ.coverUrl || univ.logoUrl || "/images/brand/logo-get-admission.png";

  return {
    title: `${univ.nom} (${univ.ville}, ${univ.pays}) — Formations & Admission`,
    description: univ.description.slice(0, 160),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${univ.nom} — ${univ.ville}, ${univ.pays} | Tonomi (GET Admission)`,
      description: univ.description.slice(0, 160),
      url: canonicalUrl,
      type: "website",
      images: [{ url: ogImage, alt: univ.nom }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${univ.nom} — ${univ.ville}, ${univ.pays} | Tonomi (GET Admission)`,
      description: univ.description.slice(0, 160),
      images: [ogImage],
    },
  };
}

function parseStringArray(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

export default async function UniversiteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await db.universite.findUnique({
    where: { slug },
    include: { formations: true },
  }).catch(() => null);
  if (!row || row.estPlaceholder) notFound();

  const frais = resolveFraisAgence(row.typeEtablissement);

  const universite: UniversiteDetailData = {
    id: row.id,
    slug: row.slug,
    nom: row.nom,
    pays: row.pays,
    drapeau: row.drapeau,
    ville: row.ville,
    ecusson: row.ecusson,
    description: row.description,
    domaines: parseStringArray(row.domaines),
    pointsForts: parseStringArray(row.pointsForts),
    imageCouleur: row.imageCouleur,
    siteUrl: row.siteUrl,
    logoUrl: row.logoUrl,
    coverUrl: row.coverUrl,
    galleryUrls: parseStringArray(row.galleryUrls),
    typeEtablissement: row.typeEtablissement,
    fraisMin: frais,
    fraisMax: frais,
  };

  const formations: FormationDetailData[] = row.formations.map((f) => ({
    id: f.id,
    intitule: f.intitule,
    niveau: f.niveau,
    domaine: f.domaine,
    duree: f.duree,
    fraisAgence: frais,
    fraisFormationEuros: f.fraisFormationEuros ?? null,
    prerequis: parseStringArray(f.prerequis),
    piecesRequises: parseStringArray(f.piecesRequises),
  }));

  const piecesUniques = Array.from(
    new Set(formations.flatMap((f) => f.piecesRequises)),
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const session = await getSession();

  const buildDossierPath = (formationId?: string) => {
    const q = new URLSearchParams({ universite: universite.id });
    if (formationId) q.set("formation", formationId);
    const path = `/espace/dossier?${q.toString()}`;
    if (session?.user) return path;
    return `/inscription?callbackUrl=${encodeURIComponent(path)}`;
  };

  const dossierBaseHref = buildDossierPath();
  const formationHrefs = Object.fromEntries(
    formations.map((f) => [f.id, buildDossierPath(f.id)]),
  );

  const jsonLd = {
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
            name: "Universités partenaires",
            item: "https://get-admission.com/universites",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: row.nom,
            item: `https://get-admission.com/universites/${encodeURIComponent(row.slug)}`,
          },
        ],
      },
      {
        "@type": "EducationalOrganization",
        name: row.nom,
        description: row.description,
        url: row.siteUrl || `https://get-admission.com/universites/${encodeURIComponent(row.slug)}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: row.ville,
          addressCountry: row.pays,
        },
        ...(row.logoUrl ? { logo: row.logoUrl } : {}),
        ...(row.coverUrl ? { image: row.coverUrl } : {}),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <UniversiteDetailView
        universite={universite}
        formations={formations}
        piecesUniques={piecesUniques}
        dossierBaseHref={dossierBaseHref}
        formationHrefs={formationHrefs}
      />
    </>
  );
}
