/**
 * Source unique de vérité pour la palette de marque et le logo — réutilisée par le générateur
 * PDF (src/lib/pdf/documents.ts), les e-mails transactionnels (src/lib/mail.ts) et les vues HTML
 * imprimables. Valeurs identiques à globals.css : ne rien inventer ici, seulement centraliser.
 */

export const BRAND_COLORS = {
  lapis: "#3CA936",
  lapisClair: "#5BC455",
  or: "#2E8329",
  ambre: "#C77A12",
  carmin: "#C0392B",
  porcelaine: "#F3F4F6",
  ligne: "#E5E7EB",
  encre: "#1A1A1A",
  ardoise: "#6B7280",
  orPale: "#E8F5E7",
  lapisPale: "#EAF7E9",
  ambrePale: "#FCF1E3",
  carminPale: "#FFF2F0",
  blanc: "#FFFFFF",
} as const;

export const BRAND_LOGO = {
  fsPath: "public/images/brand/logo-get-admission.png",
  publicUrl: "/images/brand/logo-get-admission.png",
} as const;

export const APP_NAME = "GET Admission";
