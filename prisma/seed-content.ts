import { db } from "../src/lib/db";

async function main() {
  console.log("🌱 Seed contenu gérable...");

  // --- FAQ ---
  const faqs = [
    { question: "Comment fonctionne GET Admission ?", reponse: "GET Admission est une agence d'admission universitaire. Vous créez un compte, choisissez une université partenaire, soumettez votre dossier en ligne, réglez les frais d'agence, puis suivez l'avancement en temps réel jusqu'à l'attestation de pré-inscription.", ordre: 1 },
    { question: "Quels sont les frais d'agence ?", reponse: "Les frais d'agence varient selon l'université et la formation. Ils sont affichés transparentement sur chaque fiche formation. Ils couvrent l'accompagnement, la vérification du dossier, la transmission à l'université et l'émission de l'attestation.", ordre: 2 },
    { question: "Quels documents dois-je préparer ?", reponse: "Les pièces requises dépendent de la formation choisie. En général : diplôme, relevé de notes, CV, lettre de motivation, test de langue. La liste exacte est affichée sur la fiche de chaque formation et dans votre espace dossier.", ordre: 3 },
    { question: "Combien de temps prend une admission ?", reponse: "En moyenne 4 à 8 semaines : 1 semaine de vérification, 2 à 6 semaines de réponse de l'université, puis émission de l'attestation sous 48h. Vous suivez chaque étape en temps réel dans votre espace.", ordre: 4 },
    { question: "Puis-je payer en plusieurs fois ?", reponse: "Oui, le paiement en deux tranches est disponible. Vous réglez 50% à la soumission et 50% après la décision de l'université. Les moyens acceptés sont Orange Money, Moov Money, Wave et carte bancaire.", ordre: 5 },
    { question: "Que se passe-t-il en cas de refus ?", reponse: "En cas de refus, votre conseiller vous accompagne pour identifier une formation alternative dans une autre université partenaire. Les frais déjà réglés sont reportés sur le nouveau dossier.", ordre: 6 },
    { question: "Dans quels pays proposez-vous des universités ?", reponse: "France, Canada, Belgique, Maroc, Tunisie, Sénégal, Afrique du Sud, Liban et Cameroun. Le catalogue est régulièrement enrichi de nouveaux partenariats.", ordre: 7 },
    { question: "Comment suivre l'avancement de mon dossier ?", reponse: "Votre espace candidat affiche un suivi en temps réel : 12 étapes du brouillon à la clôture, historique horodaté, messagerie avec votre conseiller, et statut des pièces téléversées.", ordre: 8 },
    { question: "L'attestation est-elle officielle ?", reponse: "Oui. L'attestation de pré-inscription est délivrée par l'université partenaire et porte son sceau. GET Admission vous la transmet telle quelle, sans modification. Elle est reconnue pour les démarches de visa étudiant.", ordre: 9 },
    { question: "Puis-je récupérer mon attestation à l'agence ?", reponse: "Oui, vous pouvez choisir le mode de remise : téléchargement PDF ou retrait à l'agence. Dans ce cas, vous récupérez un document tamponné et signé.", ordre: 10 },
  ];
  for (const f of faqs) {
    await db.faq.upsert({ where: { id: f.ordre }, update: f, create: f });
  }
  console.log("✓ FAQ créée");

  // --- ContactInfo (singleton) ---
  await db.contactInfo.upsert({
    where: { id: 1 },
    update: {
      email: "contact@getadm.com",
      telephone: "+223 77879114 / +223 74303197 / +223 92588109",
      adresses: "Bacodjicoroni-Golf en face de fitini market",
      horaires: "Lun – Ven : 9h – 18h",
    },
    create: {
      id: 1,
      email: "contact@getadm.com",
      telephone: "+223 77879114 / +223 74303197 / +223 92588109",
      adresses: "Bacodjicoroni-Golf en face de fitini market",
      horaires: "Lun – Ven : 9h – 18h",
    },
  });
  console.log("✓ ContactInfo créée");

  // --- Nationalites ---
  const nationalites = ["Sénégalaise", "Ivoirienne", "Malienne", "Burkinabè", "Guinéenne", "Béninoise", "Togolaise", "Nigérienne", "Camerounaise", "Marocaine", "Tunisienne", "Gabonaise", "Congolaise", "Autre"];
  for (let i = 0; i < nationalites.length; i++) {
    const nom = nationalites[i]!;
    await db.nationalite.upsert({ where: { nom }, update: { ordre: i + 1 }, create: { nom, ordre: i + 1 } });
  }
  console.log("✓ Nationalités créées");

  // --- MoyenPaiement ---
  const moyens = [
    { nom: "Orange Money", couleur: "bg-orange-500", icone: "Smartphone", ordre: 1 },
    { nom: "Moov Money", couleur: "bg-blue-600", icone: "Smartphone", ordre: 2 },
    { nom: "Wave", couleur: "bg-cyan-500", icone: "Smartphone", ordre: 3 },
    { nom: "Carte bancaire", couleur: "bg-lapis", icone: "CreditCard", ordre: 4 },
  ];
  for (const m of moyens) {
    await db.moyenPaiement.upsert({ where: { id: m.ordre }, update: m, create: m });
  }
  console.log("✓ Moyens paiement créés");

  // --- ObjetContact ---
  const objets = ["Question générale", "Demande de dossier", "Suivi de dossier", "Partenariat", "Autre"];
  for (let i = 0; i < objets.length; i++) {
    const nom = objets[i]!;
    await db.objetContact.upsert({ where: { id: i + 1 }, update: { nom, ordre: i + 1 }, create: { nom, ordre: i + 1 } });
  }
  console.log("✓ Objets contact créés");

  // --- ContenuSection (étapes accueil + piliers à propos) ---
  const etapesContenu = [
    { numero: "01", icon: "UserPlus", titre: "Créez votre compte", description: "Inscription en ligne, choix de l'université et de la formation. Votre espace candidat est ouvert en quelques minutes." },
    { numero: "02", icon: "FileText", titre: "Constitution du dossier", description: "Téléversez vos pièces, votre conseiller vérifie l'éligibilité et vous guide vers la version finale du dossier." },
    { numero: "03", icon: "CreditCard", titre: "Paiement des frais d'agence", description: "Réglez les frais d'agence par Orange Money, Wave ou carte bancaire. Le reçu est disponible après validation." },
    { numero: "04", icon: "Stamp", titre: "Attestation de pré-inscription", description: "Une fois la pré-admission accordée par l'université, votre attestation officielle est disponible dans votre espace." },
  ];
  const piliersContenu = [
    { icon: "HeartHandshake", titre: "Accompagnement humain", description: "Chaque candidat est suivi par un conseiller dédié, joignable par messagerie. Pas de robot, pas de ticket anonyme : un interlocuteur unique qui connaît votre dossier." },
    { icon: "Eye", titre: "Transparence du suivi", description: "Vous voyez l'avancement de votre dossier étape par étape, comme on suit un vol. Frais, délais, pièces attendues : tout est publié et horodaté." },
    { icon: "Network", titre: "Réseau d'universités vérifiées", description: "Nos universités partenaires ont été visitées, leurs frais négociés et publiés, leurs délais de réponse mesurés. Vous savez toujours à quoi vous engager." },
  ];

  await db.contenuSection.upsert({
    where: { cle: "etapes" },
    update: {
      titre: "Comment ça marche",
      contenu: JSON.stringify(etapesContenu),
    },
    create: {
      cle: "etapes",
      titre: "Comment ça marche",
      contenu: JSON.stringify(etapesContenu),
    },
  });
  await db.contenuSection.upsert({
    where: { cle: "piliers" },
    update: {
      titre: "Nos piliers",
      contenu: JSON.stringify(piliersContenu),
    },
    create: {
      cle: "piliers",
      titre: "Nos piliers",
      contenu: JSON.stringify(piliersContenu),
    },
  });
  console.log("✓ ContenuSection (étapes/piliers) créée");

  const mentionsLegales = `## Mentions légales — GET Admission

**Éditeur :** GET Admission — Agence d'admission universitaire

**Contact :** voir la page Contact

**Hébergement :** infrastructure cloud sécurisée

**Données personnelles :** Les données collectées (identité, pièces KYC, dossiers) sont traitées exclusivement pour la gestion des candidatures et conformément aux principes de protection des données. Vous disposez d'un droit d'accès, de rectification et de suppression via votre espace personnel ou en contactant l'agence.

**Cookies :** La plateforme utilise des cookies de session strictement nécessaires à l'authentification.

**Propriété intellectuelle :** L'ensemble des contenus de ce site est la propriété de GET Admission.`;

  const politiqueConfidentialite = `## Politique de confidentialité

GET Admission collecte et conserve les données nécessaires au traitement de votre dossier d'admission. La durée de conservation est limitée à la durée du parcours + obligations légales. Aucune cession commerciale à des tiers n'est effectuée hors universités partenaires concernées par votre candidature.`;

  // Paramètres agence
  await db.parametre.upsert({
    where: { id: 1 },
    update: {
      mentionsLegales,
      politiqueConfidentialite,
      exigerEmailVerifie: false,
    },
    create: {
      id: 1,
      mentionsLegales,
      politiqueConfidentialite,
      exigerEmailVerifie: false,
    },
  });
  console.log("✓ Paramètres (mentions / confidentialité) créés");

  console.log("🎉 Seed contenu gérable terminé !");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
