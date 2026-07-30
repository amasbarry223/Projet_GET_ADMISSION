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

  // --- Témoignages ---
  const temoignages = [
    { nom: "Marième F.", parcours: "Master Transport · Hasselt", pays: "🇧🇪 Belgique", citation: "J'ai déposé mon dossier en janvier. Trois semaines plus tard, j'avais ma pré-admission. Le suivi pas à pas m'a évité toutes les erreurs classiques.", ordre: 1 },
    { nom: "Awa T.", parcours: "Master Droit · Mohammed V", pays: "🇲🇦 Maroc", citation: "L'équipe de GET Admission a rendu l'admission au Maroc simple et transparente. Je savais à chaque étape où en était mon dossier.", ordre: 2 },
    { nom: "Paul N.", parcours: "Master Commerce · UCT", pays: "🇿🇦 Afrique du Sud", citation: "Le Cape Town, c'était mon rêve. GET Admission m'a accompagné du premier document jusqu'à l'attestation officielle.", ordre: 3 },
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
