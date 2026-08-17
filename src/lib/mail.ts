import { escapeHtml } from "@/lib/escape-html";
import { BRAND_COLORS } from "@/lib/brand";

export type SendMailAttachment = {
  filename: string;
  /** Contenu encodé en base64 */
  content: string;
};

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: SendMailAttachment[];
};

export type SendMailResult = {
  ok: boolean;
  previewUrl?: string;
  error?: string;
  logId?: number;
};

export async function sendMail(_input: SendMailInput): Promise<SendMailResult> {
  // Envois d'e-mails désactivés dans tout le système (mode 100% in-app & messagerie)
  return { ok: true };
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
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;color:${BRAND_COLORS.encre}">
      <p style="font-size:14px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND_COLORS.ardoise}">GET Admission</p>
      <h1 style="font-size:22px;font-weight:700;margin:8px 0 16px">Votre code de vérification</h1>
      <p>Bonjour ${escapeHtml(prenom)},</p>
      <p>Saisissez ce code sur la page de vérification pour activer votre compte :</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:0.35em;font-family:ui-monospace,monospace;margin:24px 0;text-align:center">${escapeHtml(safeCode)}</p>
      <p style="font-size:13px;color:${BRAND_COLORS.ardoise}">Ce code expire dans environ 1 heure. Ne le partagez avec personne.</p>
      <p style="font-size:13px;color:${BRAND_COLORS.ardoise}">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
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

/** E-mail de reçu envoyé après confirmation d'un paiement — logo en en-tête, récapitulatif structuré. */
export function receiptEmailHtml(opts: {
  prenom: string;
  reference: string;
  montantLabel: string;
  dateStr: string;
  dossierRef?: string;
  recuUrl: string;
  logoUrl: string;
}) {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:7px 0;border-bottom:1px solid ${BRAND_COLORS.porcelaine};color:${BRAND_COLORS.ardoise};font-size:13px">${escapeHtml(label)}</td>
      <td style="padding:7px 0;border-bottom:1px solid ${BRAND_COLORS.porcelaine};color:${BRAND_COLORS.encre};font-size:13px;font-weight:600;text-align:right">${value}</td>
    </tr>`;

  return `
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:${BRAND_COLORS.encre};background:${BRAND_COLORS.blanc}">
      <table role="presentation" width="100%" style="border-bottom:2px solid ${BRAND_COLORS.lapis};padding-bottom:18px;margin-bottom:24px">
        <tr><td align="center">
          <img src="${escapeHtml(opts.logoUrl)}" alt="GET Admission" height="36" style="height:36px;width:auto;display:inline-block" />
        </td></tr>
      </table>

      <p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND_COLORS.ardoise};margin:0 0 6px">Reçu de paiement</p>
      <h1 style="font-size:21px;font-weight:700;margin:0 0 18px;color:${BRAND_COLORS.encre}">Paiement confirmé</h1>
      <p style="font-size:14px">Bonjour ${escapeHtml(opts.prenom)},</p>
      <p style="font-size:14px">Votre paiement a bien été confirmé. Voici le récapitulatif :</p>

      <table role="presentation" width="100%" style="border:1px solid ${BRAND_COLORS.ligne};border-radius:8px;padding:4px 18px;margin:20px 0">
        ${row("Référence", `<span style="font-family:ui-monospace,monospace">${escapeHtml(opts.reference)}</span>`)}
        ${row("Date", escapeHtml(opts.dateStr))}
        ${opts.dossierRef ? row("Dossier", `<span style="font-family:ui-monospace,monospace">${escapeHtml(opts.dossierRef)}</span>`) : ""}
      </table>

      <table role="presentation" width="100%" style="background:${BRAND_COLORS.orPale};border:1px solid ${BRAND_COLORS.or};border-radius:8px;margin:16px 0">
        <tr>
          <td style="padding:14px 18px;color:${BRAND_COLORS.or};font-weight:700;font-size:13px">Montant payé</td>
          <td style="padding:14px 18px;color:${BRAND_COLORS.or};font-weight:700;font-size:18px;text-align:right;font-family:ui-monospace,monospace">${escapeHtml(opts.montantLabel)}</td>
        </tr>
      </table>

      <table role="presentation" width="100%" style="margin:26px 0">
        <tr><td align="center">
          <a href="${escapeHtml(opts.recuUrl)}" style="display:inline-block;background:${BRAND_COLORS.or};color:${BRAND_COLORS.blanc};text-decoration:none;font-weight:600;font-size:14px;padding:12px 30px;border-radius:6px">Télécharger le reçu (PDF)</a>
        </td></tr>
      </table>

      <p style="font-size:11px;color:${BRAND_COLORS.ardoise};text-align:center;margin-top:28px;border-top:1px solid ${BRAND_COLORS.porcelaine};padding-top:14px">GET Admission · Confidentiel — document généré électroniquement.</p>
    </div>
  `;
}

/** E-mail de félicitations envoyé quand l'université accorde la préinscription et que l'attestation est disponible. */
export function attestationEmiseEmailHtml(opts: {
  prenom: string;
  reference: string;
  universite: string;
  formation: string;
  espaceUrl: string;
  logoUrl: string;
}) {
  return `
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:${BRAND_COLORS.encre};background:${BRAND_COLORS.blanc}">
      <table role="presentation" width="100%" style="border-bottom:2px solid ${BRAND_COLORS.lapis};padding-bottom:18px;margin-bottom:24px">
        <tr><td align="center">
          <img src="${escapeHtml(opts.logoUrl)}" alt="GET Admission" height="36" style="height:36px;width:auto;display:inline-block" />
        </td></tr>
      </table>

      <p style="font-size:32px;text-align:center;margin:0 0 8px">🎉</p>
      <h1 style="font-size:23px;font-weight:700;margin:0 0 18px;text-align:center;color:${BRAND_COLORS.or}">Félicitations, ${escapeHtml(opts.prenom)} !</h1>
      <p style="font-size:14px;text-align:center">
        <strong>${escapeHtml(opts.universite)}</strong> a accordé votre préinscription pour la formation
        <strong>${escapeHtml(opts.formation)}</strong>.
      </p>
      <p style="font-size:14px;text-align:center">
        Votre attestation de préinscription (dossier ${escapeHtml(opts.reference)}) est disponible dans votre
        espace candidat.
      </p>

      <table role="presentation" width="100%" style="margin:26px 0">
        <tr><td align="center">
          <a href="${escapeHtml(opts.espaceUrl)}" style="display:inline-block;background:${BRAND_COLORS.or};color:${BRAND_COLORS.blanc};text-decoration:none;font-weight:600;font-size:14px;padding:12px 30px;border-radius:6px">Voir mon attestation</a>
        </td></tr>
      </table>

      <p style="font-size:11px;color:${BRAND_COLORS.ardoise};text-align:center;margin-top:28px;border-top:1px solid ${BRAND_COLORS.porcelaine};padding-top:14px">GET Admission · Toute l'équipe vous félicite pour cette étape.</p>
    </div>
  `;
}

/** E-mail de partage d'une demande CROUS — message libre de l'expéditeur + liste des pièces jointes. */
export function crousPartageEmailHtml(opts: {
  message: string;
  dossierRef: string;
  candidat: string;
  labelsPieces: string[];
  logoUrl: string;
}) {
  return `
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:${BRAND_COLORS.encre};background:${BRAND_COLORS.blanc}">
      <table role="presentation" width="100%" style="border-bottom:2px solid ${BRAND_COLORS.lapis};padding-bottom:18px;margin-bottom:24px">
        <tr><td align="center">
          <img src="${escapeHtml(opts.logoUrl)}" alt="GET Admission" height="36" style="height:36px;width:auto;display:inline-block" />
        </td></tr>
      </table>

      <p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND_COLORS.ardoise};margin:0 0 6px">Demande CROUS</p>
      <h1 style="font-size:21px;font-weight:700;margin:0 0 18px;color:${BRAND_COLORS.encre}">Dossier ${escapeHtml(opts.dossierRef)} — ${escapeHtml(opts.candidat)}</h1>

      <div style="font-size:14px;white-space:pre-wrap;margin-bottom:20px">${escapeHtml(opts.message)}</div>

      ${
        opts.labelsPieces.length
          ? `<p style="font-size:12px;color:${BRAND_COLORS.ardoise};margin:0 0 6px">Pièces jointes :</p>
             <ul style="font-size:13px;color:${BRAND_COLORS.encre};margin:0 0 20px;padding-left:18px">
               ${opts.labelsPieces.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}
             </ul>`
          : ""
      }

      <p style="font-size:11px;color:${BRAND_COLORS.ardoise};text-align:center;margin-top:28px;border-top:1px solid ${BRAND_COLORS.porcelaine};padding-top:14px">GET Admission · Confidentiel — document généré électroniquement.</p>
    </div>
  `;
}

export function logementCorrectionEmailHtml(prenom: string, motif: string) {
  const logementUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/espace/logement`;
  return `
    <p>Bonjour ${escapeHtml(prenom)},</p>
    <p>Une correction est nécessaire sur votre demande de réservation de logement :</p>
    <p style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:12px 14px;color:${BRAND_COLORS.encre}">${escapeHtml(motif)}</p>
    <p><a href="${escapeHtml(logementUrl)}">Corriger ma demande</a></p>
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
