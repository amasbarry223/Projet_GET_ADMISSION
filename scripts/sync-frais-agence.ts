/**
 * Aligne Formation.fraisAgence, Universite.fraisMin/Max et dossiers éditables
 * sur resolveFraisAgence(typeEtablissement).
 *
 * Usage: npx tsx scripts/sync-frais-agence.ts
 */
import { db } from "../src/lib/db";
import { resolveFraisAgence, resolveFraisRange } from "../src/lib/dossier/frais-agence";

async function main() {
  const univs = await db.universite.findMany({
    select: { id: true, slug: true, typeEtablissement: true },
  });

  let formationsUpdated = 0;
  let dossiersUpdated = 0;

  for (const u of univs) {
    const frais = resolveFraisAgence(u.typeEtablissement);
    const range = resolveFraisRange(u.typeEtablissement);

    await db.universite.update({
      where: { id: u.id },
      data: { fraisMin: range.fraisMin, fraisMax: range.fraisMax },
    });

    const fRes = await db.formation.updateMany({
      where: { universiteId: u.id },
      data: { fraisAgence: frais },
    });
    formationsUpdated += fRes.count;

    const dRes = await db.dossier.updateMany({
      where: {
        universiteId: u.id,
        etat: { in: ["BROUILLON", "CORRECTION"] },
      },
      data: { fraisAgence: frais },
    });
    dossiersUpdated += dRes.count;

    console.log(`${u.slug}: ${u.typeEtablissement} → ${frais} FCFA`);
  }

  console.log(
    `OK — formations: ${formationsUpdated}, dossiers éditables: ${dossiersUpdated}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
