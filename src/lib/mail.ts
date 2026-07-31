/**
 * Service e-mail transactionnel (Resend).
 * - Production : RESEND_API_KEY + MAIL_FROM obligatoires.
 * - Développement sans clé : journal console + EmailLog status=logged.
 */

import { db } from "@/lib/db";

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
    <p>Bonjour ${prenom},</p>
    <p>Bienvenue sur <strong>GET Admission</strong>. Veuillez confirmer votre adresse e-mail :</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>Ce lien est valable 48 heures.</p>
  `;
}

export function resetPasswordEmailHtml(prenom: string, resetUrl: string) {
  return `
    <p>Bonjour ${prenom},</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe GET Admission.</p>
    <p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>
    <p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
  `;
}

export function invitationEmailHtml(prenom: string, email: string, password: string) {
  const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/connexion`;
  return `
    <p>Bonjour ${prenom},</p>
    <p>Un compte GET Admission a été créé pour vous.</p>
    <p><strong>E-mail :</strong> ${email}<br/><strong>Mot de passe temporaire :</strong> ${password}</p>
    <p>Connectez-vous puis changez votre mot de passe dès que possible.</p>
    <p><a href="${loginUrl}">Se connecter</a></p>
  `;
}

export function workflowEmailHtml(prenom: string, reference: string, etat: string, note?: string) {
  return `
    <p>Bonjour ${prenom},</p>
    <p>Votre dossier <strong>${reference}</strong> est passé à l'état <strong>${etat}</strong>.</p>
    ${note ? `<p>${note}</p>` : ""}
    <p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/espace">Voir mon espace</a></p>
  `;
}
