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
    select: { nom: true, pays: true, ville: true, description: true, estPlaceholder: true },
  });
  if (!univ || univ.estPlaceholder) return { title: "Université non trouvée" };
  return {
    title: `${univ.nom} — ${univ.ville}, ${univ.pays} | GET Admission`,
    description: univ.description.slice(0, 160),
    openGraph: {
      title: `${univ.nom} | GET Admission`,
      description: univ.description.slice(0, 160),
      type: "website",
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
  });
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
    typeEtablissement: row.typeEtablissement,
    fraisMin: frais,
    fraisMax: frais,
    coverUrl: row.coverUrl,
    logoUrl: row.logoUrl,
    siteUrl: row.siteUrl,
    galleryUrls: parseStringArray(row.galleryUrls),
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

  return (
    <UniversiteDetailView
      universite={universite}
      formations={formations}
      piecesUniques={piecesUniques}
      dossierBaseHref={dossierBaseHref}
      formationHrefs={formationHrefs}
    />
  );
}
