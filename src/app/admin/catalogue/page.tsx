import { db } from "@/lib/db";
import { normalizeUniversite } from "@/lib/types";
import { CatalogueClient } from "@/components/admin/catalogue-client";
import { requireAdminPage } from "@/lib/admin-page-auth";

export default async function AdminCataloguePage() {
  await requireAdminPage("catalogue.write");

  const universites = await db.universite.findMany({
    // Établissement technique de la procédure Université Publique — géré uniquement via le panneau
    // d'affectation sur la fiche dossier, jamais depuis la gestion classique du catalogue.
    where: { estPlaceholder: false },
    include: { formations: true },
    orderBy: { nom: "asc" },
  });

  // Parse JSON string fields (SQLite limitation) into real arrays.
  const data = universites.map(normalizeUniversite);

  return <CatalogueClient initialData={data} />;
}
