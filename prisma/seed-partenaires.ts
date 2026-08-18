import { db } from "../src/lib/db";

type PartnerSeed = {
  slug: string;
  nom: string;
  pays: string;
  drapeau: string;
  ville: string;
  ecusson: string;
  domaines: string[];
  description: string;
  pointsForts: string[];
  imageCouleur: string;
  siteUrl: string;
  fraisMin: number;
  fraisMax: number;
  formation?: {
    intitule: string;
    niveau: string;
    domaine: string;
    duree: string;
    fraisAgence: number;
  };
};

function assetPaths(slug: string) {
  const base = `/images/partenaires/${slug}`;
  const logoExt =
    (
      {
        "galileo-global": "svg",
        "sorbonne-universite": "svg",
        "mbs-education": "jpg",
      } as Record<string, string>
    )[slug] ?? "png";
  return {
    logoUrl: `${base}/logo.${logoExt}`,
    coverUrl: `${base}/cover.webp`,
    galleryUrls: JSON.stringify([
      `${base}/gallery-1.webp`,
      `${base}/gallery-2.webp`,
      `${base}/gallery-3.webp`,
    ]),
  };
}

const PARTNERS: PartnerSeed[] = [
  {
    slug: "pstm",
    nom: "PSTM — Paris School of Technology and Management",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Paris",
    ecusson: "PSTM",
    domaines: ["Management", "Commerce", "Tech", "Marketing"],
    description:
      "Grande école de commerce et de technologie située au cœur de Paris. PSTM propose des cursus professionnalisants du Bachelor (Bac+3) au Mastère (Bac+5), avec un accompagnement dédié aux étudiants internationaux (intégration, recherche d'alternance et de stage, démarches de séjour).",
    pointsForts: [
      "Campus moderne à Paris intra-muros",
      "Titres certifiés RNCP et reconnus par l'État",
      "Dispositif d'accueil pour étudiants internationaux",
      "Forte employabilité & réseau d'entreprises partenaires",
    ],
    imageCouleur: "from-lapis to-lapis-clair",
    siteUrl: "https://pstm.fr/",
    fraisMin: 650000,
    fraisMax: 1200000,
    formation: {
      intitule: "Bachelor Management International",
      niveau: "Licence",
      domaine: "Management",
      duree: "3 ans",
      fraisAgence: 850000,
    },
  },
  {
    slug: "mbn-global",
    nom: "MBN GLOBAL",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Paris",
    ecusson: "MBN",
    domaines: ["Management", "Business", "International"],
    description:
      "Établissement supérieur privé d'excellence à Paris tourné vers le commerce mondial, la finance et le leadership. MBN GLOBAL se distingue par son encadrement bienveillant, facilitant l'arrivée des étudiants francophones et leur insertion professionnelle.",
    pointsForts: [
      "Accompagnement mobilité et aide au logement",
      "Pédagogie active axée sur les projets d'entreprise",
      "Corps professoral expert du marché international",
      "Proximité des pôles économiques parisiens",
    ],
    imageCouleur: "from-lapis-clair to-lapis",
    siteUrl: "https://mbnglobal.fr/",
    fraisMin: 600000,
    fraisMax: 1100000,
    formation: {
      intitule: "Bachelor Business International",
      niveau: "Licence",
      domaine: "Management",
      duree: "3 ans",
      fraisAgence: 780000,
    },
  },
  {
    slug: "ilmis",
    nom: "ILMIS",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Paris",
    ecusson: "ILM",
    domaines: ["Langues", "Management", "Interculturel"],
    description:
      "Institut des Langues et du Management Interculturel et Stratégique (Groupe EMSP). L'institut forme des managers polyvalents capables d'évoluer dans des environnements multiculturels en Afrique, en Europe et à l'international.",
    pointsForts: [
      "Double compétence Management & Langues appliquées",
      "Groupe d'enseignement EMSP réputé",
      "Accompagnement personnalisé pour le visa et l'hébergement",
      "Formations initiales et en alternance",
    ],
    imageCouleur: "from-or to-ambre",
    siteUrl: "https://ilmis.fr/",
    fraisMin: 550000,
    fraisMax: 980000,
    formation: {
      intitule: "Bachelor Management Interculturel",
      niveau: "Licence",
      domaine: "Management",
      duree: "3 ans",
      fraisAgence: 720000,
    },
  },
  {
    slug: "esiia",
    nom: "ESIIA",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Marne-la-Vallée",
    ecusson: "ESI",
    domaines: ["Informatique", "Intelligence artificielle", "Numérique"],
    description:
      "École Supérieure d'Informatique et d'Intelligence Artificielle (campus Paris-Marne-la-Vallée et Lyon). Pôle technologique de premier rang préparant aux métiers d'avenir : développement logiciel, cybersécurité, data science et IA générative.",
    pointsForts: [
      "Spécialisations de pointe en IA, Cloud et Cybersécurité",
      "Opportunités massives de stages et contrats d'alternance",
      "Campus à Marne-la-Vallée à proximité des transports franciliens",
      "Cursus complets du Bac au Bac+5 (Titres RNCP Niveau 7)",
    ],
    imageCouleur: "from-vert to-lapis",
    siteUrl: "https://esiia.fr/",
    fraisMin: 580000,
    fraisMax: 1050000,
    formation: {
      intitule: "Bachelor Informatique & IA",
      niveau: "Licence",
      domaine: "Informatique",
      duree: "3 ans",
      fraisAgence: 800000,
    },
  },
  {
    slug: "ismod",
    nom: "ISMOD Paris",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Paris",
    ecusson: "ISM",
    domaines: ["Management", "Organisation", "Développement"],
    description:
      "Institut supérieur parisien spécialisé dans la gestion stratégique, l'organisation des entreprises et le management de projets innovants. L'école met l'accent sur les compétences opérationnelles et l'entrepreneuriat.",
    pointsForts: [
      "Ancrage au cœur de l'écosystème entrepreneurial parisien",
      "Pédagogie par cas réels et coaching de carrière",
      "Réseau alumni actif facilitant les premiers emplois",
      "Classes à effectifs réduits pour un suivi sur mesure",
    ],
    imageCouleur: "from-ambre to-or",
    siteUrl: "https://ismod-paris.fr/",
    fraisMin: 560000,
    fraisMax: 1000000,
    formation: {
      intitule: "Bachelor Management des Organisations",
      niveau: "Licence",
      domaine: "Management",
      duree: "3 ans",
      fraisAgence: 750000,
    },
  },
  {
    slug: "esmep",
    nom: "ESMEP",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Paris",
    ecusson: "ESP",
    domaines: ["Management", "Commerce", "Entrepreneuriat"],
    description:
      "École supérieure de commerce et de management dédiée aux futurs leaders et créateurs d'entreprises. Les cursus privilégient l'agilité, la négociation commerciale et la gestion de croissance.",
    pointsForts: [
      "Immersion professionnelle rapide en entreprise",
      "Partenariats avec de grands groupes et PME innovantes",
      "Support à l'installation des étudiants internationaux",
      "Programmes Bachelor et Mastère spécialisé",
    ],
    imageCouleur: "from-lapis to-vert",
    siteUrl: "https://esmep.fr/",
    fraisMin: 540000,
    fraisMax: 990000,
    formation: {
      intitule: "Bachelor Commerce & Management",
      niveau: "Licence",
      domaine: "Commerce",
      duree: "3 ans",
      fraisAgence: 700000,
    },
  },
  {
    slug: "emsp",
    nom: "EMSP Business School",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Torcy",
    ecusson: "EMS",
    domaines: ["Management", "Commerce", "Numérique", "Comptabilité"],
    description:
      "Executive Management School of Paris — grand groupe d'enseignement supérieur (campus Torcy, Évry et Lyon). Formations diplômantes d'État et titres RNCP en gestion, finance, comptabilité (DCG/DSCG) et digital business.",
    pointsForts: [
      "Multi-campus modernes (Île-de-France et Lyon)",
      "Excellente passerelle vers l'alternance rémunérée",
      "Accompagnement complet de la pré-inscription au visa",
      "Filières diversifiées et reconnues sur le marché du travail",
    ],
    imageCouleur: "from-lapis-clair to-ardoise",
    siteUrl: "https://www.emsp-bs.fr/",
    fraisMin: 520000,
    fraisMax: 1100000,
    formation: {
      intitule: "Bachelor Management",
      niveau: "Licence",
      domaine: "Management",
      duree: "3 ans",
      fraisAgence: 820000,
    },
  },
  {
    slug: "isd",
    nom: "ISD — Institut Supérieur du Droit",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Paris",
    ecusson: "ISD",
    domaines: ["Droit", "Sciences juridiques"],
    description:
      "Institut privé de référence à Paris consacré à l'enseignement pratique du droit des affaires, du droit international et des carrières juridiques. Dispensé par des juristes, magistrats et avocats en exercice.",
    pointsForts: [
      "Spécialisation juridique de haut niveau",
      "Préparation rigoureuse aux carrières du droit et conformité",
      "Accès privilégié aux cabinets d'avocats parisiens",
      "Cadre d'études stimulant et prestigieux",
    ],
    imageCouleur: "from-or to-lapis",
    siteUrl: "https://institutsuperieurdudroit.fr/",
    fraisMin: 600000,
    fraisMax: 1150000,
    formation: {
      intitule: "Bachelor Droit",
      niveau: "Licence",
      domaine: "Droit",
      duree: "3 ans",
      fraisAgence: 880000,
    },
  },
  {
    slug: "ecole-tourangelle",
    nom: "École Tourangelle Supérieure",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Tours",
    ecusson: "ETS",
    domaines: ["Management", "Commerce", "Tourisme"],
    description:
      "École supérieure implantée à Tours (Val de Loire), offrant un cadre d'études agréable à coût de vie très abordable comparé à la région parisienne. Formations de qualité en commerce, marketing, gestion et tourisme.",
    pointsForts: [
      "Coût de la vie et logements étudiants très accessibles à Tours",
      "À seulement 1h de Paris en TGV",
      "Ambiance de campus conviviale et humaine",
      "Fort taux d'insertion professionnelle régionale",
    ],
    imageCouleur: "from-vert to-or",
    siteUrl: "https://www.ecoletourangellesuperieure.com/",
    fraisMin: 480000,
    fraisMax: 920000,
    formation: {
      intitule: "Bachelor Management",
      niveau: "Licence",
      domaine: "Management",
      duree: "3 ans",
      fraisAgence: 680000,
    },
  },
  {
    slug: "galileo-global",
    nom: "Galileo Global Education",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Paris",
    ecusson: "GGE",
    domaines: ["Business", "Arts", "Digital", "Santé"],
    description:
      "Premier groupe européen d'enseignement supérieur privé indépendant regroupant plus de 60 écoles prestigieuses (Paris School of Business, Cours Florent, Strate, Penninghen, LISAA, etc.) à travers la France et l'Europe.",
    pointsForts: [
      "Réseau mondial de 65+ campus et écoles d'élite",
      "Reconnaissance internationale et diplômes d'État / RNCP",
      "Événements carrières et salons de recrutement exclusifs",
      "Diversité unique de filières (Business, Tech, Art, Design)",
    ],
    imageCouleur: "from-lapis to-or",
    siteUrl: "https://www.ggeedu.com",
    fraisMin: 700000,
    fraisMax: 1500000,
    formation: {
      intitule: "Bachelor Business (réseau Galileo)",
      niveau: "Licence",
      domaine: "Management",
      duree: "3 ans",
      fraisAgence: 950000,
    },
  },
  {
    slug: "mbs-education",
    nom: "MBS Éducation",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Paris",
    ecusson: "MBS",
    domaines: ["Management", "Business School", "International"],
    description:
      "Pôle d'enseignement supérieur business à Paris préparant les étudiants aux postes de direction, d'audit, de marketing digital et de management des ressources humaines avec un rayonnement international.",
    pointsForts: [
      "Marque business school reconnue",
      "Parcours bilingues et vision globale",
      "Service d'aide à l'orientation et à l'embauche",
      "Accompagnement complet pour les formalités de séjour",
    ],
    imageCouleur: "from-ambre to-lapis",
    siteUrl: "https://www.mbs-education.com/",
    fraisMin: 650000,
    fraisMax: 1300000,
    formation: {
      intitule: "Bachelor Business Administration",
      niveau: "Licence",
      domaine: "Management",
      duree: "3 ans",
      fraisAgence: 900000,
    },
  },
];

