/**
 * Garde-fous communs aux routes API (session + permission RBAC + validation).
 *
 * Élimine le bloc répété dans ~40 routes :
 *   const session = await getSession();
 *   if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
 *   const role = session.user.role;   // cast inutile — voir next-auth.d.ts
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
import { getSession, authOptionsCandidat } from "@/lib/auth";
import { hasPermission, requirePermission, type Permission } from "@/lib/rbac";
import { validate } from "@/lib/validations";

export type SessionUser = Session["user"];

type AuthOk = { ok: true; session: Session; user: SessionUser };
type AuthFail = { ok: false; response: NextResponse };
export type ApiAuthResult = AuthOk | AuthFail;

/** Exige une session authentifiée (candidat ou staff). `user` est déjà typé — pas de cast à refaire. */
export async function requireApiUser(): Promise<ApiAuthResult> {
  const session = await getSession();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  return { ok: true, session, user: session.user };
}

/**
 * Exige une session authentifiée du portail CANDIDAT spécifiquement — à utiliser pour toute route
 * réservée aux candidats (paiements, logement, profil académique…), à la place de
 * `requireApiUser()`/`getSession()`. Ces deux derniers résolvent le cookie STAFF en priorité s'il
 * existe (utile pour les routes partagées) ; or les deux portails coexistent volontairement dans
 * le même navigateur (un onglet candidat, un onglet staff — voir src/lib/auth.ts). Un candidat qui
 * possède aussi un cookie staff valide (ex. un membre du staff qui teste son propre espace
 * candidat) voyait donc son identité candidate écrasée par sa session staff sur ces routes,
 * provoquant un rejet "Réservé aux candidats" alors qu'il est bien authentifié en tant que
 * candidat. En lisant directement le cookie du portail candidat, ce risque disparaît.
 */
export async function requireApiCandidat(): Promise<ApiAuthResult> {
  const session = await getServerSession(authOptionsCandidat);
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
