import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiting distribué (Upstash Redis) si UPSTASH_REDIS_REST_URL/TOKEN
// sont configurés — nécessaire sur Vercel où chaque invocation de fonction
// peut atterrir sur une instance différente et ne partage aucune mémoire.
// Sans ces variables : repli automatique sur un compteur en mémoire
// (suffisant en développement local, mais pas fiable en multi-instance).

type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 60_000; // 1 minute

type Limit = {
  limit: number; // max requêtes par fenêtre
  windowMs: number; // durée du fenêtre
};

// Limites par endpoint — source unique, utilisée par les deux backends.
const LIMITS: Record<string, Limit> = {
  "/api/auth/callback/credentials": { limit: 5, windowMs: WINDOW_MS }, // 5 login/min
  "/api/auth/forgot-password": { limit: 3, windowMs: WINDOW_MS }, // 3 demandes reset/min
  "/api/auth/reset-password": { limit: 5, windowMs: WINDOW_MS }, // 5 resets/min
  "/api/auth/resend-verification": { limit: 3, windowMs: WINDOW_MS }, // 3 renvois vérif/min
  "/api/auth/verify-otp": { limit: 10, windowMs: WINDOW_MS }, // 10 vérifs OTP/min
  "/api/auth/request-otp-login": { limit: 5, windowMs: WINDOW_MS }, // 5 demandes OTP login/min
  "/api/auth/staff-login-status": { limit: 10, windowMs: WINDOW_MS }, // diagnostic suspension staff
  "/api/verifier": { limit: 20, windowMs: WINDOW_MS }, // anti brute-force codes
  "/api/register": { limit: 3, windowMs: WINDOW_MS }, // 3 inscriptions/min
  "/api/messages": { limit: 30, windowMs: WINDOW_MS }, // 30 messages/min
  "/api/paiements/initiate": { limit: 10, windowMs: WINDOW_MS }, // 10 initiations paiement/min
  "/api/contact": { limit: 5, windowMs: WINDOW_MS }, // 5 messages contact/min
  "/api/profile/password": { limit: 5, windowMs: WINDOW_MS }, // 5 changements mdp/min
  "/api/dossiers": { limit: 10, windowMs: WINDOW_MS }, // 10 créations de dossier/min
  "/api/logement/reservations": { limit: 5, windowMs: WINDOW_MS }, // 5 demandes de logement/min
  "/api/admin/users": { limit: 10, windowMs: WINDOW_MS }, // 10 invitations/min
  "/api/admin/users/reset-password": { limit: 10, windowMs: WINDOW_MS }, // 10 resets staff/min
  "/api/admin/paiements": { limit: 10, windowMs: WINDOW_MS }, // 10 transactions manuelles/min
};

function tooManyRequestsResponse(limit: number, retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Trop de requêtes. Réessayez dans quelques secondes." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, retryAfterSeconds)),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

// ───────────────────────── Backend Upstash Redis ─────────────────────────

function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

let redisClient: Redis | null = null;
function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

const limiterCache = new Map<string, Ratelimit>();
function getLimiter(pathname: string, config: Limit): Ratelimit {
  const cached = limiterCache.get(pathname);
  if (cached) return cached;
  const limiter = new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(config.limit, `${Math.round(config.windowMs / 1000)} s`),
    prefix: `getadm-ratelimit:${pathname}`,
    analytics: false,
  });
  limiterCache.set(pathname, limiter);
  return limiter;
}

async function checkRateLimitRedis(
  identifier: string,
  pathname: string,
  config: Limit,
): Promise<NextResponse | null> {
  const { success, limit, reset } = await getLimiter(pathname, config).limit(identifier);
  if (success) return null;
  return tooManyRequestsResponse(limit, Math.ceil((reset - Date.now()) / 1000));
}

// ───────────────────────── Backend mémoire (repli) ─────────────────────────

const buckets = new Map<string, Bucket>();

function checkRateLimitMemory(
  identifier: string,
  pathname: string,
  config: Limit,
): NextResponse | null {
  const key = `${pathname}:${identifier}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  bucket.count++;
  if (bucket.count > config.limit) {
    return tooManyRequestsResponse(config.limit, Math.ceil((bucket.resetAt - now) / 1000));
  }

  return null;
}

/** Nettoie périodiquement les buckets mémoire expirés (toutes les 5 min). */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(key);
    }
  }, 5 * 60_000).unref?.();
}

// ───────────────────────────────── API ─────────────────────────────────

/**
 * Vérifie le rate limiting pour une request.
 * Utilise Upstash Redis si configuré (distribué, fiable en multi-instance),
 * sinon un compteur en mémoire locale (dev / single-instance uniquement).
 * @returns null si OK, ou NextResponse 429 si limite dépassée.
 */
export async function checkRateLimit(
  identifier: string,
  pathname: string,
): Promise<NextResponse | null> {
  const config = LIMITS[pathname];
  if (!config) return null;

  if (isUpstashConfigured()) {
    try {
      return await checkRateLimitRedis(identifier, pathname, config);
    } catch (e) {
      console.error("[rate-limit] Upstash indisponible, repli mémoire", e);
      return checkRateLimitMemory(identifier, pathname, config);
    }
  }

  return checkRateLimitMemory(identifier, pathname, config);
}

/** Variante booléenne pour authorize() / code hors Route Handler. */
export async function isRateLimited(identifier: string, pathname: string): Promise<boolean> {
  return (await checkRateLimit(identifier, pathname)) !== null;
}

/** Extrait un identifiant client (IP ou user ID fallback). */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
