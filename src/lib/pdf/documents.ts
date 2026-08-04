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

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
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
    page.drawText(value, {
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
