/** Configuration générale de l'application. */
export const APP_NAME = "GET Admission";

/** Durée de session NextAuth (24 heures). */
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

/** Revalidation JWT rôle/actif depuis la DB (au plus toutes les 30 s). */
export const JWT_REVALIDATE_INTERVAL_MS = 30 * 1000;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 50,
} as const;
