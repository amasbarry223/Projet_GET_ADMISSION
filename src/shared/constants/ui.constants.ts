/** Délais et dimensions UI. */
export const DOSSIER_WIZARD_STEP_COUNT = 6;
export const DOSSIER_AUTOSAVE_DEBOUNCE_MS = 1200;
export const DOSSIER_SAVED_BADGE_VISIBLE_MS = 2000;

export const TOAST_AUTO_DISMISS_DELAY_MS = 4000;

/** Index d’étape wizard (1-based). */
export const DOSSIER_WIZARD_STEPS = {
  UNIVERSITE: 1,
  INFORMATIONS: 2,
  PROFIL_ACADEMIQUE: 3,
  DOCUMENTS: 4,
  IDENTITE: 5,
  RECAP: 6,
} as const;
