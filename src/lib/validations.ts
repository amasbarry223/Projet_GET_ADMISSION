import { z } from "zod";

// ===================== Schémas de validation API =====================

// --- Auth ---
export const registerSchema = z.object({
  prenom: z.string().min(1, "Le prénom est requis").max(50),
  nom: z.string().min(1, "Le nom est requis").max(50),
  email: z.string().email("L'e-mail saisi n'est pas valide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  nationalite: z.string().optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// --- Dossiers ---
export const workflowSchema = z.object({
  action: z.enum([
    "verifier",
    "correction",
    "verifier_corrections",
    "confirmer_paiement",
    "transmettre",
    "accepter",
    "refuser",
    "emettre_attestation",
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
  prenom: z.string().min(1).max(50).optional(),
  nom: z.string().min(1).max(50).optional(),
  telephone: z.string().max(30).optional(),
  nationalite: z.string().max(50).optional(),
  dateNaissance: z.string().max(20).optional(),
  adresse: z.string().max(200).optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

// --- Change password ---
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères").max(128),
});
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

// --- Create dossier ---
export const dossierCreateSchema = z.object({
  universiteId: z.string().min(1, "L'université est requise"),
  formationId: z.string().min(1, "La formation est requise"),
});
export type DossierCreateInput = z.infer<typeof dossierCreateSchema>;

// --- Update dossier ---
export const dossierUpdateSchema = z.object({
  etapeActuelle: z.number().int().min(1).max(12).optional(),
  info: z.object({
    prenom: z.string().max(50).optional(),
    nom: z.string().max(50).optional(),
    telephone: z.string().max(30).optional(),
    nationalite: z.string().max(50).optional(),
    dateNaissance: z.string().max(20).optional(),
    adresse: z.string().max(200).optional(),
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
  fraisMin: z.number().int().min(0).default(0),
  fraisMax: z.number().int().min(0).default(0),
  partenaire: z.boolean().optional(),
});
export type UniversiteInput = z.infer<typeof universiteSchema>;

// --- Admin user invite ---
export const adminUserCreateSchema = z.object({
  prenom: z.string().min(1, "Le prénom est requis").max(50),
  nom: z.string().min(1, "Le nom est requis").max(50),
  email: z.string().email("L'e-mail saisi n'est pas valide"),
  role: z.enum(["CANDIDAT", "CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"]),
});
export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;

export const adminUserUpdateSchema = z.object({
  actif: z.boolean().optional(),
  role: z.enum(["CANDIDAT", "CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"]).optional(),
});
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
  paiementTranches: z.boolean().optional(),
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
