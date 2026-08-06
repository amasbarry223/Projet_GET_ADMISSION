/**
 * Montants de scolarité annuelle (€) trouvés / dérivés des sites officiels.
 * Utilisé par seed-catalogue-formations — n'écrit le champ que si une valeur est connue.
 * Les frais d'agence (FCFA) restent gérés séparément via resolveFraisAgence.
 */

export type CycleTarif = "bts" | "bachelor" | "master" | "licence" | "autre";

export function cycleFromIntitule(intitule: string): CycleTarif {
  const i = intitule.trim().toLowerCase();
  if (i.startsWith("bts")) return "bts";
  if (i.startsWith("bachelor")) return "bachelor";
  if (i.startsWith("master")) return "master";
  if (i === "autre à préciser") return "autre";
  // Intitulés Galileo (domaines) → cycle licence
  return "licence";
}

type Grille = Partial<Record<CycleTarif, number>>;

/**
 * Grilles annuelles (€) par slug — sources documentées sous chaque entrée.
 * null / cycle absent → ne pas écrire fraisFormationEuros.
 */
const GRILLES: Record<string, { grille: Grille; source: string }> = {
  // https://pstm.fr/frais-de-scolarite — formation initiale
  pstm: {
    source: "https://pstm.fr/frais-de-scolarite",
    grille: { bts: 4300, bachelor: 5300, master: 6300 },
  },
  // https://esiia.fr/tarifs-et-financements/ — scolarité initiale (hors frais d'inscription 1000 €)
  esiia: {
    source: "https://esiia.fr/tarifs-et-financements/",
    grille: {
      bts: 6490,
      bachelor: 6990,
      master: 9000,
      licence: 6990,
    },
  },
  // https://esmep.fr/tarifs-des-formations-a-distance/ — total annuel (inscription + scolarité)
  esmep: {
    source: "https://esmep.fr/tarifs-des-formations-a-distance/",
    grille: {
      bts: 4245,
      bachelor: 4495,
      master: 5500,
      licence: 4495,
    },
  },
  // https://ilmis.fr/tarifs-et-financements/ — scolarité initiale
  ilmis: {
    source: "https://ilmis.fr/tarifs-et-financements/",
    grille: {
      bts: 6490,
      bachelor: 6990,
      master: 9000,
      licence: 6990,
    },
  },
  // https://www.emsp-bs.fr/tarifs-des-formations-a-distance/ — total annuel à distance
  emsp: {
    source: "https://www.emsp-bs.fr/tarifs-des-formations-a-distance/",
    grille: {
      bts: 4245,
      bachelor: 4495,
      master: 5500,
      licence: 4495,
    },
  },
  // https://ismod-paris.fr/tarifs-et-financements/ — formation initiale
  ismod: {
    source: "https://ismod-paris.fr/tarifs-et-financements/",
    grille: {
      bts: 6490,
      bachelor: 6490,
      master: 7990,
      licence: 6490,
    },
  },
  // https://institutsuperieurdudroit.fr/cgv — 2026-2027
  isd: {
    source: "https://institutsuperieurdudroit.fr/cgv",
    grille: {
      bts: 4500,
      bachelor: 4500,
      master: 4500,
      licence: 4500,
      autre: 4500,
    },
  },
  // https://lexpress-education.com/articles/prix-mbs/ — Bachelor ~11k, PGE ~16k / an
  "mbs-education": {
    source: "https://www.mbs-education.com/",
    grille: {
      bts: 9990,
      bachelor: 11000,
      master: 16000,
      licence: 11000,
    },
  },
  // Fourchettes réseau Galileo (studialisedu / guides groupe) — valeurs médianes indicatives
  "galileo-global": {
    source: "https://www.studialisedu.net/fr/actualites/avantages/un-guide-de-lenseignement-superieur-prive-avec-galileo-global-education",
    grille: {
      bts: 9000,
      bachelor: 9000,
      licence: 9000,
      master: 14500,
      autre: 9000,
    },
  },
  // Droits différenciés extra-UE (réf. nationale) — audience GET Admission
  // https://www.sorbonne-universite.fr/formation-et-vie-etudiante/candidater-et-sinscrire/modalites-dinscription-et-couts-des-etudes
  "sorbonne-universite": {
    source: "https://www.sorbonne-universite.fr/formation-et-vie-etudiante/candidater-et-sinscrire/modalites-dinscription-et-couts-des-etudes",
    grille: {
      bts: 2902,
      bachelor: 2902,
      licence: 2902,
      master: 3950,
      autre: 2902,
    },
  },
  "universite-nantes": {
    source: "https://www.enseignementsup-recherche.gouv.fr/ (droits différenciés nationaux)",
    grille: {
      bts: 2902,
      bachelor: 2902,
      licence: 2902,
      master: 3950,
      autre: 2902,
    },
  },
  // UHasselt non-EEE — cat. 2 ≈ 6 630 € / 60 ECTS (2026-27)
  // https://www.uhasselt.be/en/study/application-and-admission/tuition-fees
  "universite-hasselt": {
    source: "https://www.uhasselt.be/en/study/application-and-admission/tuition-fees",
    grille: {
      bts: 3900,
      bachelor: 3900,
      licence: 3900,
      master: 6630,
      autre: 3900,
    },
  },
  // UdeM — estimation annuelle temps plein convertie CAD→EUR (~0,67) hors bourse d'exemption
  // https://registraire.umontreal.ca/droits-de-scolarite/couts-des-etudes/
  "universite-de-montreal": {
    source: "https://registraire.umontreal.ca/droits-de-scolarite/couts-des-etudes/",
    grille: {
      bts: 10300,
      bachelor: 10300,
      licence: 10300,
      master: 14000,
      autre: 10300,
    },
  },
};

/** Retourne le montant € annuel si une source existe pour ce couple, sinon null. */
export function lookupFraisFormationEuros(
  universiteSlug: string,
  intitule: string,
): number | null {
  const entry = GRILLES[universiteSlug];
  if (!entry) return null;
  const cycle = cycleFromIntitule(intitule);
  const euros = entry.grille[cycle];
  return typeof euros === "number" && euros > 0 ? euros : null;
}
