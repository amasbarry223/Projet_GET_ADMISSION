import { db } from "@/lib/db";
import type { Session } from "next-auth";

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "WORKFLOW" | "VERIFY_EMAIL";
type AuditResource =
  | "dossier"
  | "user"
  | "universite"
  | "paiement"
  | "attestation"
  | "parametre"
  | "message"
  | "auth"
  | "matrice"
  | "crous";

/**
 * Enregistre une action dans le journal d'audit (BF-26, §4.7).
 * Non-bloquant : si l'insert échoue, on log l'erreur sans casser le flux principal.
 */
export async function logAudit(params: {
  session: Session | null;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details: string;
  ip?: string;
}): Promise<void> {
  try {
    const user = params.session?.user;
    await db.auditLog.create({
      data: {
        userId: user?.id ?? null,
        userEmail: user?.email ?? "anonymous",
        role: user?.role ?? "UNKNOWN",
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        details: params.details,
        ip: params.ip ?? null,
      },
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
