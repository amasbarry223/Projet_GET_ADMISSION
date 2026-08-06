import { NextResponse } from "next/server";
import { parseOrRespond } from "@/lib/api-auth";
import { staffLoginStatusSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/rbac";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

/**
 * POST /api/auth/staff-login-status
 * Après un échec signIn staff : distingue compte suspendu vs identifiants invalides
 * (seulement si e-mail + mot de passe sont corrects).
 */
export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(getClientId(request), "/api/auth/staff-login-status");
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "invalid" as const });
  }

  const parsed = parseOrRespond(staffLoginStatusSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ status: "invalid" as const });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const password = parsed.data.password;

  const user = await db.user.findUnique({
    where: { email },
    select: { passwordHash: true, actif: true, role: true },
  });

  if (!user?.passwordHash || !isStaff(user.role)) {
    return NextResponse.json({ status: "invalid" as const });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ status: "invalid" as const });
  }

  if (!user.actif) {
    return NextResponse.json({ status: "suspended" as const });
  }

  return NextResponse.json({ status: "invalid" as const });
}
