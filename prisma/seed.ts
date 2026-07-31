import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Début du seed...");

  // ------------------- Users (RBAC) -------------------
  // Mot de passe démo : SEED_DEMO_PASSWORD ou valeur non triviale (jamais "demo1234" en prod)
  const demoPassword = process.env.SEED_DEMO_PASSWORD || "GetAdm-Demo-2026!";
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const candidat = await db.user.upsert({
    where: { email: "fatou.diallo@demo.getadm" },
    update: { isDemo: true, emailVerified: new Date(), passwordHash },
    create: {
      email: "fatou.diallo@demo.getadm",
      passwordHash,
      prenom: "Fatou",
      nom: "Diallo",
      telephone: "+221 77 123 45 67",
      nationalite: "Sénégalaise",
      dateNaissance: "2002-04-12",
      adresse: "Dakar, Sénégal",
      role: "CANDIDAT",
      actif: true,
      isDemo: true,
      emailVerified: new Date(),
    },
  });

  const conseiller = await db.user.upsert({
    where: { email: "a.diallo@getadm.com" },
    update: { isDemo: true, emailVerified: new Date(), passwordHash },
    create: {
      email: "a.diallo@getadm.com",
      passwordHash,
      prenom: "Aïssatou",
      nom: "Diallo",
      telephone: "+221 33 800 00 00",
      role: "CONSEILLER",
      actif: true,
      isDemo: true,
      emailVerified: new Date(),
    },
  });

  const conseiller2 = await db.user.upsert({
    where: { email: "o.nguema@getadm.com" },
    update: { isDemo: true, emailVerified: new Date(), passwordHash },
    create: {
      email: "o.nguema@getadm.com",
      passwordHash,
      prenom: "Olivier",
      nom: "Nguema",
      role: "CONSEILLER",
      actif: true,
      isDemo: true,
      emailVerified: new Date(),
    },
  });

  const financier = await db.user.upsert({
    where: { email: "m.kouassi@getadm.com" },
    update: { isDemo: true, emailVerified: new Date(), passwordHash },
    create: {
      email: "m.kouassi@getadm.com",
      passwordHash,
      prenom: "Marc",
      nom: "Kouassi",
      role: "FINANCIER",
      actif: true,
      isDemo: true,
      emailVerified: new Date(),
    },
  });

  const admin = await db.user.upsert({
    where: { email: "y.bensaid@getadm.com" },
    update: { isDemo: true, emailVerified: new Date(), passwordHash },
    create: {
      email: "y.bensaid@getadm.com",
      passwordHash,
      prenom: "Yasmine",
      nom: "Bensaid",
      role: "ADMIN",
      actif: true,
      isDemo: true,
      emailVerified: new Date(),
    },
  });

  const superAdmin = await db.user.upsert({
    where: { email: "o.toure@getadm.com" },
    update: { isDemo: true, emailVerified: new Date(), passwordHash },
    create: {
      email: "o.toure@getadm.com",
      passwordHash,
      prenom: "Ousmane",
      nom: "Touré",
      role: "SUPER_ADMIN",
      actif: true,
      isDemo: true,
      emailVerified: new Date(),
    },
  });

  console.log("✓ Users créés");

  // ------------------- Universités -------------------
  const univData = [
    { slug: "sorbonne-universite", nom: "Sorbonne Université", pays: "France", drapeau: "🇫🇷", ville: "Paris", ecusson: "SU", domaines: ["Droit", "Sciences", "Lettres", "Médecine"], description: "Issue de la fusion de Paris-IV et Paris-VI, la Sorbonne Université est l'une des plus prestigieuses universités françaises.", pointsForts: ["Réseau d'échanges avec 48 pays", "Bibliothèque de 4 millions d'ouvrages"], imageCouleur: "from-lapis to-lapis-clair", fraisMin: 750000, fraisMax: 1450000 },
    { slug: "universite-de-montreal", nom: "Université de Montréal", pays: "Canada", drapeau: "🇨🇦", ville: "Montréal", ecusson: "UM", domaines: ["Informatique", "Sciences", "Management", "Santé"], description: "Avec sa filiale affiliée HEC Montréal, l'UdeM figure parmi les grandes universités francophones d'Amérique du Nord.", pointsForts: ["Pôle d'intelligence artificielle (MILA)", "Programmes en français et en anglais"], imageCouleur: "from-ardoise to-lapis", fraisMin: 950000, fraisMax: 1850000 },
    { slug: "universite-hasselt", nom: "Université de Hasselt", pays: "Belgique", drapeau: "🇧🇪", ville: "Hasselt", ecusson: "UH", domaines: ["Sciences", "Économie", "Transport", "Droit"], description: "Université jeune et innovante en Flandre, Hasselt mise sur l'interdisciplinarité.", pointsForts: ["Encadrement par petits groupes", "Programmes bilingues"], imageCouleur: "from-or to-ambre", fraisMin: 680000, fraisMax: 1150000 },
    { slug: "universite-mohammed-v-rabat", nom: "Université Mohammed V de Rabat", pays: "Maroc", drapeau: "🇲🇦", ville: "Rabat", ecusson: "UM5", domaines: ["Droit", "Sciences politiques", "Économie", "Lettres"], description: "Plus ancienne université marocaine moderne.", pointsForts: ["Excellence en droit public comparé", "Coûts d'études accessibles"], imageCouleur: "from-vert to-lapis", fraisMin: 420000, fraisMax: 880000 },
    { slug: "universite-cape-town", nom: "Université du Cap", pays: "Afrique du Sud", drapeau: "🇿🇦", ville: "Le Cap", ecusson: "UCT", domaines: ["Sciences", "Commerce", "Ingénierie", "Santé"], description: "Première université d'Afrique au classement QS.", pointsForts: ["Top 200 mondial (QS)", "Bourses pour étudiants africains"], imageCouleur: "from-lapis-clair to-vert", fraisMin: 880000, fraisMax: 1620000 },
    { slug: "universite-gaston-berger", nom: "Université Gaston Berger", pays: "Sénégal", drapeau: "🇸🇳", ville: "Saint-Louis", ecusson: "UGB", domaines: ["Sciences", "Économie", "Lettres", "Droit"], description: "Université sénégalaise de référence.", pointsForts: ["Cadre moderne à Saint-Louis", "Filières francophones régionales"], imageCouleur: "from-ambre to-or", fraisMin: 350000, fraisMax: 620000 },
    { slug: "universite-tunis-el-manar", nom: "Université de Tunis El Manar", pays: "Tunisie", drapeau: "🇹🇳", ville: "Tunis", ecusson: "UTM", domaines: ["Médecine", "Sciences", "Économie", "Ingénierie"], description: "Grande université tunisienne reconnue pour sa faculté de médecine.", pointsForts: ["Faculté de médecine réputée", "Coûts d'études modérés"], imageCouleur: "from-carmin to-ambre", fraisMin: 380000, fraisMax: 720000 },
    { slug: "universite-nantes", nom: "Université de Nantes", pays: "France", drapeau: "🇫🇷", ville: "Nantes", ecusson: "UN", domaines: ["Sciences", "Droit", "Lettres", "STAPS"], description: "Université pluridisciplinaire de l'Ouest français.", pointsForts: ["Maison des étudiants internationaux", "Bourses EIFFEL"], imageCouleur: "from-lapis to-vert", fraisMin: 620000, fraisMax: 1180000 },
    { slug: "universite-libanaise-americaine", nom: "Université Libano-Américaine", pays: "Liban", drapeau: "🇱🇧", ville: "Beyrouth", ecusson: "LAU", domaines: ["Management", "Ingénierie", "Architecture", "Santé"], description: "Université anglophone de référence au Liban.", pointsForts: ["Accréditations américaines", "Réseau d'alumni mondial"], imageCouleur: "from-ardoise to-or", fraisMin: 980000, fraisMax: 1750000 },
    { slug: "universite-yaounde-i", nom: "Université de Yaoundé I", pays: "Cameroun", drapeau: "🇨🇲", ville: "Yaoundé", ecusson: "UY1", domaines: ["Sciences", "Droit", "Médecine", "Lettres"], description: "Plus ancienne université camerounaise.", pointsForts: ["Filière scientifique reconnue", "Frais d'agence très accessibles"], imageCouleur: "from-vert to-ambre", fraisMin: 280000, fraisMax: 540000 },
  ];

  const univs: { id: string; slug: string }[] = [];
  for (const u of univData) {
    const assets = {
      logoUrl: `/images/partenaires/${u.slug}/logo.png`,
      coverUrl: u.slug === "sorbonne-universite" ? `/images/partenaires/${u.slug}/cover.webp` : `/images/partenaires/${u.slug}/cover.webp`,
      galleryUrls: JSON.stringify([
        `/images/partenaires/${u.slug}/gallery-1.webp`,
        `/images/partenaires/${u.slug}/gallery-2.webp`,
        `/images/partenaires/${u.slug}/gallery-3.webp`,
      ]),
    };
    const univ = await db.universite.upsert({
      where: { slug: u.slug },
      update: { ...assets },
      create: {
        ...u,
        ...assets,
        domaines: JSON.stringify(u.domaines),
        pointsForts: JSON.stringify(u.pointsForts),
      },
    });
    univs.push(univ);
  }
  console.log("✓ Universités créées");

  // ------------------- Formations -------------------
  const formationData = [
    { univSlug: "sorbonne-universite", intitule: "Master Droit international et européen", niveau: "Master", domaine: "Droit", duree: "2 ans", fraisAgence: 850000, prerequis: ["Licence en droit", "Niveau B2 en français"], piecesRequises: ["Diplôme de licence", "Relevé de notes", "CV", "Lettre de motivation", "Test de français (TCF/DELF)"] },
    { univSlug: "sorbonne-universite", intitule: "Licence Sciences de la matière", niveau: "Licence", domaine: "Sciences", duree: "1 an (L3)", fraisAgence: 720000, prerequis: ["Bac+2 scientifique"], piecesRequises: ["Diplôme Bac+2", "Relevé de notes", "CV", "Test de français"] },
    { univSlug: "sorbonne-universite", intitule: "Master Lettres et civilisations", niveau: "Master", domaine: "Lettres", duree: "2 ans", fraisAgence: 920000, prerequis: ["Licence en lettres", "Niveau C1 en français"], piecesRequises: ["Diplôme de licence", "Relevé de notes", "Mémoire de recherche", "Lettre de motivation"] },
    { univSlug: "universite-de-montreal", intitule: "Maîtrise en informatique — Intelligence artificielle", niveau: "Master", domaine: "Informatique", duree: "2 ans", fraisAgence: 1450000, prerequis: ["Bac en informatique", "Test d'anglais (IELTS/TOEFL)"], piecesRequises: ["Diplôme de bac", "Relevé de notes", "CV", "Lettre de motivation", "Test d'anglais"] },
    { univSlug: "universite-de-montreal", intitule: "Maîtrise en management international", niveau: "Master", domaine: "Management", duree: "1,5 an", fraisAgence: 1180000, prerequis: ["Bac+3 en gestion", "Test d'anglais"], piecesRequises: ["Diplôme de bac+3", "Relevé de notes", "CV", "Lettre de motivation"] },
    { univSlug: "universite-hasselt", intitule: "Master Transportation Sciences", niveau: "Master", domaine: "Transport", duree: "2 ans", fraisAgence: 980000, prerequis: ["Bac+3 en sciences humaines ou techniques", "Test d'anglais"], piecesRequises: ["Diplôme de bac+3", "Relevé de notes", "CV", "Lettre de motivation", "Test d'anglais"] },
    { univSlug: "universite-mohammed-v-rabat", intitule: "Master Droit public comparé", niveau: "Master", domaine: "Droit", duree: "2 ans", fraisAgence: 540000, prerequis: ["Licence en droit", "Niveau B2 en français"], piecesRequises: ["Diplôme de licence", "Relevé de notes", "CV", "Lettre de motivation"] },
    { univSlug: "universite-cape-town", intitule: "Master Commerce (MBA track)", niveau: "Master", domaine: "Commerce", duree: "1 an", fraisAgence: 1620000, prerequis: ["Bac+3 + expérience professionnelle", "Test d'anglais (IELTS)"], piecesRequises: ["Diplôme de bac+3", "Relevé de notes", "CV", "Test d'anglais", "Lettre de motivation"] },
    { univSlug: "universite-gaston-berger", intitule: "Master Économie appliquée", niveau: "Master", domaine: "Économie", duree: "2 ans", fraisAgence: 480000, prerequis: ["Licence en économie"], piecesRequises: ["Diplôme de licence", "Relevé de notes", "CV", "Lettre de motivation"] },
    { univSlug: "universite-tunis-el-manar", intitule: "Licence Ingénierie informatique", niveau: "Licence", domaine: "Ingénierie", duree: "1 an (L3)", fraisAgence: 540000, prerequis: ["Bac+2 scientifique"], piecesRequises: ["Diplôme Bac+2", "Relevé de notes", "CV"] },
    { univSlug: "universite-nantes", intitule: "Master STAPS — Management du sport", niveau: "Master", domaine: "STAPS", duree: "2 ans", fraisAgence: 780000, prerequis: ["Licence STAPS", "Niveau B2 en français"], piecesRequises: ["Diplôme de licence", "Relevé de notes", "CV", "Lettre de motivation"] },
    { univSlug: "universite-libanaise-americaine", intitule: "Master Architecture", niveau: "Master", domaine: "Architecture", duree: "2 ans", fraisAgence: 1750000, prerequis: ["Bac+3 en architecture", "Portfolio", "Test d'anglais"], piecesRequises: ["Diplôme de bac+3", "Portfolio", "CV", "Test d'anglais", "Lettre de motivation"] },
    { univSlug: "universite-yaounde-i", intitule: "Master Droit des affaires OHADA", niveau: "Master", domaine: "Droit", duree: "2 ans", fraisAgence: 480000, prerequis: ["Licence en droit"], piecesRequises: ["Diplôme de licence", "Relevé de notes", "CV", "Lettre de motivation"] },
  ];

  for (const f of formationData) {
    const univ = univs.find((u) => u.slug === f.univSlug);
    if (!univ) continue;
    await db.formation.create({
      data: {
        universiteId: univ.id,
        intitule: f.intitule,
        niveau: f.niveau,
        domaine: f.domaine,
        duree: f.duree,
        fraisAgence: f.fraisAgence,
        prerequis: JSON.stringify(f.prerequis),
        piecesRequises: JSON.stringify(f.piecesRequises),
      },
    });
  }
  console.log("✓ Formations créées");

  // ------------------- Dossier démo (Fatou → Sorbonne) -------------------
  const sorbonne = univs.find((u) => u.slug === "sorbonne-universite")!;
  const formation = await db.formation.findFirst({ where: { universiteId: sorbonne.id, intitule: "Master Droit international et européen" } });

  const mrz = "GETADM<<DIALLO<<FATOU<<<<<<<<<<2026\nSU<<M1<<<<<<048<<<<<<<<<<<<<<<<<<\nGETADM-2026-0048<<<<<<<<<<<<<<<<";

  const dossier = await db.dossier.create({
    data: {
      reference: "GETADM-2026-0048",
      candidatId: candidat.id,
      universiteId: sorbonne.id,
      formationId: formation!.id,
      etat: "PRE_ADMISSION",
      etapeActuelle: 9,
      conseillerId: conseiller.id,
      fraisAgence: 850000,
      paiementStatut: "complet",
      mrz,
      pieces: {
        create: [
          { libelle: "Diplôme de licence", statut: "validee", type: "pdf", taille: "1,2 Mo", nomFichier: "licence.pdf", televerseeLe: new Date("2026-01-12") },
          { libelle: "Relevé de notes", statut: "validee", type: "pdf", taille: "0,9 Mo", nomFichier: "notes.pdf", televerseeLe: new Date("2026-01-12") },
          { libelle: "Test TCF", statut: "validee", type: "pdf", taille: "0,6 Mo", nomFichier: "tcf.pdf", televerseeLe: new Date("2026-01-13") },
          { libelle: "Lettre de motivation", statut: "validee", type: "pdf", taille: "0,4 Mo", nomFichier: "motivation.pdf", televerseeLe: new Date("2026-01-12") },
          { libelle: "CV", statut: "validee", type: "pdf", taille: "0,5 Mo", nomFichier: "cv.pdf", televerseeLe: new Date("2026-01-12") },
        ],
      },
      historiques: {
        create: [
          { date: new Date("2026-01-10"), etat: "BROUILLON", auteur: "Fatou Diallo", note: "Dossier créé." },
          { date: new Date("2026-01-12"), etat: "SOUMIS", auteur: "Fatou Diallo", note: "Dossier soumis avec 5 pièces." },
          { date: new Date("2026-01-14"), etat: "VERIFICATION", auteur: "Aïssatou Diallo", note: "Prise en charge, début de vérification." },
          { date: new Date("2026-01-16"), etat: "PAIEMENT_ATTENTE", auteur: "Aïssatou Diallo", note: "Frais d'agence à régler : 850 000 FCFA." },
          { date: new Date("2026-01-18"), etat: "PAIEMENT_CONFIRME", auteur: "Système", note: "Paiement Orange Money confirmé." },
          { date: new Date("2026-01-19"), etat: "TRANSMIS", auteur: "Aïssatou Diallo", note: "Dossier transmis à la Sorbonne Université." },
          { date: new Date("2026-02-03"), etat: "PRE_ADMISSION", auteur: "Sorbonne Université", note: "Pré-admission accordée pour le Master 1." },
        ],
      },
    },
  });

  await db.paiement.create({
    data: {
      reference: "REC-2026-0481",
      dossierId: dossier.id,
      candidatId: candidat.id,
      date: new Date("2026-01-18"),
      montant: 850000,
      moyen: "Orange Money",
      statut: "reussi",
      tranche: "Solde",
    },
  });

  await db.conversation.create({
    data: {
      dossierId: dossier.id,
      candidatId: candidat.id,
      conseillerId: conseiller.id,
      nonLusCandidat: 2,
      messages: {
        create: [
          { auteurId: conseiller.id, texte: "Bonjour Fatou, votre dossier a bien été reçu. Je démarre la vérification.", createdAt: new Date("2026-01-14T14:30:00") },
          { auteurId: candidat.id, texte: "Bonjour Madame Diallo, merci beaucoup. Faut-il fournir une copie certifiée du diplôme ?", createdAt: new Date("2026-01-14T15:02:00") },
          { auteurId: conseiller.id, texte: "Oui, une copie certifiée conforme sera demandée par la Sorbonne.", createdAt: new Date("2026-01-14T15:18:00") },
          { auteurId: conseiller.id, texte: "Bonne nouvelle : votre paiement Orange Money a bien été reçu.", createdAt: new Date("2026-01-18T17:00:00") },
          { auteurId: conseiller.id, texte: "Votre pré-admission a été accordée par la Sorbonne Université. L'attestation sera disponible sous 48h.", createdAt: new Date("2026-02-03T12:30:00"), pieceJointeNom: "pre_admission_su.pdf", pieceJointeTaille: "0,8 Mo" },
        ],
      },
    },
  });

  console.log("✓ Dossier démo créé (GETADM-2026-0048)");
  console.log("🎉 Seed terminé !");
  console.log(`   Comptes démo (mot de passe: ${demoPassword}) — définir SEED_DEMO_PASSWORD pour personnaliser`);
  console.log("   - candidat:    fatou.diallo@demo.getadm");
  console.log("   - conseiller:  a.diallo@getadm.com");
  console.log("   - financier:   m.kouassi@getadm.com");
  console.log("   - admin:       y.bensaid@getadm.com");
  console.log("   - super admin: o.toure@getadm.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
