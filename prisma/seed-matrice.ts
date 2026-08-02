import { db } from "../src/lib/db";
import { MATRICE_V1_REGLES } from "../src/lib/dossier/matrice-v1-regles";

export async function seedMatriceDocumentaire() {
  const existing = await db.matriceVersion.findFirst({
    where: { statut: "ACTIVE" },
    select: { id: true },
  });
  if (existing) {
    console.log("✓ Matrice ACTIVE déjà présente — skip seed");
    return existing.id;
  }

  const version = await db.matriceVersion.create({
    data: {
      numero: 1,
      libelle: "Matrice académique v1 (CDC)",
      statut: "ACTIVE",
      notes: "Seed initial — équivalent au moteur hardcodé historique",
      activatedAt: new Date(),
      regles: {
        create: MATRICE_V1_REGLES.map((r) => ({
          code: r.code,
          libelle: r.libelle,
          categorie: r.categorie,
          obligatoire: r.obligatoire,
          condition: r.condition,
          niveauMin: r.niveauMin ?? null,
          meta: r.meta ?? "{}",
          ordre: r.ordre,
        })),
      },
    },
  });

  console.log(`✓ Matrice documentaire v${version.numero} ACTIVE (${MATRICE_V1_REGLES.length} règles)`);
  return version.id;
}

async function main() {
  await seedMatriceDocumentaire();
  // Align Parametre frais
  await db.parametre.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      fraisMin: 65000,
      fraisMax: 110000,
      fraisAgencePublic: 65000,
      fraisAgencePrive: 110000,
    },
    update: {
      fraisAgencePublic: 65000,
      fraisAgencePrive: 110000,
      fraisMin: 65000,
      fraisMax: 110000,
    },
  });
  console.log("✓ Parametre frais agence public/privé");
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
