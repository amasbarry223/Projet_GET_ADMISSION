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
  prenom: z
    .string()
    .trim()
    .min(1, "Le prénom est requis")
    .max(NAME_MAX_LENGTH)
    .regex(/^[\p{L}][\p{L}\s'.-]*$/u, "Le prénom contient des caractères non autorisés"),
  nom: z
    .string()
    .trim()
    .min(1, "Le nom est requis")
    .max(NAME_MAX_LENGTH)
    .regex(/^[\p{L}][\p{L}\s'.-]*$/u, "Le nom contient des caractères non autorisés"),
  email: z.string().trim().email("L'e-mail saisi n'est pas valide").max(EMAIL_MAX_LENGTH),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`)
    .max(PASSWORD_MAX_LENGTH, `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères`),
  nationalite: z.string().trim().min(1, "La nationalité est requise").max(NAME_MAX_LENGTH),
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
export const workflowSchema = z
  .object({
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
      "cloturer",
    ]),
    note: z.string().max(1000).optional(),
  })
  .refine((data) => data.action !== "correction" || !!data.note?.trim(), {
    message: "Le motif de la demande de correction est obligatoire",
    path: ["note"],
  });
export type WorkflowInput = z.infer<typeof workflowSchema>;

// --- Messages ---
export const messageSchema = z.object({
  dossierId: z.string().min(1),
  // Optionnel : un message peut ne contenir qu'une pièce jointe, sans texte.
  texte: z.string().max(5000, "Le message est trop long").optional().default(""),
});
export type MessageInput = z.infer<typeof messageSchema>;

// --- Messagerie interne (Financier/Conseiller <-> Direction) ---
export const messageInterneSchema = z.object({
  texte: z.string().max(5000, "Le message est trop long").optional().default(""),
  // Requis pour Admin/Super Admin répondant à un financier donné ; ignoré pour un Financier (son fil est implicite).
  financierId: z.string().min(1).optional(),
});
export type MessageInterneInput = z.infer<typeof messageInterneSchema>;

// --- Paiements ---
export const paiementSchema = z.object({
  dossierId: z.string().min(1),
  montant: z.number().int().positive().max(10_000_000, "Montant invalide"),
  moyen: z.string().min(1),
  tranche: z.string().max(100).optional(),
});
export type PaiementInput = z.infer<typeof paiementSchema>;

// --- Demandes CROUS (partage — SUPER_ADMIN uniquement) ---
export const crousCreateSchema = z.object({
  dossierId: z.string().min(1),
});
export type CrousCreateInput = z.infer<typeof crousCreateSchema>;

export const crousPartageInclureSchema = z.object({
  infosCandidat: z.boolean().default(false),
  kyc: z.boolean().default(false),
  visa: z.boolean().default(false),
  accordPrealable: z.boolean().default(false),
  docsCrous: z.boolean().default(false),
});

export const crousPartageSchema = z.object({
  mode: z.enum(["email", "lien", "pdf", "zip"]),
  destinataire: z.string().email("Adresse e-mail invalide").max(255),
  objet: z.string().min(1, "L'objet est requis").max(255),
  message: z.string().max(5000).optional(),
  inclure: crousPartageInclureSchema,
});
export type CrousPartageInput = z.infer<typeof crousPartageSchema>;

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
export const dossierCreateSchema = z
  .object({
    // PRIVEE (défaut) : le candidat choisit lui-même — universiteId/formationId requis.
    // PUBLIQUE : le candidat ne choisit pas — universiteId/formationId ignorés côté serveur au
    // profit de l'établissement placeholder (cf. src/lib/dossier/procedure-publique.ts).
    procedure: z.enum(["PRIVEE", "PUBLIQUE"]).default("PRIVEE"),
    universiteId: z.string().min(1).optional(),
    formationId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.procedure === "PRIVEE") {
      if (!data.universiteId) {
        ctx.addIssue({ code: "custom", path: ["universiteId"], message: "L'université est requise" });
      }
      if (!data.formationId) {
        ctx.addIssue({ code: "custom", path: ["formationId"], message: "La formation est requise" });
      }
    }
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
  niveau: z.string().trim().min(1, "Le niveau est requis").max(80),
  domaine: z.string().min(1).max(100),
  duree: z.string().min(1).max(50),
  fraisAgence: z.number().int().min(0).optional(),
  /** Scolarité annuelle indicative (€) — distincte des frais d'agence */
  fraisFormationEuros: z.number().int().positive().nullable().optional(),
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

// --- Admin candidat management (Personnel & rôles > Candidats) ---
export const adminCandidatCreateSchema = z.object({
  prenom: z.string().min(1, "Le prénom est requis").max(NAME_MAX_LENGTH),
  nom: z.string().min(1, "Le nom est requis").max(NAME_MAX_LENGTH),
  email: z.string().trim().email("L'e-mail saisi n'est pas valide").max(EMAIL_MAX_LENGTH),
  telephone: z.string().max(PHONE_MAX_LENGTH).optional(),
  nationalite: z.string().max(NAME_MAX_LENGTH).optional(),
});
export type AdminCandidatCreateInput = z.infer<typeof adminCandidatCreateSchema>;

export const adminCandidatUpdateSchema = z.object({
  prenom: z.string().min(1).max(NAME_MAX_LENGTH).optional(),
  nom: z.string().min(1).max(NAME_MAX_LENGTH).optional(),
  email: z.string().trim().email("L'e-mail saisi n'est pas valide").max(EMAIL_MAX_LENGTH).optional(),
  telephone: z.string().max(PHONE_MAX_LENGTH).optional().nullable(),
  nationalite: z.string().max(NAME_MAX_LENGTH).optional().nullable(),
  actif: z.boolean().optional(),
});
export type AdminCandidatUpdateInput = z.infer<typeof adminCandidatUpdateSchema>;

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

export const markReadInterneSchema = z.object({
  // Requis pour Admin/Super Admin (quel fil financier marquer lu) ; ignoré pour un Financier.
  financierId: z.string().min(1).optional(),
});
export type MarkReadInterneInput = z.infer<typeof markReadInterneSchema>;

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

// --- Pagination / listes admin ---
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(200).optional(),
  format: z.enum(["json", "csv"]).optional(),
});
export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

export const listQuerySchema = paginationQuerySchema;
export type ListQueryInput = PaginationQueryInput;

// --- Matrice ---
export const matriceDraftCreateSchema = z.object({
  libelle: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
  fromActive: z.boolean().optional().default(true),
});
export type MatriceDraftCreateInput = z.infer<typeof matriceDraftCreateSchema>;

// --- Paiements ---
export const paiementPatchSchema = z.object({
  id: z.string().min(1, "id requis"),
  statut: z.enum(["rembourse", "echoue", "reussi", "en_attente"]),
});
export type PaiementPatchInput = z.infer<typeof paiementPatchSchema>;

export const paytechIpnSchema = z
  .object({
    ref_command: z.union([z.string(), z.number()]).optional(),
    custom_field: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    type_event: z.string().optional(),
    type: z.string().optional(),
    api_key_sha256: z.string().optional(),
    api_secret_sha256: z.string().optional(),
  })
  .passthrough();
export type PaytechIpnInput = z.infer<typeof paytechIpnSchema>;

// --- Notifications ---
export const notificationsMarkReadSchema = z
  .object({
    ids: z.array(z.string().min(1)).optional(),
    all: z.boolean().optional(),
  })
  .refine((d) => d.all === true || (Array.isArray(d.ids) && d.ids.length > 0), {
    message: "Indiquez all=true ou une liste d'ids non vide",
  });
export type NotificationsMarkReadInput = z.infer<typeof notificationsMarkReadSchema>;

// --- KYC / photo ---
export const kycUploadFieldsSchema = z.object({
  side: z.enum(["recto", "verso"]),
  kycType: z.string().max(50).optional(),
  kycNumero: z.string().max(100).optional(),
  /** Staff (kyc.write) téléversant pour le compte d'un candidat — sinon upload pour soi-même */
  targetUserId: z.string().min(1).optional(),
});
export type KycUploadFieldsInput = z.infer<typeof kycUploadFieldsSchema>;

export const kycDeleteSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  side: z.enum(["recto", "verso", "both"]),
});
export type KycDeleteInput = z.infer<typeof kycDeleteSchema>;

export const kycVerifySchema = z.object({
  userId: z.string().min(1),
  verifie: z.boolean(),
});
export type KycVerifyInput = z.infer<typeof kycVerifySchema>;

// --- Université media ---
export const universiteMediaKindSchema = z.enum(["cover", "logo", "gallery"]);
export const universiteMediaUploadSchema = z.object({
  kind: universiteMediaKindSchema,
});
export type UniversiteMediaUploadInput = z.infer<typeof universiteMediaUploadSchema>;

export const universiteMediaDeleteSchema = z
  .object({
    kind: universiteMediaKindSchema,
    url: z.string().url().optional(),
  })
  .refine((d) => d.kind !== "gallery" || !!d.url, {
    message: "url requis pour supprimer une image de galerie",
    path: ["url"],
  });
export type UniversiteMediaDeleteInput = z.infer<typeof universiteMediaDeleteSchema>;

// --- Auth auxiliaire ---
export const resendVerificationSchema = z.object({
  email: z.string().email("L'e-mail saisi n'est pas valide").max(EMAIL_MAX_LENGTH),
  dryRun: z.boolean().optional(),
});
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const staffLoginStatusSchema = z.object({
  email: z.string().email("L'e-mail saisi n'est pas valide").max(EMAIL_MAX_LENGTH),
  password: z.string().min(1, "Mot de passe requis"),
});
export type StaffLoginStatusInput = z.infer<typeof staffLoginStatusSchema>;

// --- Attestations ---
export const attestationModeRemiseSchema = z.object({
  modeRemise: z.enum(["telechargement", "agence"]),
});
export type AttestationModeRemiseInput = z.infer<typeof attestationModeRemiseSchema>;

export const modeleAttestationCreateSchema = z.object({
  nom: z.string().min(1, "Le nom est requis").max(200),
  description: z.string().max(2000).optional(),
});
export type ModeleAttestationCreateInput = z.infer<typeof modeleAttestationCreateSchema>;

// --- Pièces upload FormData (champs texte) ---
export const pieceUploadFormSchema = z.object({
  libelle: z.string().min(1, "Le libellé est requis").max(200),
});
export type PieceUploadFormInput = z.infer<typeof pieceUploadFormSchema>;

// --- Réservation de logement / Demande CROUS (espace candidat) ---
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)");

const MIN_BIRTH_YEAR = 1920;
const birthDate = isoDate
  .refine((v) => new Date(v).getTime() < Date.now(), "La date de naissance doit être dans le passé")
  .refine((v) => Number(v.slice(0, 4)) >= MIN_BIRTH_YEAR, "Année de naissance invalide");

const phoneField = z
  .string()
  .trim()
  .min(1, "Le téléphone est requis")
  .max(PHONE_MAX_LENGTH)
  .regex(/^\+?[0-9][0-9 .-]{6,}$/, "Numéro de téléphone invalide (chiffres, espaces, + et - uniquement)");

const passportNumberField = z
  .string()
  .trim()
  .min(1, "Le numéro de passeport est requis")
  .max(20, "Le numéro de passeport est trop long")
  .regex(/^[A-Za-z0-9]{5,20}$/, "Numéro de passeport invalide (5 à 20 caractères alphanumériques)");

const requiredNameField = (message: string) => z.string().trim().min(1, message).max(NAME_MAX_LENGTH);

export const logementReservationSchema = z.object({
  civilite: z.enum(["M", "MME"]),
  nom: requiredNameField("Le nom est requis"),
  prenom: requiredNameField("Le prénom est requis"),
  dateNaissance: birthDate,
  nationalite: requiredNameField("La nationalité est requise"),
  telephone: phoneField,
  email: z.string().trim().min(1, "L'e-mail est requis").email("L'e-mail saisi n'est pas valide").max(EMAIL_MAX_LENGTH),
  agenceAccompagnante: z.string().trim().max(200).optional().or(z.literal("")),
  numeroPasseport: passportNumberField,
  paysDemandeVisa: requiredNameField("Le pays de demande de visa est requis"),
  villeEtablissementFrance: requiredNameField("La ville de l'établissement est requise"),
  dateArriveePrevue: isoDate.refine(
    (v) => new Date(v).getTime() > Date.now(),
    "La date d'arrivée prévue doit être dans le futur",
  ),
});
export type LogementReservationInput = z.infer<typeof logementReservationSchema>;

// --- Demande de logement CROUS (espace candidat) — service distinct, transmis à l'administration ---
export const demandeCrousSchema = z.object({
  nom: requiredNameField("Le nom est requis"),
  prenom: requiredNameField("Le prénom est requis"),
  nomUsage: z.string().trim().max(NAME_MAX_LENGTH).optional().or(z.literal("")),
  dateNaissance: birthDate,
  lieuNaissance: requiredNameField("Le lieu de naissance est requis"),
  paysNaissance: requiredNameField("Le pays de naissance est requis"),
  nationalite: requiredNameField("La nationalité est requise"),
  sexe: z.enum(["M", "F"]),
  telephone: phoneField,
  email: z.string().trim().min(1, "L'e-mail est requis").email("L'e-mail saisi n'est pas valide").max(EMAIL_MAX_LENGTH),
  villeEtablissementFrance: requiredNameField("La ville de l'établissement est requise"),
});
export type DemandeCrousInput = z.infer<typeof demandeCrousSchema>;

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