async function enrichExisting() {
  const existing = await db.universite.findMany({ select: { id: true, slug: true } });
  for (const u of existing) {
    const assets = assetPaths(u.slug);
    const coverUrl = assets.coverUrl;
    const siteUrl =
      u.slug === "sorbonne-universite"
        ? "https://www.sorbonne-universite.fr/"
        : u.slug.includes("montreal")
          ? "https://www.umontreal.ca/"
          : undefined;
    await db.universite.update({
      where: { id: u.id },
      data: {
        ...assets,
        coverUrl,
        ...(siteUrl !== undefined ? { siteUrl } : {}),
      },
    });
  }
}

async function main() {
  console.log("🌱 Seed partenaires privés + assets…");
  await enrichExisting();

  for (const p of PARTNERS) {
    const assets = assetPaths(p.slug);
    await db.universite.upsert({
      where: { slug: p.slug },
      update: {
        nom: p.nom,
        description: p.description,
        siteUrl: p.siteUrl,
        ...assets,
        fraisMin: 110000,
        fraisMax: 110000,
        typeEtablissement: "PRIVE",
        partenaire: true,
      },
      create: {
        slug: p.slug,
        nom: p.nom,
        pays: p.pays,
        drapeau: p.drapeau,
        ville: p.ville,
        ecusson: p.ecusson,
        domaines: JSON.stringify(p.domaines),
        description: p.description,
        pointsForts: JSON.stringify(p.pointsForts),
        imageCouleur: p.imageCouleur,
        siteUrl: p.siteUrl,
        ...assets,
        fraisMin: 110000,
        fraisMax: 110000,
        typeEtablissement: "PRIVE",
        partenaire: true,
      },
    });

    // Les formations sont synchronisées par prisma/seed-catalogue-formations.ts
    // (liste unifiée PSTM + Galileo) — ne plus créer d'intitulés « historiques » ici.
  }

  // Update stats partner count
  const count = await db.universite.count({ where: { partenaire: true } });
  await db.statistique.upsert({
    where: { id: 2 },
    update: { valeur: String(count), libelle: "Établissements partenaires" },
    create: { id: 2, valeur: String(count), libelle: "Établissements partenaires", ordre: 2 },
  });

  console.log(`✓ ${PARTNERS.length} partenaires + assets enrichis (total partenaires: ${count})`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
