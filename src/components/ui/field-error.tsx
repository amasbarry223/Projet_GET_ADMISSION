import { cn } from "@/lib/utils";

type FieldErrorProps = {
  id?: string;
  message?: string | null;
  className?: string;
};

/**
 * Message d'erreur sous un champ — à lier via aria-describedby.
 */
export function FieldError({ id, message, className }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={cn("text-xs text-carmin", className)}>
      {message}
    </p>
  );
}
