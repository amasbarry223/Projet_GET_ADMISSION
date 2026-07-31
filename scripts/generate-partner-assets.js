const fs = require("fs");
const path = require("path");

const partners = [
  ["pstm", "PSTM", "#173A7A"],
  ["mbn-global", "MBN", "#2D6BF0"],
  ["ilmis", "ILM", "#B8902E"],
  ["esiia", "ESI", "#1F8A5B"],
  ["ismod", "ISM", "#C77A12"],
  ["esmep", "ESP", "#173A7A"],
  ["emsp", "EMS", "#2D6BF0"],
  ["isd", "ISD", "#B8902E"],
  ["ecole-tourangelle", "ETS", "#1F8A5B"],
  ["galileo-global", "GGE", "#173A7A"],
  ["mbs-education", "MBS", "#C77A12"],
  ["sorbonne-universite", "SU", "#173A7A"],
  ["universite-de-montreal", "UM", "#5A6781"],
  ["universite-hasselt", "UH", "#B8902E"],
  ["universite-mohammed-v-rabat", "UM5", "#1F8A5B"],
  ["universite-cape-town", "UCT", "#2D6BF0"],
  ["universite-gaston-berger", "UGB", "#C77A12"],
  ["universite-tunis-el-manar", "UTM", "#C0392B"],
  ["universite-nantes", "UN", "#173A7A"],
  ["universite-libanaise-americaine", "LAU", "#5A6781"],
  ["universite-yaounde-i", "UY1", "#1F8A5B"],
];

for (const [slug, label, color] of partners) {
  const dir = path.join("public", "images", "partenaires", slug);
  fs.mkdirSync(dir, { recursive: true });

  const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#0E1B33"/></linearGradient></defs>
  <rect width="1200" height="675" fill="url(#g)"/>
  <circle cx="980" cy="120" r="180" fill="#B8902E" fill-opacity="0.12"/>
  <circle cx="160" cy="520" r="220" fill="#fff" fill-opacity="0.06"/>
  <text x="60" y="340" fill="#F4F6FB" font-family="Georgia,serif" font-size="64" font-weight="700">${label}</text>
  <text x="60" y="390" fill="#B8902E" font-family="monospace" font-size="18" letter-spacing="4">GET ADMISSION · LE PASSAGE</text>
</svg>`;

  const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="80" fill="#fff"/>
  <circle cx="80" cy="80" r="72" fill="none" stroke="${color}" stroke-width="3"/>
  <text x="80" y="92" text-anchor="middle" fill="${color}" font-family="monospace" font-size="28" font-weight="700">${label.slice(0, 3)}</text>
</svg>`;

  fs.writeFileSync(path.join(dir, "cover.svg"), cover);
  fs.writeFileSync(path.join(dir, "logo.svg"), logo);

  for (let i = 1; i <= 3; i++) {
    const g = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <rect width="800" height="500" fill="#F4F6FB"/>
  <rect y="${80 + i * 40}" width="800" height="200" fill="${color}" fill-opacity="0.28"/>
  <text x="40" y="460" fill="#173A7A" font-family="monospace" font-size="16">${label} · vue ${i}</text>
</svg>`;
    fs.writeFileSync(path.join(dir, `gallery-${i}.svg`), g);
  }
}

console.log("assets ok:", partners.length);
