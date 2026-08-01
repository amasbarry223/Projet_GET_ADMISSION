import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { otpVerifySchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { createOtpBridgeToken } from "@/lib/otp-bridge";
import { isStaff } from "@/lib/rbac";
import { API_ROUTES } from "@/shared/constants";

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

export async function POST(request: Request) {
  const rateLimited = checkRateLimit(getClientId(request), API_ROUTES.AUTH_VERIFY_OTP);
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = validate(otpVerifySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { accessToken } = parsed.data;

    const supabase = supabaseAuthClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user?.email) {
      return NextResponse.json(
        { error: "Session OTP invalide ou expirée" },
        { status: 401 },
      );
    }

    const supabaseUser = authData.user;
    const email = supabaseUser.email!.toLowerCase().trim();

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

    if (!user) {
      return NextResponse.json(
        {
          error: "Aucun compte trouvé. Inscrivez-vous d'abord.",
          code: "NOT_REGISTERED",
        },
        { status: 404 },
      );
    }

    if (user.role !== "CANDIDAT") {
      return NextResponse.json({ error: "Compte invalide" }, { status: 403 });
    }

    user = await db.user.update({
      where: { id: user.id },
      data: {
        supabaseUserId: supabaseUser.id,
        emailVerified: user.emailVerified ?? new Date(),
        verifyToken: null,
        lastLoginAt: new Date(),
      },
    });

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
