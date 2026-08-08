/**
 * Génération de PDF de marque (reçus, pièces, fiches, listings) avec pdf-lib.
 * Palette alignée sur l'identité visuelle GET Admission (globals.css) : filet vert,
 * wordmark en en-tête.
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { BRAND_COLORS, BRAND_LOGO } from "@/lib/brand";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

const COLOR = {
  encre: hexToRgb(BRAND_COLORS.encre),
  ardoise: hexToRgb(BRAND_COLORS.ardoise),
  lapis: hexToRgb(BRAND_COLORS.lapis),
  lapisPale: hexToRgb(BRAND_COLORS.lapisPale),
  or: hexToRgb(BRAND_COLORS.or),
  orPale: hexToRgb(BRAND_COLORS.orPale),
  ambre: hexToRgb(BRAND_COLORS.ambre),
  ambrePale: hexToRgb(BRAND_COLORS.ambrePale),
  porcelaine: hexToRgb(BRAND_COLORS.porcelaine),
  ligne: hexToRgb(BRAND_COLORS.ligne),
  carmin: hexToRgb(BRAND_COLORS.carmin),
  carminPale: hexToRgb(BRAND_COLORS.carminPale),
  blanc: hexToRgb(BRAND_COLORS.blanc),
};

let logoBytesPromise: Promise<Uint8Array> | null = null;
function loadLogoBytes(): Promise<Uint8Array> {
  if (!logoBytesPromise) {
    logoBytesPromise = readFile(path.join(process.cwd(), BRAND_LOGO.fsPath));
  }
  return logoBytesPromise;
}

// Lettres "en exposant" (ordinaux français 1ʳᵉ, 2ᵉ, 10ᵉ… générés par pieces-requises.ts) que la
// police standard WinAnsi de pdf-lib ne sait pas encoder — widthOfTextAtSize/drawText lèvent une
// exception synchrone non rattrapable sinon, ce qui interrompait toute la génération du PDF
// (bug "Télécharger tout" : le PDF ne se terminait jamais, sans message d'erreur côté client).
const SUPERSCRIPT_TO_BASE: Record<string, string> = {
  "ᵃ": "a", "ᵇ": "b", "ᶜ": "c", "ᵈ": "d", "ᵉ": "e", "ᶠ": "f", "ᵍ": "g", "ʰ": "h", "ⁱ": "i", "ʲ": "j",
  "ᵏ": "k", "ˡ": "l", "ᵐ": "m", "ⁿ": "n", "ᵒ": "o", "ᵖ": "p", "ʳ": "r", "ˢ": "s", "ᵗ": "t", "ᵘ": "u",
  "ᵛ": "v", "ʷ": "w", "ˣ": "x", "ʸ": "y", "ᶻ": "z",
};
// Ponctuation "typographique" déjà couverte par l'encodage WinAnsi (CP1252) de pdf-lib.
const WINANSI_EXTRA_PUNCTUATION = "–—‘’“”…•™";
// Espaces Unicode "spéciales" (ex. U+202F utilisée par Intl.NumberFormat("fr-FR") comme séparateur
// de milliers dans formatFCFA/formatEUR) — hors WinAnsi, mais doivent rester un espace visible
// plutôt que d'être supprimées (sinon "110 000 FCFA" devient l'illisible "110000FCFA").
const UNICODE_SPACES_TO_ASCII = "\u00a0\u2007\u2009\u202f\u2060"; // NBSP, figure, thin, narrow-NBSP, word-joiner

/** Ramène tout caractère non encodable par la police standard WinAnsi à un équivalent sûr. */
function sanitizeForPdf(text: string): string {
  let out = "";
  for (const ch of text) {
    if ((ch.codePointAt(0) ?? 0) <= 0xff || WINANSI_EXTRA_PUNCTUATION.includes(ch)) {
      out += ch;
    } else if (UNICODE_SPACES_TO_ASCII.includes(ch)) {
      out += " ";
    } else {
      out += SUPERSCRIPT_TO_BASE[ch] ?? "";
    }
  }
  return out;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitizeForPdf(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * En-tête de marque : logo + filet vert, avec en plus (documents destinés au candidat, ex. reçu)
 * le nom de l'agence et ses coordonnées alignés à droite du logo. Retourne le curseur Y sous le filet.
 */
async function drawBrandHeader(
  pdfDoc: PDFDocument,
  page: PDFPage,
  opts?: {
    regular: PDFFont;
    bold: PDFFont;
    contact?: { email?: string | null | undefined; telephone?: string | null | undefined };
  },
): Promise<number> {
  const logoBytes = await loadLogoBytes();
  const logoImage = await pdfDoc.embedPng(logoBytes);
  const logoWidth = 138;
  const logoHeight = logoWidth * (logoImage.height / logoImage.width);
  const top = PAGE_HEIGHT - MARGIN;

  page.drawImage(logoImage, {
    x: MARGIN,
    y: top - logoHeight,
    width: logoWidth,
    height: logoHeight,
  });

  if (opts) {
    const rightEdge = PAGE_WIDTH - MARGIN;
    const nom = "GET Admission";
    const nomWidth = opts.bold.widthOfTextAtSize(nom, 12);
    page.drawText(nom, { x: rightEdge - nomWidth, y: top - 12, size: 12, font: opts.bold, color: COLOR.encre });

    const tagline = "Agence d'admission universitaire";
    const taglineWidth = opts.regular.widthOfTextAtSize(tagline, 8.5);
    page.drawText(tagline, {
      x: rightEdge - taglineWidth,
      y: top - 25,
      size: 8.5,
      font: opts.regular,
      color: COLOR.ardoise,
    });

    const coordonnees = sanitizeForPdf(
      [opts.contact?.email, opts.contact?.telephone].filter(Boolean).join("  ·  "),
    );
    if (coordonnees) {
      const coordWidth = opts.regular.widthOfTextAtSize(coordonnees, 8.5);
      page.drawText(coordonnees, {
        x: rightEdge - coordWidth,
        y: top - 37,
        size: 8.5,
        font: opts.regular,
        color: COLOR.ardoise,
      });
    }
  }

  const ruleY = top - logoHeight - 16;
  page.drawLine({
    start: { x: MARGIN, y: ruleY },
    end: { x: PAGE_WIDTH - MARGIN, y: ruleY },
    thickness: 1.4,
    color: COLOR.lapis,
  });

  return ruleY;
}

function drawFooterLine(page: PDFPage, regular: PDFFont, text: string) {
  const footerY = MARGIN + 16;
  page.drawLine({
    start: { x: MARGIN, y: footerY + 14 },
    end: { x: PAGE_WIDTH - MARGIN, y: footerY + 14 },
    thickness: 0.5,
    color: COLOR.ligne,
  });
  const line = wrapText(text, regular, 8, CONTENT_WIDTH)[0] ?? text;
  page.drawText(line, { x: MARGIN, y: footerY, size: 8, font: regular, color: COLOR.ardoise });
}

/**
 * Numérote et dessine les pieds de page ("… · Page X sur Y") en une seule passe finale, une fois
 * tout le contenu du document généré — pdfDoc.getPageCount()/getPages() ne sont fiables qu'à ce
 * moment-là (avant, les pages restant à ajouter ne sont pas encore comptées).
 */
function stampFooters(
  pdfDoc: PDFDocument,
  regular: PDFFont,
  entries: { index: number; text: string }[],
) {
  const total = pdfDoc.getPageCount();
  const pages = pdfDoc.getPages();
  for (const { index, text } of entries) {
    const page = pages[index];
    if (!page) continue;
    drawFooterLine(page, regular, `${text} · Page ${index + 1} sur ${total}`);
  }
}

function drawInfoBox(
  page: PDFPage,
  opts: {
    topY: number;
    bold: PDFFont;
    regular: PDFFont;
    rows: [string, string][];
  },
): number {
  const rowHeight = 22;
  const boxHeight = opts.rows.length * rowHeight + 16;
  page.drawRectangle({
    x: MARGIN,
    y: opts.topY - boxHeight,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: COLOR.porcelaine,
    borderColor: COLOR.ligne,
    borderWidth: 1,
  });
  let rowY = opts.topY - 20;
  for (const [label, value] of opts.rows) {
    page.drawText(label.toUpperCase(), {
      x: MARGIN + 14,
      y: rowY,
      size: 7.5,
      font: opts.bold,
      color: COLOR.ardoise,
    });
    page.drawText(sanitizeForPdf(value), {
      x: MARGIN + 190,
      y: rowY,
      size: 10,
      font: opts.regular,
      color: COLOR.encre,
    });
    rowY -= rowHeight;
  }
  return opts.topY - boxHeight;
}

export type ReceiptDocInput = {
  reference: string;
  dateStr: string;
  candidat: string;
  email: string;
  dossierRef: string;
  universite: string;
  typeEtablissementLabel: string;
  formation: string;
  fraisAgenceLabel: string;
  moyenLabel: string;
  statutLabel: string;
  montantLabel: string;
  generatedAtStr: string;
  emailContact?: string | null | undefined;
  telephoneContact?: string | null | undefined;
};

/** Petit intitulé de section (ex. "CANDIDAT", "PAIEMENT") au-dessus d'un drawInfoBox. */
function drawSectionLabel(page: PDFPage, opts: { text: string; y: number; bold: PDFFont }): number {
  page.drawText(opts.text.toUpperCase(), {
    x: MARGIN,
    y: opts.y,
    size: 9,
    font: opts.bold,
    color: COLOR.or,
  });
  return opts.y - 16;
}

export async function buildReceiptPdfBuffer(input: ReceiptDocInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Reçu ${input.reference}`);
  pdfDoc.setAuthor("GET Admission");
  pdfDoc.setSubject("Reçu de paiement");

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let cursorY =
    (await drawBrandHeader(pdfDoc, page, {
      regular,
      bold,
      contact: { email: input.emailContact, telephone: input.telephoneContact },
    })) - 34;

  page.drawText("Reçu de paiement", { x: MARGIN, y: cursorY, size: 21, font: bold, color: COLOR.or });
  cursorY -= 18;
  page.drawText(`Référence ${input.reference}`, {
    x: MARGIN,
    y: cursorY,
    size: 10.5,
    font: regular,
    color: COLOR.ardoise,
  });
  cursorY -= 34;

  cursorY = drawSectionLabel(page, { text: "Candidat & dossier", y: cursorY, bold });
  cursorY = drawInfoBox(page, {
    topY: cursorY,
    bold,
    regular,
    rows: [
      ["Candidat", input.candidat],
      ["E-mail", input.email],
      ["Dossier", input.dossierRef],
      ["Université", input.universite],
      ["Type d'établissement", input.typeEtablissementLabel],
      ["Formation", input.formation],
    ],
  });
  cursorY -= 26;

  cursorY = drawSectionLabel(page, { text: "Paiement", y: cursorY, bold });
  cursorY = drawInfoBox(page, {
    topY: cursorY,
    bold,
    regular,
    rows: [
      ["Date", input.dateStr],
      ["Frais d'agence (référence)", input.fraisAgenceLabel],
      ["Moyen de paiement", input.moyenLabel],
      ["Statut", input.statutLabel],
    ],
  });
  cursorY -= 20;

  const totalHeight = 40;
  page.drawRectangle({
    x: MARGIN,
    y: cursorY - totalHeight,
    width: CONTENT_WIDTH,
    height: totalHeight,
    color: COLOR.orPale,
    borderColor: COLOR.or,
    borderWidth: 1,
  });
  page.drawText("MONTANT PAYÉ", {
    x: MARGIN + 14,
    y: cursorY - totalHeight / 2 - 4,
    size: 9,
    font: bold,
    color: COLOR.or,
  });
  const montantLabelSafe = sanitizeForPdf(input.montantLabel);
  const montantWidth = bold.widthOfTextAtSize(montantLabelSafe, 16);
  page.drawText(montantLabelSafe, {
    x: PAGE_WIDTH - MARGIN - 14 - montantWidth,
    y: cursorY - totalHeight / 2 - 6,
    size: 16,
    font: bold,
    color: COLOR.or,
  });

  stampFooters(pdfDoc, regular, [
    {
      index: 0,
      text: `GET Admission · Confidentiel — document généré électroniquement le ${input.generatedAtStr}.`,
    },
  ]);

  return pdfDoc.save();
}

/* --------------------------- Compilation des pièces d'un dossier --------------------------- */

const PIECE_STATUT_LABEL: Record<string, string> = {
  manquante: "Manquante",
  televersee: "Téléversée",
  a_corriger: "À corriger",
  validee: "Validée",
};

/** Couleurs alignées sur les badges de statut de l'écran « Pièces du dossier » (dossier-detail-client). */
const PIECE_STATUT_COLOR: Record<string, { text: ReturnType<typeof rgb>; bg: ReturnType<typeof rgb> }> = {
  manquante: { text: COLOR.carmin, bg: COLOR.carminPale },
  televersee: { text: COLOR.lapis, bg: COLOR.lapisPale },
  a_corriger: { text: COLOR.ambre, bg: COLOR.ambrePale },
  validee: { text: COLOR.or, bg: COLOR.orPale },
};

const PIECE_CATEGORIE_LABEL: Record<string, string> = {
  academique: "Académique",
  identite: "Identité",
  justificatif: "Justificatif",
  complementaire: "Complémentaire",
};

export type PieceDossierInput = {
  libelle: string;
  statut: string;
  /** academique | identite | justificatif | complementaire */
  categorie: string;
  /** Taille lisible déjà formatée (ex. "5.8 Mo"), null si inconnue */
  taille: string | null;
  /** Date de téléversement déjà formatée (ex. "7 août 2026"), null si jamais téléversée */
  dateTeleversementStr: string | null;
  /** null si aucun fichier téléversé ou fichier illisible */
  buffer: Buffer | null;
  /** "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | null */
  contentType: string | null;
};

export type PiecesDossierDocInput = {
  dossierRef: string;
  candidat: string;
  generatedAtStr: string;
  generatedBy: string;
  pieces: PieceDossierInput[];
};

async function embedAnyImage(pdfDoc: PDFDocument, buffer: Buffer, contentType: string | null) {
  if (contentType === "image/png") return pdfDoc.embedPng(buffer);
  if (contentType === "image/jpeg" || contentType === "image/jpg") return pdfDoc.embedJpg(buffer);
  // WEBP (ou type non identifié) — pdf-lib ne l'embarque pas nativement : conversion PNG via sharp
  const { default: sharp } = await import("sharp");
  const pngBuffer = await sharp(buffer).png().toBuffer();
  return pdfDoc.embedPng(pngBuffer);
}

/** Pastille de statut (fond teinté + texte), largeur ajustée au libellé — même esprit que le Badge front-end. */
function drawStatusChip(
  page: PDFPage,
  opts: { label: string; font: PDFFont; rightEdgeX: number; y: number; color: { text: ReturnType<typeof rgb>; bg: ReturnType<typeof rgb> } },
): void {
  const paddingX = 9;
  const height = 18;
  const textWidth = opts.font.widthOfTextAtSize(opts.label.toUpperCase(), 8);
  const chipWidth = textWidth + paddingX * 2;
  const x = opts.rightEdgeX - chipWidth;
  page.drawRectangle({
    x,
    y: opts.y,
    width: chipWidth,
    height,
    color: opts.color.bg,
    borderColor: opts.color.text,
    borderWidth: 0.75,
  });
  page.drawText(opts.label.toUpperCase(), {
    x: x + paddingX,
    y: opts.y + 5.5,
    size: 8,
    font: opts.font,
    color: opts.color.text,
  });
}

/**
 * Petite « carte » statistique (libellé + valeur) utilisée en rangée sous le titre d'une pièce —
 * reprend le motif carte/porcelaine déjà utilisé sur le reste des documents de marque.
 */
function drawStatCard(
  page: PDFPage,
  opts: { x: number; y: number; width: number; height: number; label: string; value: string; bold: PDFFont; regular: PDFFont },
): void {
  page.drawRectangle({
    x: opts.x,
    y: opts.y - opts.height,
    width: opts.width,
    height: opts.height,
    color: COLOR.porcelaine,
    borderColor: COLOR.ligne,
    borderWidth: 1,
  });
  page.drawText(opts.label.toUpperCase(), {
    x: opts.x + 12,
    y: opts.y - 18,
    size: 7,
    font: opts.bold,
    color: COLOR.ardoise,
  });
  for (const line of wrapText(opts.value, opts.regular, 10.5, opts.width - 24).slice(0, 2)) {
    page.drawText(line, { x: opts.x + 12, y: opts.y - 34, size: 10.5, font: opts.regular, color: COLOR.encre });
    break; // une carte reste sur une ligne : le texte long est déjà tronqué en amont (taille fixe)
  }
}

/**
 * Page de titre dédiée à une pièce, avant le fichier qui la compose (BF « chaque page = titre +
 * fichier correspondant ») : statut, catégorie, taille et date de téléversement affichés dans le
 * même esprit que la liste « Pièces du dossier » côté écran, pour qu'un lecteur retrouve les mêmes
 * repères que dans l'application.
 */
async function drawPieceCoverPage(
  pdfDoc: PDFDocument,
  bold: PDFFont,
  regular: PDFFont,
  opts: {
    dossierRef: string;
    title: string;
    index: number;
    total: number;
    categorie: string;
    taille: string | null;
    dateTeleversementStr: string | null;
    statut: string;
    statutLabel: string;
    note?: string;
  },
): Promise<PDFPage> {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const statutColor = PIECE_STATUT_COLOR[opts.note ? "manquante" : opts.statut] ?? PIECE_STATUT_COLOR.manquante!;

  let cursorY = (await drawBrandHeader(pdfDoc, page)) - 30;

  // Eyebrow : compteur à gauche, pastille de statut à droite, sur la même ligne.
  page.drawText(`DOCUMENT ${opts.index} SUR ${opts.total}`, {
    x: MARGIN,
    y: cursorY,
    size: 9,
    font: bold,
    color: COLOR.ardoise,
  });
  drawStatusChip(page, {
    label: opts.statutLabel,
    font: bold,
    rightEdgeX: PAGE_WIDTH - MARGIN,
    y: cursorY - 4,
    color: statutColor,
  });
  cursorY -= 34;

  for (const line of wrapText(opts.title, bold, 23, CONTENT_WIDTH)) {
    page.drawText(line, { x: MARGIN, y: cursorY, size: 23, font: bold, color: COLOR.encre });
    cursorY -= 28;
  }
  cursorY -= 6;
  page.drawLine({
    start: { x: MARGIN, y: cursorY },
    end: { x: PAGE_WIDTH - MARGIN, y: cursorY },
    thickness: 1.4,
    color: COLOR.lapis,
  });
  cursorY -= 26;

  const cardGap = 14;
  const cardWidth = (CONTENT_WIDTH - cardGap * 2) / 3;
  const cardHeight = 44;
  const cards: [string, string][] = [
    ["Catégorie", PIECE_CATEGORIE_LABEL[opts.categorie] ?? opts.categorie],
    ["Taille du fichier", opts.taille ?? "—"],
    ["Téléversée le", opts.dateTeleversementStr ?? "—"],
  ];
  cards.forEach(([label, value], i) => {
    drawStatCard(page, {
      x: MARGIN + i * (cardWidth + cardGap),
      y: cursorY,
      width: cardWidth,
      height: cardHeight,
      label,
      value: sanitizeForPdf(value),
      bold,
      regular,
    });
  });
  cursorY -= cardHeight + 28;

  if (opts.note) {
    const boxHeight = 32;
    page.drawRectangle({
      x: MARGIN,
      y: cursorY - boxHeight,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: COLOR.carminPale,
      borderColor: COLOR.carmin,
      borderWidth: 0.75,
    });
    page.drawText(opts.note, {
      x: MARGIN + 12,
      y: cursorY - boxHeight / 2 - 3,
      size: 9,
      font: regular,
      color: COLOR.carmin,
    });
  } else {
    page.drawText("LE FICHIER TÉLÉVERSÉ SUIT CETTE PAGE", {
      x: MARGIN,
      y: cursorY - 4,
      size: 8,
      font: bold,
      color: COLOR.ardoise,
    });
  }

  return page;
}

/**
 * Assemble toutes les pièces d'un dossier (PDF fusionnés, images converties en pages) en un
 * seul PDF imprimable/téléchargeable : une page de garde récapitulative, puis pour chaque pièce
 * une page de titre (statut, catégorie, taille, date) immédiatement suivie du fichier correspondant.
 */
export async function buildPiecesDossierPdfBuffer(input: PiecesDossierDocInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Pièces du dossier ${input.dossierRef}`);
  pdfDoc.setAuthor("GET Admission");
  pdfDoc.setSubject(`Compilation des pièces — ${input.candidat}`);

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page de garde réservée en premier (dessinée en dernier, une fois le statut de chaque pièce connu).
  const coverPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const summary: { libelle: string; statutLabel: string; included: boolean; note?: string }[] = [];
  // Pages dont le pied de page ("… · Page X sur Y") sera tamponné en fin de génération : uniquement
  // celles que ce générateur dessine lui-même (garde, titres de pièce, pages image) — jamais les
  // pages PDF copiées telles quelles depuis les fichiers du candidat, pour éviter un chevauchement
  // avec un contenu déjà présent en bas de leur propre page.
  const footerEntries: { index: number; text: string }[] = [];

  let index = 0;
  const total = input.pieces.length;
  for (const piece of input.pieces) {
    index += 1;
    const statutLabel = PIECE_STATUT_LABEL[piece.statut] ?? piece.statut;

    // On tente d'abord d'embarquer le fichier (sans encore rien ajouter au document) pour que la
    // page de titre puisse afficher un statut fiable, qu'il y ait ou non un contenu à sa suite.
    let copiedPdfPages: PDFPage[] | null = null;
    let embeddedImage: Awaited<ReturnType<typeof embedAnyImage>> | null = null;
    let failureNote: string | undefined;

    if (!piece.buffer || !piece.contentType) {
      failureNote = "Aucun fichier n'a été téléversé pour cette pièce.";
    } else {
      try {
        if (piece.contentType === "application/pdf") {
          const srcDoc = await PDFDocument.load(piece.buffer, { ignoreEncryption: true });
          const pageIndices = srcDoc.getPageIndices();
          if (pageIndices.length === 0) throw new Error("PDF vide");
          copiedPdfPages = await pdfDoc.copyPages(srcDoc, pageIndices);
        } else {
          embeddedImage = await embedAnyImage(pdfDoc, piece.buffer, piece.contentType);
        }
      } catch {
        failureNote = "Le fichier n'a pas pu être lu (format non pris en charge ou fichier corrompu).";
      }
    }

    await drawPieceCoverPage(pdfDoc, bold, regular, {
      dossierRef: input.dossierRef,
      title: piece.libelle,
      index,
      total,
      categorie: piece.categorie,
      taille: piece.taille,
      dateTeleversementStr: piece.dateTeleversementStr,
      statut: piece.statut,
      statutLabel,
      ...(failureNote ? { note: failureNote } : {}),
    });
    const pieceFooterText = `GET Admission · Dossier ${input.dossierRef} · Document ${index}/${total}.`;
    footerEntries.push({ index: pdfDoc.getPageCount() - 1, text: pieceFooterText });

    if (copiedPdfPages) {
      for (const p of copiedPdfPages) pdfDoc.addPage(p);
    } else if (embeddedImage) {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      footerEntries.push({ index: pdfDoc.getPageCount() - 1, text: pieceFooterText });
      const maxW = CONTENT_WIDTH;
      const maxH = PAGE_HEIGHT - MARGIN * 2;
      const scale = Math.min(maxW / embeddedImage.width, maxH / embeddedImage.height, 1);
      const w = embeddedImage.width * scale;
      const h = embeddedImage.height * scale;
      page.drawImage(embeddedImage, {
        x: (PAGE_WIDTH - w) / 2,
        y: (PAGE_HEIGHT - h) / 2,
        width: w,
        height: h,
      });
    }

    summary.push({
      libelle: piece.libelle,
      statutLabel,
      included: !failureNote,
      ...(failureNote ? { note: failureNote } : {}),
    });
  }

  // --- Page de garde : sommaire tabulaire (repères identiques à la liste "Pièces du dossier") ---
  let cursorY = (await drawBrandHeader(pdfDoc, coverPage)) - 34;
  coverPage.drawText("Pièces du dossier", { x: MARGIN, y: cursorY, size: 21, font: bold, color: COLOR.or });
  cursorY -= 34;

  cursorY = drawInfoBox(coverPage, {
    topY: cursorY,
    bold,
    regular,
    rows: [
      ["Dossier", input.dossierRef],
      ["Candidat", input.candidat],
      ["Généré le", input.generatedAtStr],
      ["Généré par", input.generatedBy],
      ["Pièces incluses", `${summary.filter((s) => s.included).length} / ${summary.length}`],
    ],
  });
  cursorY -= 26;

  coverPage.drawText("SOMMAIRE", { x: MARGIN, y: cursorY, size: 9, font: bold, color: COLOR.ardoise });
  cursorY -= 6;

  const colNumWidth = 22;
  const colStatutWidth = 78;
  const colPieceWidth = CONTENT_WIDTH - colNumWidth - colStatutWidth;
  const rowHeight = 20;

  cursorY -= 14;
  let rowIndex = 0;
  for (const item of summary) {
    if (cursorY - rowHeight < MARGIN + 40) {
      coverPage.drawText(
        `+ ${summary.length - rowIndex} autre(s) pièce(s) — voir la page de titre de chacune ci-après.`,
        { x: MARGIN, y: cursorY, size: 8.5, font: regular, color: COLOR.ardoise },
      );
      break;
    }
    if (rowIndex % 2 === 1) {
      coverPage.drawRectangle({
        x: MARGIN,
        y: cursorY - rowHeight + 5,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: COLOR.porcelaine,
        opacity: 0.6,
      });
    }
    coverPage.drawText(String(rowIndex + 1), {
      x: MARGIN + 4,
      y: cursorY - 9,
      size: 9,
      font: regular,
      color: COLOR.ardoise,
    });
    const pieceLine = wrapText(item.libelle, regular, 9.5, colPieceWidth - 8)[0] ?? item.libelle;
    coverPage.drawText(sanitizeForPdf(pieceLine), {
      x: MARGIN + colNumWidth,
      y: cursorY - 9,
      size: 9.5,
      font: regular,
      color: item.included ? COLOR.encre : COLOR.carmin,
    });
    const statutColor = item.included ? COLOR.or : COLOR.carmin;
    coverPage.drawText(item.included ? item.statutLabel : `Non incluse`, {
      x: MARGIN + colNumWidth + colPieceWidth,
      y: cursorY - 9,
      size: 8.5,
      font: bold,
      color: statutColor,
    });
    cursorY -= rowHeight;
    rowIndex += 1;
  }

  footerEntries.push({
    index: 0,
    text: `GET Admission · Confidentiel — document généré électroniquement le ${input.generatedAtStr}.`,
  });
  stampFooters(pdfDoc, regular, footerEntries);

  return pdfDoc.save();
}

/* --------------------------- Fiche candidat (partage CROUS, etc.) --------------------------- */

export type FicheCandidatDocInput = {
  candidat: string;
  email: string;
  telephone?: string | null | undefined;
  nationalite?: string | null | undefined;
  dateNaissance?: string | null | undefined;
  adresse?: string | null | undefined;
  dossierRef: string;
  universite: string;
  formation: string;
  etatLabel: string;
  generatedAtStr: string;
  generatedBy: string;
};

/** Fiche synthétique d'informations candidat — utilisée notamment en pièce jointe de partage CROUS. */
export async function buildFicheCandidatPdfBuffer(input: FicheCandidatDocInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Fiche candidat — ${input.candidat}`);
  pdfDoc.setAuthor("GET Admission");
  pdfDoc.setSubject("Fiche d'informations candidat");

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let cursorY = (await drawBrandHeader(pdfDoc, page)) - 34;

  page.drawText("Fiche candidat", { x: MARGIN, y: cursorY, size: 21, font: bold, color: COLOR.or });
  cursorY -= 34;

  cursorY = drawSectionLabel(page, { text: "Identité", y: cursorY, bold });
  cursorY = drawInfoBox(page, {
    topY: cursorY,
    bold,
    regular,
    rows: [
      ["Nom complet", input.candidat],
      ["E-mail", input.email],
      ["Téléphone", input.telephone || "—"],
      ["Nationalité", input.nationalite || "—"],
      ["Date de naissance", input.dateNaissance || "—"],
      ["Adresse", input.adresse || "—"],
    ],
  });
  cursorY -= 26;

  cursorY = drawSectionLabel(page, { text: "Dossier", y: cursorY, bold });
  cursorY = drawInfoBox(page, {
    topY: cursorY,
    bold,
    regular,
    rows: [
      ["Dossier", input.dossierRef],
      ["Université", input.universite],
      ["Formation", input.formation],
      ["État", input.etatLabel],
    ],
  });

  stampFooters(pdfDoc, regular, [
    {
      index: 0,
      text: `GET Admission · Confidentiel — document généré électroniquement le ${input.generatedAtStr} par ${input.generatedBy}.`,
    },
  ]);

  return pdfDoc.save();
}

/* --------------------------- Listing tabulaire (candidats, etc.) --------------------------- */

export type ListingColumn = { label: string; width: number };
export type ListingSummaryItem = { label: string; value: string };
export type ListingDocInput = {
  titre: string;
  sousTitre?: string;
  /** Rangée de cartes-statistiques (ex. KPI), affichée uniquement sur la première page. */
  summary?: ListingSummaryItem[];
  generatedAtStr: string;
  generatedBy: string;
  columns: ListingColumn[];
  rows: string[][];
};

/** Compile une liste tabulaire générique (ex. candidats, transactions) en PDF paginé, avec en-tête de marque. */
export async function buildListingPdfBuffer(input: ListingDocInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(input.titre);
  pdfDoc.setAuthor("GET Admission");

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const rowHeight = 20;
  const headerRowHeight = 22;

  let page!: PDFPage;
  let cursorY = 0;

  const drawColumnHeaders = () => {
    let x = MARGIN;
    page.drawRectangle({ x: MARGIN, y: cursorY - headerRowHeight, width: CONTENT_WIDTH, height: headerRowHeight, color: COLOR.porcelaine });
    for (const col of input.columns) {
      page.drawText(col.label.toUpperCase(), { x: x + 4, y: cursorY - headerRowHeight + 7, size: 7.5, font: bold, color: COLOR.ardoise });
      x += col.width;
    }
    cursorY -= headerRowHeight;
  };

  const drawSummaryCards = (items: ListingSummaryItem[]) => {
    const cardGap = 14;
    const cardHeight = 44;
    const cardWidth = (CONTENT_WIDTH - cardGap * (items.length - 1)) / items.length;
    items.forEach((item, i) => {
      drawStatCard(page, {
        x: MARGIN + i * (cardWidth + cardGap),
        y: cursorY,
        width: cardWidth,
        height: cardHeight,
        label: item.label,
        value: sanitizeForPdf(item.value),
        bold,
        regular,
      });
    });
    cursorY -= cardHeight + 20;
  };

  const startPage = async (first: boolean) => {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    if (first) {
      cursorY = (await drawBrandHeader(pdfDoc, page)) - 34;
      page.drawText(input.titre, { x: MARGIN, y: cursorY, size: 19, font: bold, color: COLOR.or });
      cursorY -= 20;
      if (input.sousTitre) {
        page.drawText(input.sousTitre, { x: MARGIN, y: cursorY, size: 10, font: regular, color: COLOR.ardoise });
        cursorY -= 18;
      }
      cursorY -= 10;
      if (input.summary && input.summary.length > 0) {
        drawSummaryCards(input.summary);
      }
    } else {
      cursorY = PAGE_HEIGHT - MARGIN;
    }
    drawColumnHeaders();
  };

  await startPage(true);

  let rowIndex = 0;
  for (const row of input.rows) {
    if (cursorY - rowHeight < MARGIN + 40) {
      await startPage(false);
    }
    if (rowIndex % 2 === 1) {
      page.drawRectangle({ x: MARGIN, y: cursorY - rowHeight, width: CONTENT_WIDTH, height: rowHeight, color: COLOR.porcelaine, opacity: 0.5 });
    }
    let x = MARGIN;
    for (let i = 0; i < input.columns.length; i++) {
      const col = input.columns[i]!;
      const cell = row[i] ?? "";
      const lines = wrapText(cell, regular, 9, col.width - 8);
      page.drawText(lines[0] ?? "", { x: x + 4, y: cursorY - rowHeight + 6, size: 9, font: regular, color: COLOR.encre });
      x += col.width;
    }
    cursorY -= rowHeight;
    rowIndex += 1;
  }

  const footerText = `${input.rows.length} ligne(s) — Généré par ${input.generatedBy} le ${input.generatedAtStr}.`;
  stampFooters(
    pdfDoc,
    regular,
    pdfDoc.getPages().map((_, i) => ({ index: i, text: footerText })),
  );

  return pdfDoc.save();
}

export type TransactionPdfInput = {
  titre: string;
  sousTitre?: string;
  generatedAtStr: string;
  generatedBy: string;
  transactions: {
    reference: string;
    candidat: string;
    dossier: string;
    type: string;
    date: string;
    moyen: string;
    montant: string;
    statut: string;
  }[];
};

/**
 * Génère un PDF listant les transactions en utilisant le design pattern des reçus (InfoBoxes),
 * plutôt qu'un simple tableau, pour un rendu beaucoup plus esthétique et aéré.
 */
export async function buildTransactionsPdfBuffer(input: TransactionPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(input.titre);
  pdfDoc.setAuthor("GET Admission");

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page!: PDFPage;
  let cursorY = 0;
  let pageIndex = 0;
  const entries: { index: number; text: string }[] = [];

  const startPage = async () => {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    cursorY = (await drawBrandHeader(pdfDoc, page)) - 34;
    
    if (pageIndex === 0) {
      page.drawText(input.titre, { x: MARGIN, y: cursorY, size: 19, font: bold, color: COLOR.or });
      cursorY -= 20;
      if (input.sousTitre) {
        page.drawText(input.sousTitre, { x: MARGIN, y: cursorY, size: 10, font: regular, color: COLOR.ardoise });
        cursorY -= 18;
      }
      cursorY -= 10;
    }
    
    const footerText = `${input.transactions.length} transaction(s) — Généré par ${input.generatedBy} le ${input.generatedAtStr}.`;
    entries.push({ index: pageIndex, text: footerText });
    pageIndex++;
  };

  await startPage();

  for (const t of input.transactions) {
    // Un InfoBox de 4 lignes prend environ 4*22 + 16 = 104pt
    // + Le bloc vert prend 40pt
    // + Titre (26pt) + Espacement (30pt) = ~200pt
    if (cursorY - 220 < MARGIN + 40) {
      await startPage();
    }

    cursorY = drawSectionLabel(page, { text: `${t.date}  —  Réf: ${t.reference}`, y: cursorY, bold });
    cursorY = drawInfoBox(page, {
      topY: cursorY,
      bold,
      regular,
      rows: [
        ["Candidat", t.candidat],
        ["Dossier", `${t.dossier} (${t.type})`],
        ["Moyen de paiement", t.moyen],
        ["Statut", t.statut],
      ],
    });
    
    // Dessiner l'encart vert pour le montant (comme sur le reçu)
    cursorY -= 10;
    const totalHeight = 40;
    page.drawRectangle({
      x: MARGIN,
      y: cursorY - totalHeight,
      width: CONTENT_WIDTH,
      height: totalHeight,
      color: COLOR.orPale,
      borderColor: COLOR.or,
      borderWidth: 1,
    });
    page.drawText("MONTANT", {
      x: MARGIN + 14,
      y: cursorY - totalHeight / 2 - 4,
      size: 9,
      font: bold,
      color: COLOR.or,
    });
    const montantLabelSafe = sanitizeForPdf(t.montant);
    const montantWidth = bold.widthOfTextAtSize(montantLabelSafe, 16);
    page.drawText(montantLabelSafe, {
      x: PAGE_WIDTH - MARGIN - 14 - montantWidth,
      y: cursorY - totalHeight / 2 - 6,
      size: 16,
      font: bold,
      color: COLOR.or,
    });
    
    cursorY -= totalHeight + 30; // Espacement entre transactions
  }

  stampFooters(pdfDoc, regular, entries);

  return pdfDoc.save();
}
