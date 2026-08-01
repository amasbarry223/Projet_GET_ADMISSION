import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { otpEmailHtml, sendMail } from "@/lib/mail";
import {
  API_ERROR_CODES,
  APP_NAME,
  OTP_CODE_MAX_LENGTH,
  OTP_CODE_MIN_LENGTH,
} from "@/shared/constants";

type ProvisionMeta = {
  prenom?: string;
  nom?: string;
  nationalite?: string | null;
};

type SendSuccess = { ok: true; supabaseUserId?: string; channel?: "resend" };
type SendFailure = {
  ok: false;
  error: string;
  code?: string;
  retryAfterSec?: number;
};
type SendResult = SendSuccess | SendFailure;

function parseRetryAfterSec(message: string): number | undefined {
  const match = message.match(/after\s+(\d+)\s+seconds?/i);
  if (match) return Number(match[1]);
  if (/rate limit|security purposes|too many/i.test(message)) return 60;
  return undefined;
}

function isAlreadyRegisteredError(message: string, code?: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already") ||
    normalized.includes("registered") ||
    normalized.includes("exists") ||
    code === "email_exists"
  );
}

function otpPattern(): RegExp {
  return new RegExp(`^\\d{${OTP_CODE_MIN_LENGTH},${OTP_CODE_MAX_LENGTH}}$`);
}

/**
 * Garantit un auth.users confirmé, génère un OTP, l'envoie UNIQUEMENT via Resend.
 * Pas de fallback mailer Supabase (/otp) — évite les 429 « Trop de demandes ».
 */
export async function provisionAndSendEmailOtp(params: {
  email: string;
  prismaUserId?: string;
  meta?: ProvisionMeta;
  redirectTo: string;
}): Promise<SendResult> {
  const email = params.email.toLowerCase().trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      error: "Configuration Supabase Auth incomplète",
      code: API_ERROR_CODES.CONFIG,
    };
  }

  if (!resendApiKey && process.env.NODE_ENV === "production") {
    return {
      ok: false,
      error: "Envoi d'e-mail indisponible (RESEND_API_KEY manquant).",
      code: API_ERROR_CODES.CONFIG,
    };
  }

  const admin = createSupabaseAdminClient();
  let supabaseUserId: string | undefined;

  try {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        prenom: params.meta?.prenom,
        nom: params.meta?.nom,
        nationalite: params.meta?.nationalite ?? undefined,
      },
    });

    if (createError) {
      if (!isAlreadyRegisteredError(createError.message || "", createError.code)) {
        console.error("provision createUser:", createError);
        return {
          ok: false,
          error: createError.message || "Impossible de provisionner l'auth",
          code: createError.code,
        };
      }
    } else {
      supabaseUserId = created.user?.id;
    }
  } catch (error) {
    console.error("provisionAndSendEmailOtp provision:", error);
    return {
      ok: false,
      error: "Erreur lors de la préparation de l'auth",
      code: API_ERROR_CODES.PROVISION,
    };
  }

  // generateLink produit le code sans déclencher l'e-mail Supabase
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: params.redirectTo },
  });

  if (linkError) {
    const retryAfterSec = parseRetryAfterSec(linkError.message || "");
    if (retryAfterSec) {
      return {
        ok: false,
        error: `Patientez ${retryAfterSec} s avant de redemander un code.`,
        code: API_ERROR_CODES.RATE_LIMIT,
        retryAfterSec,
      };
    }
    console.error("generateLink:", linkError);
    return {
      ok: false,
      error: linkError.message || "Impossible de générer le code OTP",
      code: linkError.code || API_ERROR_CODES.GENERATE_LINK,
    };
  }

  const linkedUser = linkData?.user;
  if (linkedUser?.id) {
    supabaseUserId = linkedUser.id;
    if (!linkedUser.email_confirmed_at) {
      await admin.auth.admin
        .updateUserById(linkedUser.id, { email_confirm: true })
        .catch((error) => console.warn("email_confirm update:", error));
    }
  }

  if (params.prismaUserId && supabaseUserId) {
    await db.user
      .update({
        where: { id: params.prismaUserId },
        data: { supabaseUserId },
      })
      .catch(() => undefined);
  }

  const otp = linkData?.properties?.email_otp;
  if (!otp || !otpPattern().test(otp)) {
    return {
      ok: false,
      error: "Code OTP introuvable. Réessayez dans une minute.",
      code: API_ERROR_CODES.NO_OTP,
    };
  }

  const prenom = params.meta?.prenom?.trim() || "candidat";
  const mailed = await sendMail({
    to: email,
    subject: `${otp} — votre code ${APP_NAME}`,
    html: otpEmailHtml(prenom, otp),
    text: `Bonjour ${prenom},\n\nVotre code de vérification ${APP_NAME} est : ${otp}\n\nIl expire dans 1 heure. Ne le partagez avec personne.\n`,
  });

  if (!mailed.ok) {
    console.error("Resend OTP failed:", mailed.error);
    return {
      ok: false,
      error: mailed.error || "Échec de l'envoi du code par e-mail.",
      code: API_ERROR_CODES.MAIL_FAILED,
    };
  }

  return { ok: true, supabaseUserId, channel: "resend" };
}
