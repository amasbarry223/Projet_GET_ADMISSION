import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { otpVerifySchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { createOtpBridgeToken } from "@/lib/otp-bridge";
import { isStaff } from "@/lib/rbac";

function supabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env manquantes");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * POST /api/auth/verify-otp
 * Valide le access_token Supabase, upsert User Prisma CANDIDAT, renvoie bridgeToken NextAuth.
 */
export async function POST(request: Request) {
  const rateLimited = checkRateLimit(getClientId(request), "/api/auth/verify-otp");
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = validate(otpVerifySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { accessToken, mode, prenom, nom, nationalite } = parsed.data;

    const supabase = supabaseAuthClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user?.email) {
      return NextResponse.json(
        { error: "Session OTP invalide ou expirée" },
        { status: 401 },
      );
    }

    const supabaseUser = authData.user;
    const emailRaw = supabaseUser.email;
    if (!emailRaw) {
      return NextResponse.json(
        { error: "Session OTP invalide ou expirée" },
        { status: 401 },
      );
    }
    const email = emailRaw.toLowerCase().trim();
    const meta = (supabaseUser.user_metadata ?? {}) as Record<string, unknown>;

    const resolvedPrenom =
      (typeof prenom === "string" && prenom.trim()) ||
      (typeof meta.prenom === "string" && meta.prenom) ||
      "";
    const resolvedNom =
      (typeof nom === "string" && nom.trim()) ||
      (typeof meta.nom === "string" && meta.nom) ||
      "";
    const resolvedNationalite =
      (typeof nationalite === "string" && nationalite) ||
      (typeof meta.nationalite === "string" && meta.nationalite) ||
      null;

    if (mode === "register" && (!resolvedPrenom || !resolvedNom)) {
      return NextResponse.json(
        { error: "Prénom et nom requis pour l'inscription" },
        { status: 400 },
      );
    }

    let user = await db.user.findFirst({
      where: {
        OR: [{ email }, { supabaseUserId: supabaseUser.id }],
      },
    });

    if (user && isStaff(user.role)) {
      return NextResponse.json(
        { error: "Cet e-mail est réservé au back-office" },
        { status: 403 },
      );
    }

    if (!user && mode === "login") {
      return NextResponse.json(
        {
          error: "Aucun compte candidat trouvé. Créez un compte d'abord.",
          code: "NOT_REGISTERED",
        },
        { status: 404 },
      );
    }

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          prenom: resolvedPrenom,
          nom: resolvedNom,
          nationalite: resolvedNationalite,
          role: "CANDIDAT",
          actif: true,
          passwordHash: null,
          supabaseUserId: supabaseUser.id,
          emailVerified: new Date(),
          verifyToken: null,
          lastLoginAt: new Date(),
        },
      });
    } else {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          supabaseUserId: supabaseUser.id,
          emailVerified: user.emailVerified ?? new Date(),
          verifyToken: null,
          lastLoginAt: new Date(),
          ...(resolvedPrenom ? { prenom: resolvedPrenom } : {}),
          ...(resolvedNom ? { nom: resolvedNom } : {}),
          ...(resolvedNationalite ? { nationalite: resolvedNationalite } : {}),
        },
      });
    }

    if (!user.actif) {
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 });
    }

    const bridgeToken = createOtpBridgeToken(user.id);

    return NextResponse.json({
      success: true,
      bridgeToken,
      user: {
        id: user.id,
        email: user.email,
        prenom: user.prenom,
        nom: user.nom,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("verify-otp error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
