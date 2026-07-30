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
