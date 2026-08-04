import { z } from "zod";
import {
  ADDRESS_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  MAX_DIPLOMES_OBTENUS,
  MAX_INTERRUPTIONS,
  MAX_REDOUBLEMENTS,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PHONE_MAX_LENGTH,
  TRIMESTRES_MAX,
  TRIMESTRES_MIN,
} from "@/shared/constants";

// --- Auth ---
export const registerSchema = z.object({
  prenom: z.string().min(1, "Le prénom est requis").max(NAME_MAX_LENGTH),
  nom: z.string().min(1, "Le nom est requis").max(NAME_MAX_LENGTH),
  email: z.string().email("L'e-mail saisi n'est pas valide").max(EMAIL_MAX_LENGTH),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`),
  nationalite: z.string().min(1, "La nationalité est requise").max(NAME_MAX_LENGTH),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const otpVerifySchema = z.object({
  accessToken: z.string().min(1, "Token manquant"),
  mode: z.enum(["register", "login"]).default("register"),
  prenom: z.string().min(1).max(NAME_MAX_LENGTH).optional(),
  nom: z.string().min(1).max(NAME_MAX_LENGTH).optional(),
  nationalite: z.string().max(NAME_MAX_LENGTH).optional(),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const otpRequestLoginSchema = z.object({
  email: z.string().email("L'e-mail saisi n'est pas valide").max(EMAIL_MAX_LENGTH),
});
export type OtpRequestLoginInput = z.infer<typeof otpRequestLoginSchema>;

// --- Dossiers ---
export const workflowSchema = z.object({
  action: z.enum([
    "verifier",
    "demarrer_verification",
    "valider_dossier",
    "correction",
    "verifier_corrections",
    "confirmer_paiement",
    "transmettre",
    "attendre_reponse",
    "accepter",
    "refuser",
    "emettre_attestation",
    "cloturer",
  ]),
  note: z.string().max(1000).optional(),
});
export type WorkflowInput = z.infer<typeof workflowSchema>;

// --- Messages ---
export const messageSchema = z.object({
  dossierId: z.string().min(1),
  texte: z.string().min(1, "Le message ne peut pas être vide").max(5000, "Le message est trop long"),
  pieceJointeNom: z.string().max(255).optional(),
  pieceJointeTaille: z.string().max(50).optional(),
});
export type MessageInput = z.infer<typeof messageSchema>;

// --- Paiements ---
export const paiementSchema = z.object({
  dossierId: z.string().min(1),
  montant: z.number().int().positive().max(10_000_000, "Montant invalide"),
  moyen: z.string().min(1),
  tranche: z.string().max(100).optional(),
});
export type PaiementInput = z.infer<typeof paiementSchema>;

// --- Profile ---
export const profileSchema = z.object({
  prenom: z.string().min(1).max(NAME_MAX_LENGTH).optional(),
  nom: z.string().min(1).max(NAME_MAX_LENGTH).optional(),
  telephone: z.string().max(PHONE_MAX_LENGTH).optional(),
  nationalite: z.string().max(NAME_MAX_LENGTH).optional(),
  dateNaissance: z.string().max(20).optional(),
  adresse: z.string().max(ADDRESS_MAX_LENGTH).optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

const interruptionTypeEnum = z.enum([
  "stage",
  "emploi",
  "formation",
  "volontariat",
  "lettre",
  "autre",
]);

export const profilAcademiqueSchema = z.object({
  statutCandidat: z.enum(["LYCEEN", "BACHELIER"]),
  classeActuelle: z.string().max(NAME_MAX_LENGTH).optional().nullable(),
  aObtenuBac: z.boolean().optional(),
  trimestresSeconde: z.number().int().min(TRIMESTRES_MIN).max(TRIMESTRES_MAX).optional(),
  trimestresPremiere: z.number().int().min(TRIMESTRES_MIN).max(TRIMESTRES_MAX).optional(),
  trimestresTerminale: z.number().int().min(TRIMESTRES_MIN).max(TRIMESTRES_MAX).optional(),
  attestationScolariteDisponible: z.boolean().optional(),
  niveauEtudesSuperieures: z
    .enum(["AUCUN", "L1", "L2", "L3", "DUT_BTS", "MASTER_PLUS"])
    .optional(),
  formationEnCours: z.boolean().optional(),
  diplomesObtenus: z.array(z.string().min(1).max(80)).max(MAX_DIPLOMES_OBTENUS).optional(),
  redoublements: z
    .array(
      z.object({
        niveau: z.string().min(1).max(40),
        anneeScolaire: z.string().min(1).max(20),
      })
    )
    .max(MAX_REDOUBLEMENTS)
    .optional(),
  interruptions: z
    .array(
      z.object({
        type: interruptionTypeEnum,
        anneeDebut: z.string().min(1).max(20),
        anneeFin: z.string().min(1).max(20),
        libelle: z.string().max(120).optional(),
      })
    )
    .max(MAX_INTERRUPTIONS)
    .optional(),
});
export type ProfilAcademiqueInputZod = z.infer<typeof profilAcademiqueSchema>;

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Le nouveau mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`)
    .max(PASSWORD_MAX_LENGTH),
});
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

