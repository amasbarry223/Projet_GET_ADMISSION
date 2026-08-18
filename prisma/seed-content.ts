import { db } from "../src/lib/db";

async function main() {
  console.log("🌱 Seed contenu gérable...");

  // --- FAQ Enrichie SEO ---
  const faqs = [
    {
      question: "Comment fonctionne l'accompagnement GET Admission ?",
      reponse: "GET Admission est votre passerelle officielle vers les universités internationales. Vous créez votre compte en quelques clics, choisissez votre formation parmi nos établissements partenaires, téléversez vos pièces académiques et réglez les frais d'agence. Votre conseiller dédié vérifie et optimise votre dossier, le transmet à l'université et vous délivre votre attestation officielle de pré-inscription reconnue pour Campus France et le visa.",
      ordre: 1,
    },
    {
      question: "Dois-je passer par Campus France si j'obtiens une pré-admission avec GET Admission ?",
      reponse: "Oui, pour les pays adhérents au dispositif Études en France (Sénégal, Côte d'Ivoire, Cameroun, Guinée, Mali, Gabon, Congo, etc.), la procédure Campus France reste obligatoire. Cependant, grâce à l'attestation de pré-inscription officielle fournie par GET Admission, vous êtes dispensé de la phase de candidature standard et accédez directement à la procédure 'Je suis accepté', ce qui simplifie grandement vos démarches et accélère votre entretien.",
      ordre: 2,
    },
    {
      question: "Quels sont les frais d'agence et comment sont-ils calculés ?",
      reponse: "Nos frais d'agence sont forfaitaires, clairs et sans frais cachés : 65 000 FCFA pour une admission en université publique et 110 000 FCFA pour un établissement privé partenaire. Ces frais couvrent l'analyse d'éligibilité, le montage du dossier selon la matrice documentaire, les échanges avec l'établissement et l'édition de votre attestation certifiée.",
      ordre: 3,
    },
    {
      question: "Comment fonctionne la réservation de logement CROUS et l'attestation d'hébergement ?",
      reponse: "GET Admission dispose d'un service dédié d'assistance au logement étudiant (résidences CROUS et logements privés partenaires). Dès validation de votre pré-admission, nous vous accompagnons pour obtenir une attestation d'hébergement ou une réservation ferme en résidence universitaire, document indispensable pour le dépôt de votre demande de visa long séjour.",
      ordre: 4,
    },
    {
      question: "Quelles sont les démarches et justificatifs financiers pour le visa étudiant France (VLS-TS) ?",
      reponse: "Pour obtenir le visa étudiant (VLS-TS), le consulat exige votre attestation de pré-inscription officielle, l'accord Campus France, un justificatif de logement (CROUS ou attestation d'hébergement) et une preuve de ressources financières suffisantes (caution bancaire bloquée ABI ou prise en charge par un garant fiable avec fiches de paie et avis d'imposition). Nos conseillers vous orientent pas à pas pour fiabiliser votre dossier consulaire.",
      ordre: 5,
    },
    {
      question: "Puis-je candidater sans le Baccalauréat si je suis actuellement en classe de Terminale ?",
      reponse: "Absolument ! Les lycéens en classe de Terminale peuvent initier leur dossier d'admission dès le premier ou second trimestre en fournissant leurs bulletins de Seconde, Première et Terminale ainsi qu'un certificat de scolarité. L'université émet une pré-admission sous réserve de l'obtention du Baccalauréat.",
      ordre: 6,
    },
    {
      question: "Quels documents académiques et pièces dois-je fournir ?",
      reponse: "Selon votre parcours, notre matrice documentaire intelligente adapte les pièces requises : pièce d'identité valide (passeport ou CNI), relevés de notes du lycée (2nde, 1ère, Terminale), attestation ou relevé du Baccalauréat, et relevés de notes de l'enseignement supérieur pour les candidats en Licence ou Master.",
      ordre: 7,
    },
    {
      question: "Quels sont les délais moyens pour obtenir mon attestation ?",
      reponse: "Le traitement global prend en moyenne entre 2 et 6 semaines : 48 à 72h pour la vérification initiale de conformité par votre conseiller GET Admission, puis 2 à 4 semaines de traitement pédagogique par l'université partenaire. Dès acceptation, l'attestation officielle de pré-inscription est générée sous 24 à 48 heures.",
      ordre: 8,
    },
    {
      question: "Est-il possible de régler les frais d'agence en plusieurs fois ?",
      reponse: "Oui, nous proposons une option de paiement en deux tranches pour vous faciliter les démarches. Vous pouvez régler vos frais par mobile money (Orange Money, Wave, Moov Money) ou par carte bancaire sécurisée avec reçu téléchargeable instantanément.",
      ordre: 9,
    },
    {
      question: "L'attestation de pré-inscription est-elle officielle et vérifiable ?",
      reponse: "Oui, chaque attestation délivrée comporte une référence unique et un code de sécurité vérifiable instantanément en ligne sur notre portail public (get-admission.com/verifier). Elle est émise sous l'autorité de l'université partenaire et respecte les critères requis par les consulats et ambassades.",
      ordre: 10,
    },
    {
      question: "Que se passe-t-il si l'université refuse ma candidature ?",
      reponse: "En cas de rejet par une université spécifique, votre conseiller analyse les motifs et vous propose immédiatement une réorientation vers une formation alternative compatible dans notre réseau partenaire, sans facturation de nouveaux frais de dossier.",
      ordre: 11,
    },
    {
      question: "Quels pays et destinations sont proposés par GET Admission ?",
      reponse: "Nous accompagnons principalement les candidatures vers la France, ainsi que le Canada, la Belgique et d'autres destinations européennes et africaines de premier plan (Maroc, Sénégal, Tunisie). Notre catalogue compte plus de 10 établissements partenaires de renom.",
      ordre: 12,
    },
    {
      question: "Depuis quels pays africains puis-je déposer ma candidature ?",
      reponse: "GET Admission accompagne les étudiants résidant partout en Afrique francophone et subsaharienne : Sénégal, Côte d'Ivoire, Guinée, Cameroun, Mali, Gabon, Congo, Togo, Bénin, Burkina Faso, Niger, Tchad, etc. L'ensemble de la procédure se fait 100% en ligne ou via nos conseillers régionaux.",
      ordre: 13,
    },
    {
      question: "Comment contacter mon conseiller personnel ?",
      reponse: "Dès la soumission de votre dossier, un conseiller attitré vous est assigné. Vous pouvez échanger directement avec lui via la messagerie instantanée intégrée à votre espace candidat ou par nos canaux de support téléphonique et e-mail.",
      ordre: 14,
    },
  ];
  for (const f of faqs) {
    await db.faq.upsert({ where: { id: f.ordre }, update: f, create: f });
  }
  console.log("✓ FAQ enrichie créée (14 questions)");

  // --- ContactInfo (singleton) ---
  await db.contactInfo.upsert({
    where: { id: 1 },
    update: {
      email: "getadmissionsfrance@gmail.com",
      telephone: "+223 77879114 / 74303197 / 92588109",
      adresses: "Bacodjicoroni-Golf en face de fitini market",
      horaires: "Lun – Ven : 9h – 18h",
    },
    create: {
      id: 1,
      email: "getadmissionsfrance@gmail.com",
      telephone: "+223 77879114 / 74303197 / 92588109",
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
