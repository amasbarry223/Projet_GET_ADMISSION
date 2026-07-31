import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "upload");
const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo (NFR)

const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Signatures magiques (magic bytes) pour les formats autorisés */
function detectExtFromMagic(buffer: Buffer): string | null {
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "pdf"; // %PDF
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }
  // RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export function getUploadRoot() {
  return UPLOAD_ROOT;
}

export function formatTaille(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export async function saveUpload(
  file: File,
  subdir: string
): Promise<{ cheminRelatif: string; nomFichier: string; taille: string; type: "pdf" | "image" | "autre" }> {
  if (file.size > MAX_BYTES) {
    throw new Error("Fichier trop volumineux (max 10 Mo)");
  }

  const claimedExt = ALLOWED_MIME[file.type];
  if (!claimedExt) {
    throw new Error("Format non autorisé (PDF, JPG, PNG, WEBP)");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const magicExt = detectExtFromMagic(buffer);
  if (!magicExt) {
    throw new Error("Contenu fichier non reconnu (signature invalide)");
  }
  // Le type déclaré client doit coller au contenu (jpg/jpeg → jpg)
  if (magicExt !== claimedExt) {
    throw new Error("Type MIME incohérent avec le contenu du fichier");
  }

  const dir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });

  const safeName = `${Date.now()}-${randomBytes(6).toString("hex")}.${magicExt}`;
  const abs = path.join(dir, safeName);
  await writeFile(abs, buffer);

  const type: "pdf" | "image" | "autre" = magicExt === "pdf" ? "pdf" : "image";
  return {
    cheminRelatif: path.join(subdir, safeName).replace(/\\/g, "/"),
    nomFichier: file.name || safeName,
    taille: formatTaille(file.size),
    type,
  };
}

export function resolveUploadPath(cheminRelatif: string): string {
  const resolved = path.resolve(UPLOAD_ROOT, cheminRelatif);
  if (!resolved.startsWith(path.resolve(UPLOAD_ROOT))) {
    throw new Error("Chemin invalide");
  }
  return resolved;
}

export async function deleteUpload(cheminRelatif: string | null | undefined) {
  if (!cheminRelatif) return;
  try {
    await unlink(resolveUploadPath(cheminRelatif));
  } catch {
    // ignore
  }
}
