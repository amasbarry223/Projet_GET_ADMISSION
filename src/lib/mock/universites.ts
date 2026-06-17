export type Niveau = "Licence" | "Master" | "Doctorat";

export type Formation = {
  id: string;
  universiteId: string;
  intitule: string;
  niveau: Niveau;
  domaine: string;
  duree: string; // ex. "2 ans"
  fraisAgence: number; // FCFA
  prerequis: string[];
  piecesRequises: string[];
};

export type Universite = {
  id: string;
  slug: string;
  nom: string;
  pays: string;
  drapeau: string; // emoji
  ville: string;
  ecusson: string; // abbréviation mono, ex. "SU"
  domaines: string[];
  description: string;
  pointsForts: string[];
  imageCouleur: string; // gradient tailwind classes for placeholder
  fraisMin: number;
  fraisMax: number;
  partenaires: boolean;
};

export const UNIVERSITES: Universite[] = [
  {
    id: "u-sorbonne",
    slug: "sorbonne-universite",
    nom: "Sorbonne Université",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Paris",
    ecusson: "SU",
    domaines: ["Droit", "Sciences", "Lettres", "Médecine"],
    description:
      "Issue de la fusion de Paris-IV et Paris-VI, la Sorbonne Université est l'une des plus prestigieuses universités françaises. Elle accueille chaque année des étudiants internationaux dans ses cursus de droit, sciences et lettres.",
    pointsForts: [
      "Réseau d'échanges avec 48 pays",
      "Bibliothèque de 4 millions d'ouvrages",
      "Laboratoires de recherche de renommée mondiale",
      "Accompagnement dédié aux étudiants internationaux",
    ],
    imageCouleur: "from-lapis to-lapis-clair",
    fraisMin: 750000,
    fraisMax: 1450000,
    partenaires: true,
  },
  {
    id: "u-umontreal",
    slug: "universite-de-montreal",
    nom: "Université de Montréal",
    pays: "Canada",
    drapeau: "🇨🇦",
    ville: "Montréal",
    ecusson: "UM",
    domaines: ["Informatique", "Sciences", "Management", "Santé"],
    description:
      "Avec sa filiale affiliée HEC Montréal, l'UdeM figure parmi les grandes universités francophones d'Amérique du Nord. Reconnue pour ses programmes en IA et en sciences de la santé.",
    pointsForts: [
      "Pôle d'intelligence artificielle (MILA)",
      "Programmes en français et en anglais",
      "Bourses d'excellence pour étudiants africains",
      "Ville étudiante abordable et sûre",
    ],
    imageCouleur: "from-ardoise to-lapis",
    fraisMin: 950000,
    fraisMax: 1850000,
    partenaires: true,
  },
  {
    id: "u-uhasselt",
    slug: "universite-hasselt",
    nom: "Université de Hasselt",
    pays: "Belgique",
    drapeau: "🇧🇪",
    ville: "Hasselt",
    ecusson: "UH",
    domaines: ["Sciences", "Économie", "Transport", "Droit"],
    description:
      "Université jeune et innovante en Flandre, Hasselt mise sur l'interdisciplinarité et l'encadrement personnalisé. Taille humaine, forte employabilité.",
    pointsForts: [
      "Encadrement par petits groupes",
      "Programmes bilingues néerlandais/anglais",
      "Vie étudiante accessible",
      "Filière transport & logistique reconnue",
    ],
    imageCouleur: "from-or to-ambre",
    fraisMin: 680000,
    fraisMax: 1150000,
    partenaires: true,
  },
  {
    id: "u-um5",
    slug: "universite-mohammed-v-rabat",
    nom: "Université Mohammed V de Rabat",
    pays: "Maroc",
    drapeau: "🇲🇦",
    ville: "Rabat",
    ecusson: "UM5",
    domaines: ["Droit", "Sciences politiques", "Économie", "Lettres"],
    description:
      "Plus ancienne université marocaine moderne, Mohammed V accueille une communauté étudiante internationale et propose des cursus en droit et sciences politiques très cotés.",
    pointsForts: [
      "Excellence en droit public comparé",
      "Coûts d'études accessibles",
      "Pont culturel Afrique-Europe",
      "Programmes d'échange ERASMUS+",
    ],
    imageCouleur: "from-vert to-lapis",
    fraisMin: 420000,
    fraisMax: 880000,
    partenaires: true,
  },
  {
    id: "u-uct",
    slug: "universite-cape-town",
    nom: "Université du Cap",
    pays: "Afrique du Sud",
    drapeau: "🇿🇦",
    ville: "Le Cap",
    ecusson: "UCT",
    domaines: ["Sciences", "Commerce", "Ingénierie", "Santé"],
    description:
      "Première université d'Afrique au classement QS, UCT combine excellence académique et cadre naturel exceptionnel. Forte communauté africaine francophone.",
    pointsForts: [
      "Top 200 mondial (QS)",
      "Campus remarquable au pied de Table Mountain",
      "Bourses pour étudiants africains",
      "Programmes en commerce et ingénierie",
    ],
    imageCouleur: "from-lapis-clair to-vert",
    fraisMin: 880000,
    fraisMax: 1620000,
    partenaires: true,
  },
  {
    id: "u-ugb",
    slug: "universite-gaston-berger",
    nom: "Université Gaston Berger",
    pays: "Sénégal",
    drapeau: "🇸🇳",
    ville: "Saint-Louis",
    ecusson: "UGB",
    domaines: ["Sciences", "Économie", "Lettres", "Droit"],
    description:
      "Université sénégalaise de référence, UGB propose un cadre moderne et un encadrement de proximité. Hub régional pour les étudiants d'Afrique de l'Ouest.",
    pointsForts: [
      "Cadre moderne à Saint-Louis",
      "Filières francophones régionales",
      "Frais d'agence réduits",
      "Réseau ouest-africain actif",
    ],
    imageCouleur: "from-ambre to-or",
    fraisMin: 350000,
    fraisMax: 620000,
    partenaires: true,
  },
  {
    id: "u-tunis",
    slug: "universite-tunis-el-manar",
    nom: "Université de Tunis El Manar",
    pays: "Tunisie",
    drapeau: "🇹🇳",
    ville: "Tunis",
    ecusson: "UTM",
    domaines: ["Médecine", "Sciences", "Économie", "Ingénierie"],
    description:
      "Grande université tunisienne reconnue pour sa faculté de médecine et ses écoles d'ingénieurs. Coûts accessibles et proximité culturelle.",
    pointsForts: [
      "Faculté de médecine réputée",
      "Coûts d'études modérés",
      "Proximité culturelle Maghreb-Afrique de l'Ouest",
      "Programmes ERASMUS+",
    ],
    imageCouleur: "from-carmin to-ambre",
    fraisMin: 380000,
    fraisMax: 720000,
    partenaires: true,
  },
  {
    id: "u-nantes",
    slug: "universite-nantes",
    nom: "Université de Nantes",
    pays: "France",
    drapeau: "🇫🇷",
    ville: "Nantes",
    ecusson: "UN",
    domaines: ["Sciences", "Droit", "Lettres", "STAPS"],
    description:
      "Université pluridisciplinaire de l'Ouest français, Nantes accueille une forte communauté étudiante internationale avec un accompagnement structuré.",
    pointsForts: [
      "Maison des étudiants internationaux",
      "Bourses EIFFEL et régionales",
      "Programmes en sciences sociales et STAPS",
      "Ville étudiante très attractive",
    ],
    imageCouleur: "from-lapis to-vert",
    fraisMin: 620000,
    fraisMax: 1180000,
    partenaires: true,
  },
  {
    id: "u-lau",
    slug: "universite-libanaise-americaine",
    nom: "Université Libano-Américaine",
    pays: "Liban",
    drapeau: "🇱🇧",
    ville: "Beyrouth",
    ecusson: "LAU",
    domaines: ["Management", "Ingénierie", "Architecture", "Santé"],
    description:
      "Université anglophone de référence au Liban, LAU propose des cursus accrédités aux États-Unis. Hub régional pour le Moyen-Orient et la Méditerranée.",
    pointsForts: [
      "Accréditations américaines",
      "Réseau d'alumni mondial",
      "Programmes en management et architecture",
      "Bourses d'excellence",
    ],
    imageCouleur: "from-ardoise to-or",
    fraisMin: 980000,
    fraisMax: 1750000,
    partenaires: true,
  },
  {
    id: "u-yaounde",
    slug: "universite-yaounde-i",
    nom: "Université de Yaoundé I",
    pays: "Cameroun",
    drapeau: "🇨🇲",
    ville: "Yaoundé",
    ecusson: "UY1",
    domaines: ["Sciences", "Droit", "Médecine", "Lettres"],
    description:
      "Plus ancienne université camerounaise, Yaoundé I forme une grande partie de l'élite francophone d'Afrique centrale. Filière scientifique reconnue.",
    pointsForts: [
      "Filière scientifique reconnue en Afrique centrale",
      "Frais d'agence très accessibles",
      "Réseau d'alumni influent",
      "Échanges régionaux CEMAC",
    ],
    imageCouleur: "from-vert to-ambre",
    fraisMin: 280000,
    fraisMax: 540000,
    partenaires: true,
  },
];

export function universiteParSlug(slug: string): Universite | undefined {
  return UNIVERSITES.find((u) => u.slug === slug);
}

export const PAYS_LIST = Array.from(new Set(UNIVERSITES.map((u) => u.pays))).sort();
export const DOMAINES_LIST = Array.from(new Set(UNIVERSITES.flatMap((u) => u.domaines))).sort();
export const NIVEAUX_LIST: Niveau[] = ["Licence", "Master", "Doctorat"];
