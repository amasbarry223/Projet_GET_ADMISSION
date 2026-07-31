/**
 * Répare les WebP fallback (gradients) avec des photos Unsplash valides.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const https = require("https");

const ROOT = path.join(__dirname, "..", "public", "images", "partenaires");

const GOOD = [
  "1562774053-701939374585",
  "1541339907198-e08756dedf3f",
  "1498243691581-b145c3f54a5a",
  "1523240795612-9a054b0db644",
  "1502602898657-3e91760cbb34",
  "1524178232363-1fb2b075b655",
  "1517486808906-6ca8b3f04846",
  "1499856871958-5b9627545d1a",
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "GETAdmission/1.0", Accept: "image/*" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBuffer(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

async function main() {
  const slugs = fs.readdirSync(ROOT).filter((d) => fs.statSync(path.join(ROOT, d)).isDirectory());
  let i = 0;
  for (const slug of slugs) {
    const dir = path.join(ROOT, slug);
    for (const file of ["cover.webp", "gallery-1.webp", "gallery-2.webp", "gallery-3.webp"]) {
      const out = path.join(dir, file);
      const size = fs.existsSync(out) ? fs.statSync(out).size : 0;
      if (size > 8000) continue; // déjà une vraie photo
      const id = GOOD[i % GOOD.length];
      i++;
      const w = file.startsWith("cover") ? 1200 : 800;
      const h = file.startsWith("cover") ? 675 : 500;
      const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
      try {
        const buf = await fetchBuffer(url);
        await sharp(buf).resize(w, h, { fit: "cover" }).webp({ quality: 78 }).toFile(out);
        console.log(`fixed ${slug}/${file} (${Math.round(fs.statSync(out).size / 1024)} Ko)`);
      } catch (e) {
        console.warn(`fail ${slug}/${file}: ${e.message}`);
      }
    }
  }
  console.log("repair done");
}

main();