/** Validation étape « Informations personnelles » du wizard dossier (client). */
export const wizardPersonalInfoSchema = z.object({
  prenom: z.string().min(1, "Le prénom est requis").max(NAME_MAX_LENGTH),
  nom: z.string().min(1, "Le nom est requis").max(NAME_MAX_LENGTH),
  email: z.string().min(1, "L'e-mail est requis").email("L'e-mail saisi n'est pas valide").max(EMAIL_MAX_LENGTH),
  tel: z.string().min(1, "Le téléphone est requis").max(PHONE_MAX_LENGTH),
  nationalite: z.string().min(1, "La nationalité est requise").max(NAME_MAX_LENGTH),
  naissance: z.string().max(20).optional().or(z.literal("")),
  adresse: z.string().max(ADDRESS_MAX_LENGTH).optional().or(z.literal("")),
});
export type WizardPersonalInfoInput = z.infer<typeof wizardPersonalInfoSchema>;

// --- Create dossier ---
export const dossierCreateSchema = z.object({
  universiteId: z.string().min(1, "L'université est requise"),
  formationId: z.string().min(1, "La formation est requise"),
});
export type DossierCreateInput = z.infer<typeof dossierCreateSchema>;

// --- Update dossier ---
export const dossierUpdateSchema = z.object({
  etapeActuelle: z.number().int().min(1).max(12).optional(),
  /** soumettre: BROUILLON→SOUMIS ; resoumettre: CORRECTION→VERIFICATION */
  action: z.enum(["soumettre", "resoumettre"]).optional(),
  info: z.object({
    prenom: z.string().max(NAME_MAX_LENGTH).optional(),
    nom: z.string().max(NAME_MAX_LENGTH).optional(),
    telephone: z.string().max(PHONE_MAX_LENGTH).optional(),
    nationalite: z.string().max(NAME_MAX_LENGTH).optional(),
    dateNaissance: z.string().max(20).optional(),
    adresse: z.string().max(ADDRESS_MAX_LENGTH).optional(),
  }).optional(),
  pieces: z.array(z.object({
    libelle: z.string().min(1).max(255),
    statut: z.enum(["manquante", "televersee", "a_corriger", "validee"]),
  })).optional(),
});
export type DossierUpdateInput = z.infer<typeof dossierUpdateSchema>;

// --- Piece upload/toggle ---
export const pieceSchema = z.object({
  libelle: z.string().min(1, "Le libellé est requis").max(255),
  statut: z.enum(["manquante", "televersee", "a_corriger", "validee"]),
  type: z.enum(["pdf", "image", "autre"]).optional(),
  nomFichier: z.string().max(255).optional(),
  taille: z.string().max(50).optional(),
});
export type PieceInput = z.infer<typeof pieceSchema>;

// --- Universite create/update ---
export const universiteSchema = z.object({
  nom: z.string().min(1, "Le nom est requis").max(150),
  pays: z.string().min(1).max(100),
  drapeau: z.string().max(20).default(""),
  ville: z.string().min(1).max(100),
  ecusson: z.string().max(500).default(""),
  domaines: z.array(z.string().max(100)).default([]),
  description: z.string().max(2000).default(""),
  pointsForts: z.array(z.string().max(200)).default([]),
  imageCouleur: z.string().max(500).default(""),
  siteUrl: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  coverUrl: z.string().max(500).optional().nullable(),
  galleryUrls: z.union([z.array(z.string().max(500)), z.string().max(2000)]).optional(),
  typeEtablissement: z.enum(["PUBLIC", "PRIVE"]).optional(),
  fraisMin: z.number().int().min(0).default(0),
  fraisMax: z.number().int().min(0).default(0),
  partenaire: z.boolean().optional(),
});
export type UniversiteInput = z.infer<typeof universiteSchema>;

