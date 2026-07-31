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

  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    throw new Error("Format non autorisé (PDF, JPG, PNG, WEBP)");
  }

  const dir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });

  const safeName = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const abs = path.join(dir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(abs, buffer);

  const type: "pdf" | "image" | "autre" = ext === "pdf" ? "pdf" : "image";
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
