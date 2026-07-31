/**
 * Messages d'erreur API explicites (FR) pour toasts / Alert.
 */

const STATUS_MESSAGES: Record<number, string> = {
  400: "La requête est invalide. Vérifiez les informations saisies.",
  401: "Session expirée. Reconnectez-vous pour continuer.",
  403: "Vous n'avez pas l'autorisation d'effectuer cette action.",
  404: "Ressource introuvable.",
  409: "Conflit : cette action n'est plus possible dans l'état actuel.",
  422: "Certaines données sont incorrectes. Corrigez les champs indiqués.",
  429: "Trop de tentatives. Réessayez dans quelques instants.",
  500: "Erreur serveur. Réessayez plus tard ou contactez le support.",
  502: "Service temporairement indisponible. Réessayez plus tard.",
  503: "Service temporairement indisponible. Réessayez plus tard.",
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  details?: string;
};

/** Extrait un message lisible depuis un body JSON API. */
export function messageFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as ApiErrorBody;
  const raw = b.error ?? b.message ?? b.details;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

/**
 * Message FR à partir d'un Response (lit le JSON si possible) ou d'une Error.
 */
export async function getApiErrorMessage(
  input: Response | Error | unknown,
  fallback = "Une erreur est survenue. Réessayez.",
): Promise<string> {
  if (input instanceof Error) {
    if (input.message === "Failed to fetch" || input.name === "TypeError") {
      return "Connexion impossible. Vérifiez votre réseau et réessayez.";
    }
    if (input.message.startsWith("HTTP ")) {
      const code = Number(input.message.replace("HTTP ", ""));
      if (STATUS_MESSAGES[code]) return STATUS_MESSAGES[code];
    }
    return input.message || fallback;
  }

  if (input instanceof Response) {
    let body: unknown = null;
    try {
      body = await input.clone().json();
    } catch {
      // ignore
    }
    const fromBody = messageFromBody(body);
    if (fromBody) return fromBody;
    return STATUS_MESSAGES[input.status] ?? fallback;
  }

  if (typeof input === "object" && input !== null) {
    const fromBody = messageFromBody(input);
    if (fromBody) return fromBody;
  }

  return fallback;
}

/** Variante synchrone quand le body est déjà parsé. */
export function getApiErrorMessageSync(
  statusOrError: number | Error | unknown,
  body?: unknown,
  fallback = "Une erreur est survenue. Réessayez.",
): string {
  if (statusOrError instanceof Error) {
    if (statusOrError.message === "Failed to fetch" || statusOrError.name === "TypeError") {
      return "Connexion impossible. Vérifiez votre réseau et réessayez.";
    }
    return statusOrError.message || fallback;
  }
  const fromBody = messageFromBody(body);
  if (fromBody) return fromBody;
  if (typeof statusOrError === "number") {
    return STATUS_MESSAGES[statusOrError] ?? fallback;
  }
  return fallback;
}
