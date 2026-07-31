/**
 * Service e-mail transactionnel.
 * - Si SMTP_HOST est défini : envoi via fetch vers un webhook SMTP simple (Resend-compatible)
 *   ou log structuré pour intégration ultérieure.
 * - Sinon : journalise en base (EmailLog) + console — adapté au développement local.
 */

import { db } from "@/lib/db";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail(input: SendMailInput): Promise<{ ok: boolean; previewUrl?: string }> {
  const from = process.env.MAIL_FROM || "GET Admission <noreply@getadmission.local>";

  // Persistance pour audit / debug
  try {
    await db.emailLog.create({
      data: {
        to: input.to,
        subject: input.subject,
        body: input.text || input.html.slice(0, 2000),
        status: "queued",
      },
    });
  } catch {
    // schéma peut ne pas encore être poussé
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
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
      const ok = res.ok;
      console.info(`[mail] Resend ${ok ? "OK" : "FAIL"} → ${input.to}: ${input.subject}`);
      return { ok };
    } catch (e) {
      console.error("[mail] Resend error", e);
      return { ok: false };
    }
  }

  // Mode développement : log console avec contenu
  console.info("────────── EMAIL (dev) ──────────");
  console.info(`To: ${input.to}`);
  console.info(`Subject: ${input.subject}`);
  console.info(input.text || input.html);
  console.info("──────────────────────────────────");

  return { ok: true, previewUrl: undefined };
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
