import { db } from "@/lib/db";
import {
  CatalogueClient,
  type CatalogueUniversite,
  type Niveau,
} from "@/components/site/catalogue-client";

export const dynamic = "force-dynamic";

export default async function CatalogueUniversitesPage() {
  // Récupère toutes les universités avec leurs formations depuis la DB.
  const rows = await db.universite.findMany({
    include: { formations: true },
    orderBy: { nom: "asc" },
  });

  // Transforme : parse les champs JSON string (SQLite limitation).
  const universites: CatalogueUniversite[] = rows.map((u) => ({
    id: u.id,
    slug: u.slug,
    nom: u.nom,
    pays: u.pays,
    drapeau: u.drapeau,
    ville: u.ville,
    ecusson: u.ecusson,
    domaines: JSON.parse(u.domaines) as string[],
    description: u.description,
    pointsForts: JSON.parse(u.pointsForts) as string[],
    imageCouleur: u.imageCouleur,
    fraisMin: u.fraisMin,
    fraisMax: u.fraisMax,
    partenaire: u.partenaire,
    partenaires: u.partenaire, // miroir pour compat UniversiteCard
    formations: u.formations.map((f) => ({
      id: f.id,
      universiteId: f.universiteId,
      intitule: f.intitule,
      niveau: f.niveau as Niveau,
      domaine: f.domaine,
      duree: f.duree,
      fraisAgence: f.fraisAgence,
      prerequis: JSON.parse(f.prerequis) as string[],
      piecesRequises: JSON.parse(f.piecesRequises) as string[],
    })),
  }));

  return <CatalogueClient universites={universites} />;
}
