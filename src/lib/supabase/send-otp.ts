import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProvisionMeta = {
  prenom?: string;
  nom?: string;
  nationalite?: string | null;
};

type SendResult =
  | { ok: true; supabaseUserId?: string }
  | { ok: false; error: string; code?: string };

/**
 * Garantit un auth.users Supabase, puis envoie magic link / OTP
 * avec create_user=false (évite "Signups not allowed for otp").
 */
export async function provisionAndSendEmailOtp(params: {
  email: string;
  prismaUserId?: string;
  meta?: ProvisionMeta;
  redirectTo: string;
}): Promise<SendResult> {
  const email = params.email.toLowerCase().trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !service) {
    return {
      ok: false,
      error: "Configuration Supabase Auth incomplète",
      code: "CONFIG",
    };
  }

  let supabaseUserId: string | undefined;

  try {
    const admin = createSupabaseAdminClient();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        prenom: params.meta?.prenom,
        nom: params.meta?.nom,
        nationalite: params.meta?.nationalite ?? undefined,
      },
    });

    if (createErr) {
      const msg = (createErr.message || "").toLowerCase();
      const already =
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists") ||
        createErr.code === "email_exists";
      if (!already) {
        console.error("provision createUser:", createErr);
        return {
          ok: false,
          error: createErr.message || "Impossible de provisionner l'auth",
          code: createErr.code,
        };
      }
      // Déjà dans auth.users — l'envoi OTP suffit
    } else {
      supabaseUserId = created.user?.id;
    }

    if (params.prismaUserId && supabaseUserId) {
      await db.user
        .update({
          where: { id: params.prismaUserId },
          data: { supabaseUserId },
        })
        .catch(() => undefined);
    }
  } catch (e) {
    console.error("provisionAndSendEmailOtp provision:", e);
    return { ok: false, error: "Erreur lors de la préparation de l'auth", code: "PROVISION" };
  }

  const supabase = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: params.redirectTo,
    },
  });

  if (otpError) {
    const msg = otpError.message || "Envoi OTP impossible";
    const lower = msg.toLowerCase();
    if (lower.includes("rate limit") || lower.includes("security purposes")) {
      return {
        ok: false,
        error: "Trop de demandes. Réessayez dans une minute (limite e-mail Supabase).",
        code: "RATE_LIMIT",
      };
    }
    return { ok: false, error: msg, code: otpError.code };
  }

  return { ok: true, supabaseUserId };
}
