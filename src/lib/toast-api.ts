/**
 * Toasts Sonner uniformes pour succès / erreurs API.
 *
 * Checklist formulaire (avec FieldError) :
 * 1. Label lié via htmlFor + id sur l’input
 * 2. Validation inline → FieldError + aria-invalid + aria-describedby
 * 3. Erreurs API → toastApiError (jamais "Erreur" / "Échec" seuls)
 * 4. Succès action → toastApiSuccess
 * 5. Bouton async → disabled + spinner pendant le chargement
 */

import { toast } from "sonner";
import { getApiErrorMessage, getApiErrorMessageSync } from "@/lib/api-error";

type ToastOpts = {
  title?: string;
  description?: string;
};

/** Toast succès avec titre + description optionnelle. */
export function toastApiSuccess(title: string, description?: string) {
  toast.success(title, description ? { description } : undefined);
}

/**
 * Toast erreur à partir d’un Response, Error, status number, ou body déjà parsé.
 * Préférer toujours ce helper plutôt que toast.error("Erreur").
 */
export async function toastApiError(
  input: Response | Error | unknown,
  opts?: ToastOpts & { body?: unknown },
) {
  const title = opts?.title ?? "Action impossible";
  let description = opts?.description;

  if (!description) {
    if (opts?.body !== undefined || typeof input === "number") {
      description = getApiErrorMessageSync(
        typeof input === "number" ? input : (input as Error | unknown),
        opts?.body,
      );
    } else {
      description = await getApiErrorMessage(input);
    }
  }

  toast.error(title, { description });
}

/** Variante synchrone quand le body est déjà parsé ou qu’on a une Error. */
export function toastApiErrorSync(
  statusOrError: number | Error | unknown,
  opts?: ToastOpts & { body?: unknown },
) {
  const title = opts?.title ?? "Action impossible";
  const description =
    opts?.description ?? getApiErrorMessageSync(statusOrError, opts?.body);
  toast.error(title, { description });
}
