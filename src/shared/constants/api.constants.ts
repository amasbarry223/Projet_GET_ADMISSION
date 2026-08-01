/** Chemins API métier (côté client et handlers). */
export const API_ROUTES = {
  AUTH_SEND_VERIFICATION_OTP: "/api/auth/send-verification-otp",
  AUTH_VERIFY_OTP: "/api/auth/verify-otp",
  AUTH_REQUEST_OTP_LOGIN: "/api/auth/request-otp-login",
  AUTH_CALLBACK_CREDENTIALS: "/api/auth/callback/credentials",
  REGISTER: "/api/register",
  PROFILE: "/api/profile",
  PROFILE_ACADEMIQUE: "/api/profile/academique",
  DOSSIERS: "/api/dossiers",
  UNIVERSITES: "/api/universites",
} as const;

/** Codes d'erreur métier stables (API + UI). */
export const API_ERROR_CODES = {
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  RATE_LIMIT: "RATE_LIMIT",
  PROFIL_ACADEMIQUE_REQUIS: "PROFIL_ACADEMIQUE_REQUIS",
  ALREADY_REGISTERED: "ALREADY_REGISTERED",
  ALREADY_VERIFIED: "ALREADY_VERIFIED",
  CONFIG: "CONFIG",
  MAIL_FAILED: "MAIL_FAILED",
  NO_OTP: "NO_OTP",
  GENERATE_LINK: "GENERATE_LINK",
  PROVISION: "PROVISION",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
