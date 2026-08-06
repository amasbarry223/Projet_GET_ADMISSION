/**
 * Génération de PDF de marque (attestations, reçus) avec pdf-lib.
 * Palette et sceau alignés sur l'identité visuelle GET Admission (globals.css,
 * boarding-pass.tsx / espace/attestation) : filet vert, sceau circulaire
 * incliné -8°, wordmark en en-tête.
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, degrees } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLOR = {
  encre: rgb(0x1a / 255, 0x1a / 255, 0x1a / 255),
  ardoise: rgb(0x6b / 255, 0x72 / 255, 0x80 / 255),
  lapis: rgb(0x3c / 255, 0xa9 / 255, 0x36 / 255),
  or: rgb(0x2e / 255, 0x83 / 255, 0x29 / 255),
  orPale: rgb(0xe8 / 255, 0xf5 / 255, 0xe7 / 255),
  porcelaine: rgb(0xf3 / 255, 0xf4 / 255, 0xf6 / 255),
  ligne: rgb(0xe5 / 255, 0xe7 / 255, 0xeb / 255),
  carmin: rgb(0xc0 / 255, 0x39 / 255, 0x2b / 255),
  carminPale: rgb(1, 0.95, 0.94),
  blanc: rgb(1, 1, 1),
};

let logoBytesPromise: Promise<Uint8Array> | null = null;
function loadLogoBytes(): Promise<Uint8Array> {
  if (!logoBytesPromise) {
    logoBytesPromise = readFile(
      path.join(process.cwd(), "public/images/brand/logo-get-admission.png"),
    );
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

/** Ramène tout caractère non encodable par la police standard WinAnsi à un équivalent sûr. */
function sanitizeForPdf(text: string): string {
  let out = "";
  for (const ch of text) {
    if ((ch.codePointAt(0) ?? 0) <= 0xff || WINANSI_EXTRA_PUNCTUATION.includes(ch)) {
      out += ch;
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

function drawCenteredRotatedText(
  page: PDFPage,
  opts: {
    text: string;
    font: PDFFont;
    size: number;
    color: ReturnType<typeof rgb>;
    x: number;
    y: number;
    angleDeg: number;
    opacity?: number;
  },
) {
  const rad = (opts.angleDeg * Math.PI) / 180;
  const width = opts.font.widthOfTextAtSize(opts.text, opts.size);
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  page.drawText(opts.text, {
    x: opts.x - (width / 2) * dx,
    y: opts.y - (width / 2) * dy,
    size: opts.size,
    font: opts.font,
    color: opts.color,
    rotate: degrees(opts.angleDeg),
    opacity: opts.opacity ?? 1,
  });
}

/** Sceau officiel : double cercle + texte incliné -8°, dans l'esprit du tampon visa du front-end. */
function drawSeal(
  page: PDFPage,
  opts: { centerX: number; centerY: number; bold: PDFFont; regular: PDFFont },
) {
  const angle = -8;
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const px = Math.sin(rad);
  const py = -Math.cos(rad);
  const { centerX, centerY, bold, regular } = opts;

  page.drawEllipse({
    x: centerX,
    y: centerY,
    xScale: 46,
    yScale: 46,
    color: COLOR.orPale,
    borderColor: COLOR.or,
    borderWidth: 2.25,
  });
  page.drawEllipse({
    x: centerX,
    y: centerY,
    xScale: 35,
    yScale: 35,
    borderColor: COLOR.or,
    borderWidth: 0.75,
  });

  const halfLen = 25;
  page.drawLine({
    start: { x: centerX - dx * halfLen, y: centerY - dy * halfLen },
    end: { x: centerX + dx * halfLen, y: centerY + dy * halfLen },
    thickness: 0.6,
    color: COLOR.or,
    opacity: 0.6,
  });

  const gap = 7;
  drawCenteredRotatedText(page, {
    text: "GET ADMISSION",
    font: bold,
    size: 6.5,
    color: COLOR.or,
    x: centerX - px * gap,
    y: centerY - py * gap,
    angleDeg: angle,
  });
  drawCenteredRotatedText(page, {
    text: "SCEAU OFFICIEL",
    font: regular,
    size: 5.5,
    color: COLOR.or,
    x: centerX + px * gap,
    y: centerY + py * gap,
    angleDeg: angle,
  });
}

function drawDraftWatermark(page: PDFPage, font: PDFFont) {
  drawCenteredRotatedText(page, {
    text: "APERÇU — NON OFFICIEL",
    font,
    size: 40,
    color: COLOR.carmin,
    x: PAGE_WIDTH / 2,
    y: PAGE_HEIGHT / 2,
    angleDeg: 28,
    opacity: 0.14,
  });
}

/** En-tête de marque : logo + filet vert. Retourne le curseur Y sous le filet. */
async function drawBrandHeader(pdfDoc: PDFDocument, page: PDFPage): Promise<number> {
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

  const ruleY = top - logoHeight - 16;
  page.drawLine({
    start: { x: MARGIN, y: ruleY },
    end: { x: PAGE_WIDTH - MARGIN, y: ruleY },
    thickness: 1.4,
    color: COLOR.lapis,
  });

  return ruleY;
}

function drawFooter(page: PDFPage, regular: PDFFont, text: string) {
  const footerY = MARGIN + 16;
  page.drawLine({
    start: { x: MARGIN, y: footerY + 14 },
    end: { x: PAGE_WIDTH - MARGIN, y: footerY + 14 },
    thickness: 0.5,
    color: COLOR.ligne,
  });
  for (const line of wrapText(text, regular, 8, CONTENT_WIDTH)) {
    page.drawText(line, { x: MARGIN, y: footerY, size: 8, font: regular, color: COLOR.ardoise });
    return; // une seule ligne suffit pour le pied de page
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

export type AttestationDocInput = {
  titreModele: string;
  descModele: string;
  reference: string;
  codeVerification: string;
  dateStr: string;
  candidat: string;
  formation: string;
  universite: string;
  dossierRef: string;
  modeRemiseLabel: string;
  emetteur: string;
  draft: boolean;
};

export async function buildAttestationPdfBuffer(doc: AttestationDocInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(doc.draft ? `Aperçu — ${doc.titreModele}` : doc.titreModele);
  pdfDoc.setAuthor("GET Admission");
  pdfDoc.setSubject(
    doc.draft ? "Aperçu de document — non officiel" : "Attestation de pré-inscription",
  );

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  if (doc.draft) drawDraftWatermark(page, bold);

  let cursorY = (await drawBrandHeader(pdfDoc, page)) - 34;

  if (doc.draft) {
    const boxHeight = 28;
    page.drawRectangle({
      x: MARGIN,
      y: cursorY - boxHeight,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: COLOR.carminPale,
      borderColor: COLOR.carmin,
      borderWidth: 0.75,
    });
    page.drawText(
      "Document provisoire — non officiel. Émettez l'attestation pour obtenir le PDF définitif.",
      { x: MARGIN + 10, y: cursorY - boxHeight + 10, size: 8.5, font: regular, color: COLOR.carmin },
    );
    cursorY -= boxHeight + 24;
  }

  page.drawText(doc.titreModele, { x: MARGIN, y: cursorY, size: 21, font: bold, color: COLOR.or });
  cursorY -= 18;
  for (const line of wrapText(doc.descModele, italic, 10.5, CONTENT_WIDTH)) {
    page.drawText(line, { x: MARGIN, y: cursorY, size: 10.5, font: italic, color: COLOR.ardoise });
    cursorY -= 14;
  }
  cursorY -= 16;

  const intro =
    `Nous certifions que ${doc.candidat} a obtenu une pré-admission pour la formation ` +
    `${doc.formation} auprès de ${doc.universite}, dans le cadre de l'accompagnement assuré ` +
    `par GET Admission.`;
  for (const line of wrapText(intro, regular, 11, CONTENT_WIDTH)) {
    page.drawText(line, { x: MARGIN, y: cursorY, size: 11, font: regular, color: COLOR.encre });
    cursorY -= 16;
  }
  cursorY -= 14;

  cursorY = drawInfoBox(page, {
    topY: cursorY,
    bold,
    regular,
    rows: [
      ["Référence attestation", doc.reference],
      ["Dossier", doc.dossierRef],
      ["Date d'émission", doc.dateStr],
      ["Code de vérification", doc.codeVerification],
      ["Mode de remise", doc.modeRemiseLabel],
      ["Émis par", doc.emetteur],
    ],
  });
  cursorY -= 56;

  page.drawText("SIGNATURE", { x: MARGIN, y: cursorY, size: 7.5, font: bold, color: COLOR.ardoise });
  page.drawLine({
    start: { x: MARGIN, y: cursorY - 30 },
    end: { x: MARGIN + 170, y: cursorY - 30 },
    thickness: 0.75,
    color: COLOR.ligne,
  });
  page.drawText(doc.emetteur, { x: MARGIN, y: cursorY - 42, size: 10, font: bold, color: COLOR.encre });
  page.drawText("GET Admission", {
    x: MARGIN,
    y: cursorY - 54,
    size: 8.5,
    font: regular,
    color: COLOR.ardoise,
  });

  if (!doc.draft) {
    drawSeal(page, { centerX: PAGE_WIDTH - MARGIN - 50, centerY: cursorY - 36, bold, regular });
  }

  drawFooter(
    page,
    regular,
    doc.draft
      ? "Aperçu généré automatiquement — sans valeur officielle."
      : `Vérifiez l'authenticité de ce document sur /verifier avec le code ${doc.codeVerification}.`,
  );

  return pdfDoc.save();
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
};

export async function buildReceiptPdfBuffer(input: ReceiptDocInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Reçu ${input.reference}`);
  pdfDoc.setAuthor("GET Admission");
  pdfDoc.setSubject("Reçu de paiement");

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let cursorY = (await drawBrandHeader(pdfDoc, page)) - 34;

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

  cursorY = drawInfoBox(page, {
    topY: cursorY,
    bold,
    regular,
    rows: [
      ["Date", input.dateStr],
      ["Candidat", input.candidat],
      ["E-mail", input.email],
      ["Dossier", input.dossierRef],
      ["Université", input.universite],
      ["Type d'établissement", input.typeEtablissementLabel],
      ["Formation", input.formation],
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
  const montantWidth = bold.widthOfTextAtSize(input.montantLabel, 16);
  page.drawText(input.montantLabel, {
    x: PAGE_WIDTH - MARGIN - 14 - montantWidth,
    y: cursorY - totalHeight / 2 - 6,
    size: 16,
    font: bold,
    color: COLOR.or,
  });

  drawFooter(
    page,
    regular,
    `GET Admission · Confidentiel — document généré électroniquement le ${input.generatedAtStr}.`,
  );

  return pdfDoc.save();
}

/* --------------------------- Compilation des pièces d'un dossier --------------------------- */

const PIECE_STATUT_LABEL: Record<string, string> = {
  manquante: "Manquante",
  televersee: "Téléversée",
  a_corriger: "À corriger",
  validee: "Validée",
};

export type PieceDossierInput = {
  libelle: string;
  statut: string;
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

function drawDividerPage(
  pdfDoc: PDFDocument,
  bold: PDFFont,
  regular: PDFFont,
  opts: { title: string; index: number; total: number },
) {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const centerY = PAGE_HEIGHT / 2;

  page.drawLine({
    start: { x: MARGIN, y: centerY + 30 },
    end: { x: PAGE_WIDTH - MARGIN, y: centerY + 30 },
    thickness: 1.4,
    color: COLOR.lapis,
  });
  page.drawText(`PIÈCE ${opts.index}/${opts.total}`, {
    x: MARGIN,
    y: centerY + 42,
    size: 9,
    font: regular,
    color: COLOR.ardoise,
  });
  let y = centerY;
  for (const line of wrapText(opts.title, bold, 22, CONTENT_WIDTH)) {
    page.drawText(line, { x: MARGIN, y, size: 22, font: bold, color: COLOR.or });
    y -= 28;
  }
  return page;
}

/**
 * Assemble toutes les pièces d'un dossier (PDF fusionnés, images converties en pages) en un
 * seul PDF imprimable/téléchargeable, précédé d'une page de garde listant chaque pièce et son statut.
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

  let index = 0;
  const total = input.pieces.length;
  for (const piece of input.pieces) {
    index += 1;
    const statutLabel = PIECE_STATUT_LABEL[piece.statut] ?? piece.statut;

    if (!piece.buffer || !piece.contentType) {
      summary.push({ libelle: piece.libelle, statutLabel, included: false, note: "aucun fichier" });
      continue;
    }

    try {
      if (piece.contentType === "application/pdf") {
        const srcDoc = await PDFDocument.load(piece.buffer, { ignoreEncryption: true });
        const pageIndices = srcDoc.getPageIndices();
        if (pageIndices.length === 0) throw new Error("PDF vide");
        drawDividerPage(pdfDoc, bold, regular, { title: piece.libelle, index, total });
        const copied = await pdfDoc.copyPages(srcDoc, pageIndices);
        for (const p of copied) pdfDoc.addPage(p);
      } else {
        const image = await embedAnyImage(pdfDoc, piece.buffer, piece.contentType);
        drawDividerPage(pdfDoc, bold, regular, { title: piece.libelle, index, total });
        const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        const maxW = CONTENT_WIDTH;
        const maxH = PAGE_HEIGHT - MARGIN * 2;
        const scale = Math.min(maxW / image.width, maxH / image.height, 1);
        const w = image.width * scale;
        const h = image.height * scale;
        page.drawImage(image, {
          x: (PAGE_WIDTH - w) / 2,
          y: (PAGE_HEIGHT - h) / 2,
          width: w,
          height: h,
        });
      }
      summary.push({ libelle: piece.libelle, statutLabel, included: true });
    } catch {
      summary.push({ libelle: piece.libelle, statutLabel, included: false, note: "fichier illisible" });
    }
  }

  // --- Page de garde ---
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
  cursorY -= 24;

  coverPage.drawText("CONTENU", { x: MARGIN, y: cursorY, size: 9, font: bold, color: COLOR.ardoise });
  cursorY -= 18;
  for (const item of summary) {
    if (cursorY < MARGIN + 40) break; // page de garde : liste tronquée au-delà d'une page (cas limite)
    const label = item.included
      ? `${item.libelle} — ${item.statutLabel}`
      : `${item.libelle} — ${item.statutLabel} (non incluse : ${item.note})`;
    const color = item.included ? COLOR.encre : COLOR.carmin;
    for (const line of wrapText(`• ${label}`, regular, 10, CONTENT_WIDTH)) {
      coverPage.drawText(line, { x: MARGIN, y: cursorY, size: 10, font: regular, color });
      cursorY -= 14;
    }
  }

  drawFooter(
    coverPage,
    regular,
    `GET Admission · Confidentiel — document généré électroniquement le ${input.generatedAtStr}.`,
  );

  return pdfDoc.save();
}

/* --------------------------- Listing tabulaire (candidats, etc.) --------------------------- */

export type ListingColumn = { label: string; width: number };
export type ListingDocInput = {
  titre: string;
  sousTitre?: string;
  generatedAtStr: string;
  generatedBy: string;
  columns: ListingColumn[];
  rows: string[][];
};

/** Compile une liste tabulaire générique (ex. candidats) en PDF paginé, avec en-tête de marque. */
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

  drawFooter(page, regular, `${input.rows.length} ligne(s) — Généré par ${input.generatedBy} le ${input.generatedAtStr}.`);

  return pdfDoc.save();
}
