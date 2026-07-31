/**
 * Télécharge des photos Unsplash (licence libre) et génère covers/galeries WebP
 * + logos PNG monochromes charte pour chaque partenaire.
 *
 * Usage: node scripts/fetch-partner-photos.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const https = require("https");
const http = require("http");

const ROOT = path.join(__dirname, "..", "public", "images", "partenaires");

/** Unsplash photo IDs thématisés (campus / étudiants / ville) — IDs vérifiés */
const COVERS = [
  "1562774053-701939374585",
  "1541339907198-e08756dedf3f",
  "1523050854058-8df90110c9f1",
  "1498243691581-b145c3f54a5a",
  "1523240795612-9a054b0db644",
  "1502602898657-3e91760cbb34",
  "1431274172761-fca41dda67a0",
  "1524178232363-1fb2b075b655",
  "1517486808906-6ca8b3f04846",
  "1427504494780-b937434dc9d7",
  "1499856871958-5b9627545d1a",
  "1562774053-701939374585",
];

const GALLERY_A = [
  "1541339907198-e08756dedf3f",
  "1498243691581-b145c3f54a5a",
  "1523240795612-9a054b0db644",
  "1502602898657-3e91760cbb34",
  "1431274172761-fca41dda67a0",
  "1524178232363-1fb2b075b655",
  "1517486808906-6ca8b3f04846",
  "1427504494780-b937434dc9d7",
  "1499856871958-5b9627545d1a",
  "1562774053-701939374585",
  "1523050854058-8df90110c9f1",
];

const GALLERY_B = [
  "1523240795612-9a054b0db644",
  "1502602898657-3e91760cbb34",
  "1562774053-701939374585",
  "1541339907198-e08756dedf3f",
  "1523050854058-8df90110c9f1",
  "1498243691581-b145c3f54a5a",
  "1431274172761-fca41dda67a0",
  "1524178232363-1fb2b075b655",
  "1517486808906-6ca8b3f04846",
  "1427504494780-b937434dc9d7",
  "1499856871958-5b9627545d1a",
];

const GALLERY_C = [
  "1431274172761-fca41dda67a0",
  "1499856871958-5b9627545d1a",
  "1524178232363-1fb2b075b655",
  "1517486808906-6ca8b3f04846",
  "1427504494780-b937434dc9d7",
  "1562774053-701939374585",
  "1541339907198-e08756dedf3f",
  "1523050854058-8df90110c9f1",
  "1498243691581-b145c3f54a5a",
  "1523240795612-9a054b0db644",
  "1502602898657-3e91760cbb34",
];

const SLUGS = [
  "pstm",
  "mbn-global",
  "ilmis",
  "esiia",
  "ismod",
  "esmep",
  "emsp",
  "isd",
  "ecole-tourangelle",
  "galileo-global",
  "mbs-education",
  "sorbonne-universite",
  "universite-de-montreal",
  "universite-hasselt",
  "universite-mohammed-v-rabat",
  "universite-cape-town",
  "universite-gaston-berger",
  "universite-tunis-el-manar",
  "universite-nantes",
  "universite-libanaise-americaine",
  "universite-yaounde-i",
];

const COLORS = [
  "#173A7A",
  "#2D6BF0",
  "#B8902E",
  "#1F8A5B",
  "#C77A12",
  "#173A7A",
  "#2D6BF0",
  "#B8902E",
  "#1F8A5B",
  "#173A7A",
  "#C77A12",
  "#173A7A",
  "#5A6781",
  "#B8902E",
  "#1F8A5B",
  "#2D6BF0",
  "#C77A12",
  "#C0392B",
  "#173A7A",
  "#5A6781",
  "#1F8A5B",
];

function unsplashUrl(id, w = 1200) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": "GETAdmission-AssetBuilder/1.0",
          Accept: "image/*",
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function toWebp(buf, outPath, width, height) {
  await sharp(buf)
    .resize(width, height, { fit: "cover", position: "centre" })
    .webp({ quality: 78 })
    .toFile(outPath);
}

async function makeLogo(label, color, outPath) {
  const text = label.slice(0, 4).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="128" fill="#FFFFFF"/>
  <circle cx="128" cy="128" r="118" fill="none" stroke="${color}" stroke-width="6"/>
  <text x="128" y="142" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="48" font-weight="700" fill="${color}">${text}</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

async function processSlug(slug, index) {
  const dir = path.join(ROOT, slug);
  fs.mkdirSync(dir, { recursive: true });

  const color = COLORS[index % COLORS.length];
  const coverId = COVERS[index % COVERS.length];
  const g1 = GALLERY_A[index % GALLERY_A.length];
  const g2 = GALLERY_B[index % GALLERY_B.length];
  const g3 = GALLERY_C[index % GALLERY_C.length];

  const jobs = [
    { id: coverId, file: "cover.webp", w: 1200, h: 675 },
    { id: g1, file: "gallery-1.webp", w: 800, h: 500 },
    { id: g2, file: "gallery-2.webp", w: 800, h: 500 },
    { id: g3, file: "gallery-3.webp", w: 800, h: 500 },
  ];

  for (const job of jobs) {
    const out = path.join(dir, job.file);
    try {
      const buf = await fetchBuffer(unsplashUrl(job.id, job.w));
      await toWebp(buf, out, job.w, job.h);
      const kb = Math.round(fs.statSync(out).size / 1024);
      console.log(`  ✓ ${slug}/${job.file} (${kb} Ko)`);
    } catch (e) {
      console.warn(`  ⚠ ${slug}/${job.file}: ${e.message} — fallback gradient`);
      const fallback = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${job.w}" height="${job.h}">
          <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#0E1B33"/>
          </linearGradient></defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>`
      );
      await sharp(fallback).webp({ quality: 80 }).toFile(out);
    }
  }

  await makeLogo(slug.replace(/-/g, " ").split(" ").map((w) => w[0]).join("").slice(0, 3) || slug.slice(0, 3), color, path.join(dir, "logo.png"));
  console.log(`  ✓ ${slug}/logo.png`);
}

async function main() {
  console.log("Fetching partner photos…");
  for (let i = 0; i < SLUGS.length; i++) {
    console.log(`\n[${i + 1}/${SLUGS.length}] ${SLUGS[i]}`);
    await processSlug(SLUGS[i], i);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
