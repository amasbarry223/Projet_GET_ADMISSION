import { MAX_UPLOAD_SIZE_BYTES } from "@/shared/constants";

/** Types acceptés pour les pièces jointes candidat — miroir de ALLOWED_MIME côté serveur (src/lib/storage.ts). */
export const ACCEPTED_UPLOAD_MIME = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ACCEPTED_UPLOAD_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Valide un fichier candidat côté client avant envoi — retourne un message d'erreur ou null si valide. */
export function validateUploadFile(file: File): string | null {
  if (file.size === 0) {
    return "Le fichier est vide.";
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return `Fichier trop volumineux (${formatFileSize(file.size)}) — 10 Mo maximum.`;
  }
  if (!ACCEPTED_UPLOAD_MIME.includes(file.type)) {
    return "Format non autorisé — PDF, JPG, PNG ou WEBP uniquement.";
  }
  return null;
}
