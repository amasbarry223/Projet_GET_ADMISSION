/**
 * Générateur PDF minimal (sans dépendance externe) pour reçus et attestations.
 * Produit un PDF 1.4 valide avec texte Latin-1.
 */

function escapePdfText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E\u00C0-\u00FF]/g, "?");
}

export function buildSimplePdf(lines: string[], title = "GET Admission"): Buffer {
  const contentLines: string[] = [];
  let y = 780;
  contentLines.push("BT");
  contentLines.push("/F1 16 Tf");
  contentLines.push(`50 ${y} Td`);
  contentLines.push(`(${escapePdfText(title)}) Tj`);
  y -= 28;
  contentLines.push("/F1 11 Tf");
  for (const line of lines) {
    contentLines.push(`0 -16 Td`);
    contentLines.push(`(${escapePdfText(line)}) Tj`);
    y -= 16;
    if (y < 60) break;
  }
  contentLines.push("ET");
  const stream = contentLines.join("\n");

  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj"
  );
  objects.push(`4 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}\nendstream endobj`);
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj + "\n";
  }
  const xrefPos = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefPos}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
