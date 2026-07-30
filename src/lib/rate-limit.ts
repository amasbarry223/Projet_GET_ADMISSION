import { NextResponse } from "next/server";

// Rate limiting simple en mémoire (suffisant pour single-instance).
// Pour multi-instance : migrer vers Redis/@upstash/ratelimit.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000; // 1 minute

type Limit = {
  limit: number;        // max requêtes par fenêtre
  windowMs: number;     // durée du fenêtre
};

// Limites par endpoint
const LIMITS: Record<string, Limit> = {
  "/api/auth/callback/credentials": { limit: 5, windowMs: WINDOW_MS },   // 5 login/min
  "/api/register": { limit: 3, windowMs: WINDOW_MS },                    // 3 inscriptions/min
  "/api/messages": { limit: 30, windowMs: WINDOW_MS },                   // 30 messages/min
  "/api/paiements": { limit: 10, windowMs: WINDOW_MS },                  // 10 paiements/min
  "/api/contact": { limit: 5, windowMs: WINDOW_MS },                     // 5 messages contact/min
  "/api/profile/password": { limit: 5, windowMs: WINDOW_MS },            // 5 changements mdp/min
  "/api/dossiers": { limit: 10, windowMs: WINDOW_MS },                   // 10 créations de dossier/min
  "/api/admin/users": { limit: 10, windowMs: WINDOW_MS },                // 10 invitations/min
  "/api/admin/paiements": { limit: 10, windowMs: WINDOW_MS },            // 10 transactions manuelles/min
};

/**
 * Vérifie le rate limiting pour une request.
 * @returns null si OK, ou NextResponse 429 si limit dépassée.
 */
export function checkRateLimit(
  identifier: string,
  pathname: string
): NextResponse | null {
  const config = LIMITS[pathname];
  if (!config) return null;

  const key = `${pathname}:${identifier}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  bucket.count++;
  if (bucket.count > config.limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans quelques secondes." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}

/** Nettoie périodiquement les buckets expirés (toutes les 5 min). */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(key);
    }
  }, 5 * 60_000).unref?.();
}

/** Extrait un identifiant client (IP ou user ID fallback). */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
