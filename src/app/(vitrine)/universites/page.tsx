import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/parse-json";
import { getFraisAgenceConfig, resolveFraisAgence } from "@/lib/dossier/frais-agence-server";
import {
  CatalogueClient,
  type CatalogueUniversite,
  type Niveau,
} from "@/components/site/catalogue-client";

export const dynamic = "force-dynamic";

export default async function CatalogueUniversitesPage() {
  const [rows, fraisConfig] = await Promise.all([
    db.universite.findMany({
      where: { estPlaceholder: false },
      include: { formations: true },
      orderBy: { nom: "asc" },
    }),
    getFraisAgenceConfig(),
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

  return <CatalogueClient universites={universites} />;
}
