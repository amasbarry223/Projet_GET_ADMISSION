import crypto from "crypto";

/** Token e-mail : `hex.expiresAtMs` — TTL 48h aligné sur le copy mail */
const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;

export function createVerifyToken(): string {
  const hex = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + VERIFY_TTL_MS;
  return `${hex}.${expires}`;
}

export function isVerifyTokenExpired(token: string): boolean {
  const parts = token.split(".");
  if (parts.length < 2) return true; // ancien format sans expiry → forcer renvoi
  const expires = Number(parts[parts.length - 1]);
  if (!Number.isFinite(expires)) return true;
  return Date.now() > expires;
}
