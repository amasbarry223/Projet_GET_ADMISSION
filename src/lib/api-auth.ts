/**
 * Garde-fous communs aux routes API (session + permission RBAC + validation).
 *
 * Élimine le bloc répété dans ~40 routes :
 *   const session = await getServerSession(authOptions);
 *   if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
 *   const role = (session.user as { role?: string }).role;   // cast inutile — voir next-auth.d.ts
 *   const gate = requirePermission(role, "...");
 *   if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
 *
 * `session.user` est déjà typé (id/role/prenom/nom) par l'augmentation de module dans
 * src/types/next-auth.d.ts — les casts `as { role?: string }` dispersés dans les routes ne
 * font que ré-élargir ce type déjà correct vers `string | undefined`, sans aucun bénéfice.
 */
import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import type { ZodSchema } from "zod";
import { authOptions } from "@/lib/auth";
import { hasPermission, requirePermission, type Permission } from "@/lib/rbac";
import { validate } from "@/lib/validations";

export type SessionUser = Session["user"];

type AuthOk = { ok: true; session: Session; user: SessionUser };
type AuthFail = { ok: false; response: NextResponse };
export type ApiAuthResult = AuthOk | AuthFail;

/** Exige une session authentifiée. `user` est déjà typé — pas de cast à refaire. */
export async function requireApiUser(): Promise<ApiAuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  return { ok: true, session, user: session.user };
}

/** Exige une session authentifiée + une permission RBAC (§5 du cahier des charges). */
export async function requireApiPermission(permission: Permission): Promise<ApiAuthResult> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth;
  const gate = requirePermission(auth.user.role, permission);
  if (!gate.ok) {
    return { ok: false, response: NextResponse.json({ error: gate.error }, { status: gate.status }) };
  }
  return auth;
}

/** Variante booléenne pour les checks ponctuels (ex. accès conditionnel candidat vs staff). */
export function userHasPermission(user: SessionUser, permission: Permission): boolean {
  return hasPermission(user.role, permission);
}

type ParsedOk<T> = { ok: true; data: T };
type ParsedFail = { ok: false; response: NextResponse };

/** `validate()` + réponse 400 prête à renvoyer — remplace le bloc if(!parsed.success) répété. */
export function parseOrRespond<T>(schema: ZodSchema<T>, raw: unknown): ParsedOk<T> | ParsedFail {
  const result = validate(schema, raw);
  if (!result.success) {
    return { ok: false, response: NextResponse.json({ error: result.error }, { status: 400 }) };
  }
  return { ok: true, data: result.data };
}
