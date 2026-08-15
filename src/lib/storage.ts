import { randomBytes } from "crypto";
import path from "path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type StorageVisibility = "public" | "private";

const BUCKET = {
  public: "public-media",
  private: "private-docs",
} as const;

const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo (NFR)

const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MIME_FROM_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
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

function bucketFor(visibility: StorageVisibility) {
  return BUCKET[visibility];
}

function sanitizeSubdir(subdir: string): string {
  return subdir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

/**
 * Extrait le chemin objet depuis une URL publique Supabase Storage,
 * ou retourne le chemin tel quel s'il n'est pas une URL absolue.
 * Ignore les anciennes URLs locales `/uploads/...`.
 */
export function storagePathFromUrlOrPath(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const value = urlOrPath.trim();
  if (!value) return null;

  // Legacy FS paths — plus de fichier local en prod
  if (value.startsWith("/uploads/") || value.startsWith("upload/")) {
    return null;
  }

  const publicMarker = `/storage/v1/object/public/${BUCKET.public}/`;
  const idx = value.indexOf(publicMarker);
  if (idx !== -1) {
    return decodeURIComponent(value.slice(idx + publicMarker.length).split("?")[0] ?? "");
  }

  // Chemin relatif storage déjà stocké (private-docs)
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return value.replace(/^\/+/, "");
  }

  return null;
}

export function formatTaille(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export type SaveUploadResult = {
  /** Chemin objet dans le bucket (ex. partenaires/{id}/file.png) */
  cheminRelatif: string;
  /** URL publique CDN — non null si visibility = public */
  publicUrl: string | null;
  nomFichier: string;
  taille: string;
  type: "pdf" | "image" | "autre";
};

export async function saveUpload(
  file: File,
  subdir: string,
  options: { visibility: StorageVisibility },
): Promise<SaveUploadResult> {
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
  if (magicExt !== claimedExt) {
    throw new Error("Type MIME incohérent avec le contenu du fichier");
  }

  const safeName = `${Date.now()}-${randomBytes(6).toString("hex")}.${magicExt}`;
  const objectPath = `${sanitizeSubdir(subdir)}/${safeName}`;
  const bucket = bucketFor(options.visibility);
  const contentType = MIME_FROM_EXT[magicExt] ?? file.type;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType,
    upsert: false,
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(error.message || "Upload échoué");
  }

  let publicUrl: string | null = null;
  if (options.visibility === "public") {
    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    publicUrl = data.publicUrl;
  }

  const type: "pdf" | "image" | "autre" = magicExt === "pdf" ? "pdf" : "image";
  return {
    cheminRelatif: objectPath,
    publicUrl,
    nomFichier: file.name || safeName,
    taille: formatTaille(file.size),
    type,
  };
}

export async function deleteUpload(
  cheminRelatif: string | null | undefined,
  visibility: StorageVisibility = "private",
) {
  const objectPath = storagePathFromUrlOrPath(cheminRelatif);
  if (!objectPath) return;

  try {
    const supabase = createSupabaseAdminClient();
    await supabase.storage.from(bucketFor(visibility)).remove([objectPath]);
  } catch {
    // ignore missing / network
  }
}

/** Supprime un média public à partir de son URL publique ou chemin storage. */
export async function deletePublicMedia(urlOrPath: string | null | undefined) {
  await deleteUpload(urlOrPath, "public");
}

export async function readUpload(
  cheminRelatif: string,
  visibility: StorageVisibility = "private",
): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
  const objectPath = storagePathFromUrlOrPath(cheminRelatif);
  if (!objectPath) {
    throw new Error("Chemin fichier invalide");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucketFor(visibility)).download(objectPath);
  if (error || !data) {
    throw new Error(error?.message || "Fichier inaccessible");
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = path.extname(objectPath).replace(".", "").toLowerCase();
  const contentType = data.type || MIME_FROM_EXT[ext] || "application/octet-stream";

  return {
    buffer,
    contentType,
    fileName: path.basename(objectPath),
  };
}

/**
 * Génère une URL signée temporaire vers un fichier du bucket privé — utilisée pour transmettre un
 * document à un tiers externe (ex. partenaire logement) sans jamais exposer d'URL publique permanente.
 */
export async function createSignedUrl(
  cheminRelatif: string,
  visibility: StorageVisibility = "private",
  expiresInSeconds = 7 * 24 * 60 * 60,
): Promise<string> {
  const objectPath = storagePathFromUrlOrPath(cheminRelatif);
  if (!objectPath) {
    throw new Error("Chemin fichier invalide");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(bucketFor(visibility))
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Impossible de générer le lien du fichier");
  }

  return data.signedUrl;
}

