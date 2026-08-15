/**
 * Passerelle de paiement GeniusPay pour le projet Tonomi (GET Admission).
 * Documentation API Marchand GeniusPay (Wave, Orange Money, MTN Money, Cartes).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type GeniusPayInitiateInput = {
  reference: string;
  montant: number;
  libelle: string;
  successUrl: string;
  cancelUrl: string;
  ipnUrl?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  paymentMethod?: "wave" | "orange_money" | "mtn_money" | "card" | string;
  customField?: string;
};

export type GeniusPayInitiateResult =
  | { ok: true; mode: "geniuspay"; redirectUrl: string; reference: string; id?: string | number | undefined }
  | { ok: true; mode: "declaration" }
  | { ok: false; error: string };

export function isGeniusPayConfigured(): boolean {
  return Boolean(
    process.env.GENIUSPAY_API_KEY?.trim() && process.env.GENIUSPAY_API_SECRET?.trim()
  );
}

/**
 * Initie un paiement auprès de l'API Marchand GeniusPay.
 * En l'absence de paymentMethod, GeniusPay redirige vers sa page de checkout sécurisée.
 */
export async function initiateGeniusPayPayment(
  input: GeniusPayInitiateInput
): Promise<GeniusPayInitiateResult> {
  const apiKey = process.env.GENIUSPAY_API_KEY?.trim();
  const apiSecret = process.env.GENIUSPAY_API_SECRET?.trim();

  if (!apiKey || !apiSecret) {
    return { ok: true, mode: "declaration" };
  }

  let baseUrl = (
    process.env.GENIUSPAY_API_URL?.trim() || "https://geniuspay.ci/api/v1/merchant"
  ).replace(/\/$/, "");

  if (baseUrl.startsWith("http://")) {
    baseUrl = baseUrl.replace(/^http:\/\//, "https://");
  }

  try {
    const payload: Record<string, unknown> = {
      amount: input.montant,
      currency: "XOF",
      description: input.libelle.slice(0, 500),
      success_url: input.successUrl,
      error_url: input.cancelUrl,
      customer: {
        ...(input.customerName ? { name: input.customerName } : {}),
        ...(input.customerEmail ? { email: input.customerEmail } : {}),
        ...(input.customerPhone ? { phone: input.customerPhone } : {}),
      },
      metadata: {
        order_id: input.reference,
        paiementId: input.customField ?? input.reference,
      },
    };

    if (input.paymentMethod) {
      payload.payment_method = input.paymentMethod;
    }

    const res = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-API-Secret": apiSecret,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let body: {
      success?: boolean;
      message?: string;
      error?: string;
      data?: {
        id?: number | string;
        reference?: string;
        checkout_url?: string;
        payment_url?: string;
        status?: string;
      };
    } = {};

    try {
      body = JSON.parse(text);
    } catch {
      if (res.status >= 500) {
        return {
          ok: false,
          error: "Le serveur GeniusPay rencontre un problème technique temporaire (Erreur 500). Veuillez réessayer dans quelques instants.",
        };
      }
    }

    const redirectUrl = body?.data?.checkout_url || body?.data?.payment_url;

    if (!res.ok || !body.success || !redirectUrl) {
      return {
        ok: false,
        error:
          body.message ||
          body.error ||
          (res.status >= 500
            ? "Le serveur GeniusPay est temporairement indisponible."
            : "Impossible d'initier le paiement GeniusPay. Vérifiez vos clés API et la configuration."),
      };
    }

    return {
      ok: true,
      mode: "geniuspay",
      redirectUrl,
      reference: body.data?.reference || input.reference,
      ...(body.data?.id != null ? { id: body.data.id } : {}),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erreur réseau lors du paiement GeniusPay",
    };
  }
}

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook reçu de GeniusPay.
 */
export function verifyGeniusPaySignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.GENIUSPAY_WEBHOOK_SECRET || process.env.GENIUSPAY_API_SECRET;
  if (!webhookSecret || !signatureHeader) return false;

  try {
    const expectedSignature = createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signatureHeader);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
