/**
 * Message d'erreur sous un champ — à lier via aria-describedby.
 *
 * Checklist formulaire :
 * - <Label htmlFor="…"> + input id="…"
 * - aria-invalid={!!error} + aria-describedby={errorId}
 * - <FieldError id={errorId} message={error} />
 * - Erreurs API globales → toastApiError (src/lib/toast-api.ts)
 */

import { cn } from "@/lib/utils";

type FieldErrorProps = {
  id?: string;
  message?: string | null | undefined;
  className?: string;
};

export function FieldError({ id, message, className }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={cn("text-xs text-carmin", className)}>
      {message}
    </p>
  );
}
