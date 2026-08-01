import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createOtpBridgeToken } from "@/lib/otp-bridge";
import { isStaff } from "@/lib/rbac";

/**
 * GET /auth/callback
 * Callback PKCE / magic link Supabase → upsert Prisma → bridge NextAuth → /espace
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") || "email";
  const next = url.searchParams.get("next") || "/espace";
  const origin = url.origin;

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(`${origin}/connexion?error=config`);
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* ignore */
        }
      },
    },
  });

  let accessToken: string | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session?.access_token) {
      return NextResponse.redirect(
        `${origin}/verification-otp?error=link_invalid`,
      );
    }
    accessToken = data.session.access_token;
  } else if (token_hash) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as "email" | "magiclink" | "signup",
      token_hash,
    });
    if (error || !data.session?.access_token) {
      return NextResponse.redirect(
        `${origin}/verification-otp?error=link_invalid`,
      );
    }
    accessToken = data.session.access_token;
  } else {
    return NextResponse.redirect(`${origin}/connexion?error=missing_code`);
  }

  const { data: authData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !authData.user?.email) {
    return NextResponse.redirect(`${origin}/verification-otp?error=session`);
  }

  const supabaseUser = authData.user;
  const email = supabaseUser.email!.toLowerCase().trim();

  let user = await db.user.findFirst({
    where: {
      OR: [{ email }, { supabaseUserId: supabaseUser.id }],
    },
  });

  if (user && isStaff(user.role)) {
    return NextResponse.redirect(`${origin}/connexion?portal=staff&error=staff`);
  }

  if (!user) {
    return NextResponse.redirect(
      `${origin}/inscription?error=not_registered&email=${encodeURIComponent(email)}`,
    );
  }

  if (user.role !== "CANDIDAT") {
    return NextResponse.redirect(`${origin}/connexion?error=invalid`);
  }

  user = await db.user.update({
    where: { id: user.id },
    data: {
      supabaseUserId: supabaseUser.id,
      emailVerified: user.emailVerified ?? new Date(),
      lastLoginAt: new Date(),
      verifyToken: null,
    },
  });

  if (!user.actif) {
    return NextResponse.redirect(`${origin}/connexion?error=disabled`);
  }

  const bridgeToken = createOtpBridgeToken(user.id);
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/espace";
  const redirectUrl = new URL(`${origin}/auth/bridge`);
  redirectUrl.searchParams.set("bridgeToken", bridgeToken);
  redirectUrl.searchParams.set("next", dest);

  return NextResponse.redirect(redirectUrl.toString());
}
