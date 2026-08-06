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
      "École de commerce internationale à Paris, programmes jusqu'au Bac+5 en management, tech et commerce.",
    pointsForts: ["Campus parisien", "Programmes Bac à Bac+5", "Orientation internationale"],
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
    description: "École privée tournée vers le business international et l'accompagnement des étudiants étrangers.",
    pointsForts: ["Accompagnement mobilité", "Réseau entreprises", "Parcours professionnalisants"],
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
      "Institut des Langues et du Management Interculturel et Stratégique — école du groupe EMSP.",
    pointsForts: ["Langues & interculturel", "Groupe EMSP", "Formations initiales et continues"],
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
      "École Supérieure d'Informatique et d'Intelligence Artificielle — campus Paris-Marne-la-Vallée et Lyon.",
    pointsForts: ["IA & numérique", "Alternance possible", "Bac à Bac+5"],
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
    description: "Institut supérieur parisien dédié aux formations en management et organisation.",
    pointsForts: ["Ancrage parisien", "Pédagogie opérationnelle", "Réseau alumni"],
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
    description: "École supérieure privée axée sur le management, le commerce et l'entrepreneuriat.",
    pointsForts: ["Proximité entreprises", "Projets concrets", "Accompagnement international"],
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
      "Executive Management School of Paris — formations Bac à Bac+5 (présentiel et distance). Campus Torcy, Évry et Lyon. Inclut les filières du groupe (ILMIS, ESIIA, DCG).",
    pointsForts: ["Multi-campus IDF & Lyon", "Alternance", "Diplômes RNCP / État"],
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
    description: "Institut supérieur dédié aux formations juridiques et au droit applicable.",
    pointsForts: ["Spécialisation droit", "Encadrement expert", "Préparation aux métiers du droit"],
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
    description: "École supérieure basée à Tours, formations professionnalisantes en management et commerce.",
    pointsForts: ["Ancrage Touraine", "Pédagogie pratique", "Vie étudiante"],
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
      "Premier groupe européen d'enseignement supérieur privé indépendant — réseau de campus et d'écoles (ggeedu.com).",
    pointsForts: ["Réseau international", "65+ écoles", "Multi-secteurs"],
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
    description: "Groupe d'enseignement supérieur et de formation business (mbs-education.com).",
    pointsForts: ["Marque business school", "Parcours internationaux", "Orientation carrière"],
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
