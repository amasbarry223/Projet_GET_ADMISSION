import fs from "fs";
import path from "path";

/**
 * Vérifie qu'un logo partenaire local existe et n'est pas un HTML/erreur déguisé.
 */
export function isValidPartnerLogo(logoUrl: string | null | undefined): boolean {
  if (!logoUrl || !logoUrl.startsWith("/")) return false;

  const filePath = path.join(process.cwd(), "public", logoUrl.replace(/^\//, ""));
  if (!fs.existsSync(filePath)) return false;

  const size = fs.statSync(filePath).size;
  if (size < 1500) return false;

  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(8);
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);

  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return size > 2000;
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    return size > 2000;
  }
  // SVG / XML
  if (buf[0] === 0x3c) {
    const head = fs.readFileSync(filePath, "utf8").slice(0, 400).toLowerCase();
    if (head.includes("<!doctype") || head.includes("<html")) return false;
    return head.includes("<svg") && size > 1000;
  }
  // WEBP (RIFF....WEBP)
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    size > 2000
  ) {
    return true;
  }

  return false;
}
