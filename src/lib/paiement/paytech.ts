/**
 * Passerelle paiement PayTech (BF-19).
 * Si PAYTECH_API_KEY / PAYTECH_API_SECRET absents → mode déclaration (fallback).
 */

import { createHash, timingSafeEqual } from "node:crypto";

export type InitiatePaymentInput = {
  reference: string;
  montant: number;
  libelle: string;
  successUrl: string;
  cancelUrl: string;
  ipnUrl: string;
  /** Email / téléphone client optionnels */
  customerEmail?: string | null;
  customerPhone?: string | null;
  customField?: string;
};

export type InitiatePaymentResult =
  | { ok: true; mode: "paytech"; redirectUrl: string; token?: string }
  | { ok: true; mode: "declaration" }
  | { ok: false; error: string };

export function isPaytechConfigured(): boolean {
  return Boolean(
    process.env.PAYTECH_API_KEY?.trim() && process.env.PAYTECH_API_SECRET?.trim(),
  );
}

export async function initiatePaytechPayment(
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  const apiKey = process.env.PAYTECH_API_KEY?.trim();
  const apiSecret = process.env.PAYTECH_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    return { ok: true, mode: "declaration" };
  }

  const base =
    process.env.PAYTECH_API_URL?.trim() || "https://paytech.sn/api/payment/request-payment";

  try {
    const body = new URLSearchParams({
      item_name: input.libelle.slice(0, 100),
      item_price: String(input.montant),
      currency: "XOF",
      ref_command: input.reference,
      command_name: input.libelle.slice(0, 100),
      ipn_url: input.ipnUrl,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      env: process.env.PAYTECH_ENV?.trim() || "test",
      custom_field: input.customField ?? input.reference,
    });
    if (input.customerEmail) body.set("target_payment", "Orange Money,Wave,Free Money,Carte Bancaire");

    const res = await fetch(base, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        API_KEY: apiKey,
        API_SECRET: apiSecret,
      },
      body,
    });

    const data = (await res.json().catch(() => ({}))) as {
      success?: number | boolean;
      redirect_url?: string;
      redirectUrl?: string;
      token?: string;
      message?: string;
      error?: string;
    };

    const redirectUrl = data.redirect_url || data.redirectUrl;
    const success = data.success === 1 || data.success === true;
    if (!res.ok || !success || !redirectUrl) {
      return {
        ok: false,
        error: data.message || data.error || "Impossible d'initier le paiement PayTech",
      };
    }

    return {
      ok: true,
      mode: "paytech",
      redirectUrl,
      ...(data.token !== undefined ? { token: data.token } : {}),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erreur réseau PayTech",
    };
  }
}

/**
 * Vérifie qu'une notification IPN provient bien de PayTech : compare les
 * hachages SHA256 de nos clés (api_key_sha256 / api_secret_sha256) à ceux
 * fournis dans la notification — cf. https://docs.intech.sn/doc_paytech.php.
 * Sans cette vérification, n'importe qui pourrait forger un appel IPN.
 */
export function verifyPaytechIpn(payload: Record<string, unknown>): {
  ok: boolean;
  reference: string;
  success: boolean;
} {
  const reference = String(payload.ref_command || payload.custom_field || "");
  const typeEvent = String(payload.type_event || payload.type || "").toLowerCase();
  const success = typeEvent === "sale_complete";

  const apiKey = process.env.PAYTECH_API_KEY?.trim();
  const apiSecret = process.env.PAYTECH_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    return { ok: false, reference, success: false };
  }

  const expectedKeyHash = createHash("sha256").update(apiKey).digest("hex");
  const expectedSecretHash = createHash("sha256").update(apiSecret).digest("hex");
  const keyHash = String(payload.api_key_sha256 || "");
  const secretHash = String(payload.api_secret_sha256 || "");

  const authentic =
    keyHash.length === expectedKeyHash.length &&
    secretHash.length === expectedSecretHash.length &&
    timingSafeEqual(Buffer.from(keyHash), Buffer.from(expectedKeyHash)) &&
    timingSafeEqual(Buffer.from(secretHash), Buffer.from(expectedSecretHash));

  if (!authentic) {
    return { ok: false, reference, success: false };
  }

  return { ok: Boolean(reference), reference, success };
}
