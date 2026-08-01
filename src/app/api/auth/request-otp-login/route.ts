import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { otpRequestLoginSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/auth/request-otp-login
 * Vérifie qu'un candidat Prisma existe et provisionne auth.users si besoin (comptes legacy).
 */
export async function POST(request: Request) {
  const rateLimited = checkRateLimit(getClientId(request), "/api/auth/request-otp-login");
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = validate(otpRequestLoginSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = await db.user.findUnique({ where: { email } });

    // Réponse neutre pour éviter l'énumération d'e-mails
    const okBody = {
      success: true as const,
      message: "Si un compte existe, un code OTP va être envoyé.",
    };

    if (!user || user.role !== "CANDIDAT") {
      return NextResponse.json(okBody);
    }

    if (!user.actif) {
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 });
    }

    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const admin = createSupabaseAdminClient();
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            prenom: user.prenom,
            nom: user.nom,
            nationalite: user.nationalite ?? undefined,
          },
        });

        if (createErr) {
          const msg = (createErr.message || "").toLowerCase();
          if (!msg.includes("already") && !msg.includes("registered") && !msg.includes("exists")) {
            console.error("request-otp-login createUser:", createErr);
          }
        } else if (created?.user?.id && !user.supabaseUserId) {
          await db.user
            .update({
              where: { id: user.id },
              data: { supabaseUserId: created.user.id },
            })
            .catch(() => undefined);
        }
      } catch (e) {
        console.warn("request-otp-login admin sync skipped:", e);
      }
    }

    return NextResponse.json({
      ...okBody,
      email,
      prenom: user.prenom,
      nom: user.nom,
    });
  } catch (error) {
    console.error("request-otp-login error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