// --- Formation create/update ---
export const formationSchema = z.object({
  universiteId: z.string().min(1).optional(),
  intitule: z.string().min(1, "L'intitulé est requis").max(200),
  niveau: z.enum(["Licence", "Master", "Doctorat"]),
  domaine: z.string().min(1).max(100),
  duree: z.string().min(1).max(50),
  fraisAgence: z.number().int().min(0).optional(),
  prerequis: z.array(z.string().max(200)).default([]),
  piecesRequises: z.array(z.string().max(200)).default([]),
});
export type FormationInput = z.infer<typeof formationSchema>;

// --- Admin user invite ---
export const adminUserCreateSchema = z
  .object({
    prenom: z.string().min(1, "Le prénom est requis").max(50),
    nom: z.string().min(1, "Le nom est requis").max(50),
    email: z.string().email("L'e-mail saisi n'est pas valide"),
    role: z.enum(["CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"]),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`)
      .max(PASSWORD_MAX_LENGTH),
    confirmPassword: z.string().min(1, "Confirmez le mot de passe"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;

export const adminUserUpdateSchema = z
  .object({
    prenom: z.string().min(1).max(50).optional(),
    nom: z.string().min(1).max(50).optional(),
    email: z.string().email("L'e-mail saisi n'est pas valide").optional(),
    actif: z.boolean().optional(),
    role: z.enum(["CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"]).optional(),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`)
      .max(PASSWORD_MAX_LENGTH)
      .optional()
      .or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      const pwd = data.password ?? "";
      const confirm = data.confirmPassword ?? "";
      if (!pwd && !confirm) return true;
      return pwd === confirm;
    },
    {
      message: "Les mots de passe ne correspondent pas",
      path: ["confirmPassword"],
    },
  )
  .refine(
    (data) => {
      const pwd = data.password ?? "";
      const confirm = data.confirmPassword ?? "";
      // Si un des deux est rempli, le mot de passe doit être valide
      if (!pwd && !confirm) return true;
      return pwd.length >= PASSWORD_MIN_LENGTH;
    },
    {
      message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`,
      path: ["password"],
    },
  );
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;

// --- Contact form ---
export const contactSchema = z.object({
  prenom: z.string().min(1, "Le prénom est requis").max(50),
  nom: z.string().min(1, "Le nom est requis").max(50),
  email: z.string().email("L'e-mail saisi n'est pas valide"),
  telephone: z.string().max(30).optional(),
  objet: z.string().min(1, "L'objet est requis").max(200),
  message: z.string().min(1, "Le message est requis").max(5000, "Le message est trop long"),
});
export type ContactInput = z.infer<typeof contactSchema>;

// --- Mark messages read ---
export const markReadSchema = z.object({
  dossierId: z.string().min(1, "dossierId requis"),
});
export type MarkReadInput = z.infer<typeof markReadSchema>;

// --- Manual transaction (staff) ---
export const manualTransactionSchema = z.object({
  dossierId: z.string().min(1),
  montant: z.number().int().positive().max(10_000_000, "Montant invalide"),
  moyen: z.string().min(1).max(50),
  tranche: z.string().max(100).optional(),
});
export type ManualTransactionInput = z.infer<typeof manualTransactionSchema>;

// --- Parametres ---
export const parametresSchema = z.object({
  fraisMin: z.number().int().min(0).max(10_000_000).optional(),
  fraisMax: z.number().int().min(0).max(10_000_000).optional(),
  fraisAgencePublic: z.number().int().min(0).max(10_000_000).optional(),
  fraisAgencePrive: z.number().int().min(0).max(10_000_000).optional(),
  paiementTranches: z.boolean().optional(),
  notifEmail: z.boolean().optional(),
  notifInApp: z.boolean().optional(),
  workflowStrict: z.boolean().optional(),
  exigerEmailVerifie: z.boolean().optional(),
  mentionsLegales: z.string().max(50000).optional(),
  politiqueConfidentialite: z.string().max(50000).optional(),
});
export type ParametresInput = z.infer<typeof parametresSchema>;

// --- Helper : valider et retourner une réponse d'erreur standardisée ---
export function validate<T>(schema: z.ZodSchema<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Données invalides" };
  }
  return { success: true, data: result.data };
}
