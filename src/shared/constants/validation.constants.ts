/** Règles de validation partagées (Zod + UI). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const NAME_MAX_LENGTH = 50;
export const EMAIL_MAX_LENGTH = 255;
export const ADDRESS_MAX_LENGTH = 200;
export const PHONE_MAX_LENGTH = 30;

export const OTP_CODE_MIN_LENGTH = 6;
export const OTP_CODE_MAX_LENGTH = 8;

export const TRIMESTRES_MIN = 2;
export const TRIMESTRES_MAX = 3;
export const TRIMESTRES_DEFAULT_SECONDE = 3;
export const TRIMESTRES_DEFAULT_PREMIERE = 3;
export const TRIMESTRES_DEFAULT_TERMINALE = 2;

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo
export const MAX_DIPLOMES_OBTENUS = 20;
export const MAX_REDOUBLEMENTS = 20;
export const MAX_INTERRUPTIONS = 20;
