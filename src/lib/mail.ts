/**
 * Service e-mail transactionnel (Resend).
 * - Production : RESEND_API_KEY + MAIL_FROM obligatoires.
 * - Développement sans clé : journal console + EmailLog status=logged.
 */

import { db } from "@/lib/db";
import { escapeHtml } from "@/lib/escape-html";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendMailResult = {
  ok: boolean;
  previewUrl?: string;
  error?: string;
  logId?: number;
};

const DEFAULT_DEV_FROM = "GET Admission <onboarding@resend.dev>";

function resolveFrom(): { from: string; error?: string } {
  const configured = process.env.MAIL_FROM?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (configured) {
    if (/getadmission\.local/i.test(configured) && isProd) {
      return {
        from: configured,
        error:
          "MAIL_FROM utilise un domaine invalide (.local). Configurez un domaine vérifié dans Resend.",
      };
    }
    return { from: configured };
  }

  if (isProd) {
    return {
      from: DEFAULT_DEV_FROM,
      error:
        "MAIL_FROM manquant. Définissez MAIL_FROM avec une adresse d'un domaine vérifié Resend.",
    };
  }

  return { from: DEFAULT_DEV_FROM };
}

async function updateLog(
  logId: number | undefined,
  status: string,
  error?: string | null,
) {
  if (!logId) return;
  try {
    await db.emailLog.update({
      where: { id: logId },
      data: { status, error: error ?? null },
    });
  } catch (e) {
    console.error("[mail] EmailLog update failed", e);
  }
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const isProd = process.env.NODE_ENV === "production";
  const { from, error: fromError } = resolveFrom();

  let logId: number | undefined;
  try {
    const log = await db.emailLog.create({
      data: {
        to: input.to,
        subject: input.subject,
        body: input.text || input.html.slice(0, 2000),
        status: "queued",
      },
    });
    logId = log.id;
  } catch {
    // schéma peut ne pas encore être poussé
  }

  if (fromError && isProd) {
    await updateLog(logId, "failed", fromError);
    console.error(`[mail] ${fromError}`);
    return { ok: false, error: fromError, logId };
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (!resendKey) {
    if (isProd) {
      const err =
        "RESEND_API_KEY manquant. Configurez la clé Resend sur Vercel pour envoyer les e-mails.";
      await updateLog(logId, "failed", err);
      console.error(`[mail] ${err}`);
      return { ok: false, error: err, logId };
    }

    // Mode développement : log console (pas d'envoi réel)
    console.info("────────── EMAIL (dev — non envoyé) ──────────");
    console.info(`From: ${from}`);
    console.info(`To: ${input.to}`);
    console.info(`Subject: ${input.subject}`);
    console.info(input.text || input.html);
    console.info("──────────────────────────────────────────────");
    await updateLog(logId, "logged", "Dev: RESEND_API_KEY absent — e-mail journalisé uniquement");
    return { ok: true, previewUrl: undefined, logId };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
      error?: string | { message?: string };
    };

    if (!res.ok) {
      const errMsg =
        (typeof body.error === "object" && body.error?.message) ||
        body.message ||
        (typeof body.error === "string" ? body.error : null) ||
        `Resend HTTP ${res.status}`;
      console.error(`[mail] Resend FAIL → ${input.to}: ${errMsg}`);
      await updateLog(logId, "failed", errMsg);
      return { ok: false, error: errMsg, logId };
    }

    console.info(`[mail] Resend OK → ${input.to}: ${input.subject} (${body.id ?? "ok"})`);
    await updateLog(logId, "sent");
    return { ok: true, logId };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Erreur réseau Resend";
    console.error("[mail] Resend error", e);
    await updateLog(logId, "failed", errMsg);
    return { ok: false, error: errMsg, logId };
  }
}

export function verificationEmailHtml(prenom: string, verifyUrl: string) {
  return `
    <p>Bonjour ${escapeHtml(prenom)},</p>
    <p>Bienvenue sur <strong>GET Admission</strong>. Veuillez confirmer votre adresse e-mail :</p>
    <p><a href="${escapeHtml(verifyUrl)}">${escapeHtml(verifyUrl)}</a></p>
    <p>Ce lien est valable 48 heures.</p>
  `;
}

/** E-mail OTP 6 chiffres pour inscription / connexion candidat. */
export function otpEmailHtml(prenom: string, code: string) {
  const safeCode = code.replace(/\D/g, "").slice(0, 8);
  return `
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:14px;letter-spacing:0.12em;text-transform:uppercase;color:#5a6a7a">GET Admission</p>
      <h1 style="font-size:22px;font-weight:700;margin:8px 0 16px">Votre code de vérification</h1>
      <p>Bonjour ${escapeHtml(prenom)},</p>
      <p>Saisissez ce code sur la page de vérification pour activer votre compte :</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:0.35em;font-family:ui-monospace,monospace;margin:24px 0;text-align:center">${escapeHtml(safeCode)}</p>
      <p style="font-size:13px;color:#5a6a7a">Ce code expire dans environ 1 heure. Ne le partagez avec personne.</p>
      <p style="font-size:13px;color:#5a6a7a">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
    </div>
  `;
}

export function resetPasswordEmailHtml(prenom: string, resetUrl: string) {
  return `
    <p>Bonjour ${escapeHtml(prenom)},</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe GET Admission.</p>
    <p><a href="${escapeHtml(resetUrl)}">Réinitialiser mon mot de passe</a></p>
    <p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
  `;
}

export function invitationEmailHtml(prenom: string, email: string, password: string) {
  const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/connexion`;
  return `
    <p>Bonjour ${escapeHtml(prenom)},</p>
    <p>Un compte GET Admission a été créé pour vous.</p>
    <p><strong>E-mail :</strong> ${escapeHtml(email)}<br/><strong>Mot de passe temporaire :</strong> ${escapeHtml(password)}</p>
    <p>Connectez-vous puis changez votre mot de passe dès que possible.</p>
    <p><a href="${escapeHtml(loginUrl)}">Se connecter</a></p>
  `;
}

export function workflowEmailHtml(prenom: string, reference: string, etat: string, note?: string) {
  const espaceUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/espace`;
  return `
    <p>Bonjour ${escapeHtml(prenom)},</p>
    <p>Votre dossier <strong>${escapeHtml(reference)}</strong> est passé à l'état <strong>${escapeHtml(etat)}</strong>.</p>
    ${note ? `<p>${escapeHtml(note)}</p>` : ""}
    <p><a href="${escapeHtml(espaceUrl)}">Voir mon espace</a></p>
  `;
}
