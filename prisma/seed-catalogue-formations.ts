/**
 * Remplace les formations de toutes les universités par la liste canonique
 * PSTM + Galileo (préserve les formations encore liées à des dossiers).
 *
 * Usage: npx tsx prisma/seed-catalogue-formations.ts
 */
import { db } from "../src/lib/db";
import { resolveFraisAgenceAsync } from "../src/lib/dossier/frais-agence-server";
import { FORMATIONS_CANONIQUES } from "./catalogue-formations-canoniques";
import { lookupFraisFormationEuros } from "./frais-formation-recherche";

async function main() {
  console.log("🌱 Seed catalogue formations unifiées (PSTM + Galileo)…");
  console.log(`   ${FORMATIONS_CANONIQUES.length} intitulés canoniques`);

  const universites = await db.universite.findMany({
    select: {
      id: true,
      slug: true,
      nom: true,
      typeEtablissement: true,
      _count: {
        select: {
          formations: true,
        },
      },
    },
    orderBy: { nom: "asc" },
  });

  if (universites.length === 0) {
    console.warn("⚠ Aucune université en base — rien à faire.");
    await db.$disconnect();
    return;
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalDeleted = 0;
  let totalKeptLinked = 0;
  let totalFraisEuros = 0;

  const canonicalTitles = new Set(FORMATIONS_CANONIQUES.map((f) => f.intitule));

  for (const univ of universites) {
    const fraisAgence = await resolveFraisAgenceAsync(univ.typeEtablissement);

    // 1. Supprimer les formations sans dossier
    const deleted = await db.formation.deleteMany({
      where: {
        universiteId: univ.id,
        dossiers: { none: {} },
      },
    });
    totalDeleted += deleted.count;

    // 2. Upsert chaque formation canonique
    let created = 0;
    let updated = 0;
    let fraisSet = 0;
    for (const f of FORMATIONS_CANONIQUES) {
      const existing = await db.formation.findFirst({
        where: { universiteId: univ.id, intitule: f.intitule },
        select: { id: true },
      });

      const fraisFormationEuros = lookupFraisFormationEuros(univ.slug, f.intitule);
      if (fraisFormationEuros != null) fraisSet++;

      const data = {
        niveau: f.niveau,
        domaine: f.domaine,
        duree: f.duree,
        fraisAgence,
        prerequis: JSON.stringify(f.prerequis),
        piecesRequises: JSON.stringify(f.piecesRequises),
        // N'écrit les € que si source connue (ne force pas null sur upsert seed)
        ...(fraisFormationEuros != null ? { fraisFormationEuros } : {}),
      };

      if (existing) {
        await db.formation.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await db.formation.create({
          data: {
            universiteId: univ.id,
            intitule: f.intitule,
            ...data,
          },
        });
        created++;
      }
    }

    // 3. Compter les anciennes encore liées à des dossiers
    const kept = await db.formation.count({
      where: {
        universiteId: univ.id,
        intitule: { notIn: [...canonicalTitles] },
        dossiers: { some: {} },
      },
    });

    totalCreated += created;
    totalUpdated += updated;
    totalKeptLinked += kept;
    totalFraisEuros += fraisSet;

    console.log(
      `  ✓ ${univ.slug}: −${deleted.count} libres · +${created} créées · ~${updated} maj · €=${fraisSet}` +
        (kept ? ` · ${kept} liées dossiers conservées` : ""),
    );
  }

  console.log(
    `\n🎉 Terminé — ${universites.length} univ · créées=${totalCreated} · maj=${totalUpdated} · supprimées=${totalDeleted} · conservées=${totalKeptLinked} · grilles€=${totalFraisEuros}`,
  );
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
