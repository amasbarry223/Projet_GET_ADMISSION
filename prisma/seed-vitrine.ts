import { db } from "../src/lib/db";

async function main() {
  console.log("🌱 Seed contenu vitrine...");

  // --- Statistiques ---
  const stats = [
    { valeur: "1 248", libelle: "Dossiers traités", ordre: 1 },
    { valeur: "10", libelle: "Universités partenaires", ordre: 2 },
    { valeur: "6", libelle: "Pays couverts", ordre: 3 },
    { valeur: "78 %", libelle: "Taux d'acceptation", ordre: 4 },
  ];

  for (const s of stats) {
    await db.statistique.upsert({
      where: { id: s.ordre },
      update: { valeur: s.valeur, libelle: s.libelle, ordre: s.ordre },
      create: s,
    });
  }
  console.log("✓ Statistiques créées");

  // --- Témoignages (étudiants maliens) ---
  const temoignages = [
    {
      nom: "Fatoumata K.",
      parcours: "Master Santé publique · Montréal",
      pays: "Bamako",
      citation:
        "Depuis Bamako, je ne savais pas par où commencer. GET Admission a clarifié chaque pièce du dossier et j’ai reçu ma pré-admission sans stress inutile.",
      ordre: 1,
    },
    {
      nom: "Ibrahim S.",
      parcours: "Licence Informatique · Nantes",
      pays: "Sikasso",
      citation:
        "Venant de Sikasso, les démarches m’intimidaient. Mon conseiller a suivi mon dossier jour après jour jusqu’à l’attestation officielle.",
      ordre: 2,
    },
    {
      nom: "Aïssata D.",
      parcours: "Master Droit · Mohammed V",
      pays: "Bamako",
      citation:
        "Étudier au Maroc était mon objectif. GET Admission a rendu le parcours simple, transparent et adapté aux réalités des étudiants maliens.",
      ordre: 3,
    },
  ];

  for (const t of temoignages) {
    await db.temoignage.upsert({
      where: { id: t.ordre },
      update: t,
      create: t,
    });
  }
  console.log("✓ Témoignages créés");

  // --- Membres équipe ---
  const equipe = [
    { initiales: "AD", nom: "Aïssatou Diallo", role: "Conseillère pédagogique", ordre: 1 },
    { initiales: "ON", nom: "Olivier Nguema", role: "Conseiller partenariats", ordre: 2 },
    { initiales: "MK", nom: "Mariama Konaté", role: "Responsable finance", ordre: 3 },
    { initiales: "YB", nom: "Yasmine Bensaid", role: "Directrice", ordre: 4 },
  ];

  for (const m of equipe) {
    await db.membreEquipe.upsert({
      where: { id: m.ordre },
      update: m,
      create: m,
    });
  }
  console.log("✓ Membres équipe créés");

  console.log("🎉 Seed vitrine terminé !");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
