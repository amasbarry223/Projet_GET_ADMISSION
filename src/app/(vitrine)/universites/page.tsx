import type { Metadata } from "next";
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/parse-json";
import { getFraisAgenceConfig, resolveFraisAgence } from "@/lib/dossier/frais-agence-server";
import {
  CatalogueClient,
  type CatalogueUniversite,
  type Niveau,
} from "@/components/site/catalogue-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogue des Universités & Formations Partenaires | Tonomi",
  description:
    "Explorez le catalogue Tonomi d'établissements universitaires publics et privés partenaires. Filtrez par pays, domaine d'études, niveau (Licence, Master, Doctorat) et frais de scolarité.",
  alternates: {
    canonical: "https://get-admission.com/universites",
  },
  openGraph: {
    title: "Catalogue des Universités & Formations Partenaires | Tonomi (GET Admission)",
    description:
      "Trouvez l'université et la formation idéales pour vos études à l'étranger parmi nos établissements partenaires en France et en Europe.",
    url: "https://get-admission.com/universites",
    type: "website",
  },
};


export default async function CatalogueUniversitesPage() {
  const [rows, fraisConfig] = await Promise.all([
    db.universite.findMany({
      where: { estPlaceholder: false },
      include: { formations: true },
      orderBy: { nom: "asc" },
    }).catch(() => []),
    getFraisAgenceConfig().catch(() => ({ public: 300000, prive: 200000 })),
  ]);

  const universites: CatalogueUniversite[] = rows.map((u) => {
    const frais = resolveFraisAgence(u.typeEtablissement, fraisConfig);
    return {
      id: u.id,
      slug: u.slug,
      nom: u.nom,
      pays: u.pays,
      drapeau: u.drapeau,
      ville: u.ville,
      ecusson: u.ecusson,
      domaines: parseJsonArray(u.domaines),
      description: u.description,
      pointsForts: parseJsonArray(u.pointsForts),
      imageCouleur: u.imageCouleur,
      fraisMin: frais,
      fraisMax: frais,
      partenaire: u.partenaire,
      partenaires: u.partenaire,
      typeEtablissement: u.typeEtablissement,
      coverUrl: u.coverUrl,
      logoUrl: u.logoUrl,
      siteUrl: u.siteUrl,
      formations: u.formations.map((f) => ({
        id: f.id,
        universiteId: f.universiteId,
        intitule: f.intitule,
        niveau: f.niveau as Niveau,
        domaine: f.domaine,
        duree: f.duree,
        fraisAgence: frais,
        prerequis: parseJsonArray(f.prerequis),
        piecesRequises: parseJsonArray(f.piecesRequises),
      })),
    };
  });

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
        ],
      },
      {
        "@type": "CollectionPage",
        "@id": "https://get-admission.com/universites#webpage",
        url: "https://get-admission.com/universites",
        name: "Catalogue des Universités Partenaires — GET Admission",
        description:
          "Explorez notre catalogue complet d'établissements universitaires partenaires en France et en Europe avec formations en Licence, Master et Doctorat.",
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: universites.length,
          itemListElement: universites.map((u, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `https://get-admission.com/universites/${encodeURIComponent(u.slug)}`,
            name: u.nom,
          })),
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CatalogueClient universites={universites} />
    </>
  );
}
