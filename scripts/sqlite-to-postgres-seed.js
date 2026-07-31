/**
 * Export SQLite db/custom.db → inserts Postgres (pour seed Supabase via MCP).
 * Usage: node scripts/sqlite-to-postgres-seed.js > /tmp/seed.sql
 */
const Database = require("better-sqlite3");
const path = require("node:path");
const fs = require("node:fs");

const dbPath = path.join(__dirname, "..", "db", "custom.db");
if (!fs.existsSync(dbPath)) {
  console.error("db/custom.db introuvable");
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

const ENUM_COLS = new Set([
  "User.role",
  "Dossier.etat",
  "Historique.etat",
]);

function esc(val, table, col) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return Number.isFinite(val) ? String(val) : "NULL";
  if (typeof val === "bigint") return String(val);
  if (Buffer.isBuffer(val)) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  // SQLite stores bool as 0/1
  if (col && typeof val === "number" && (val === 0 || val === 1)) {
    // handled above as number
  }
  let s = String(val);
  // Datetimes: Prisma SQLite often stores ISO strings
  s = s.replace(/'/g, "''");
  if (ENUM_COLS.has(`${table}.${col}`)) {
    return `'${s}'::"${col === "role" ? "Role" : "EtatDossier"}"`;
  }
  return `'${s}'`;
}

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name")
  .all()
  .map((r) => r.name);

// Order for FKs
const ORDER = [
  "User",
  "Universite",
  "Formation",
  "Dossier",
  "Piece",
  "Historique",
  "Paiement",
  "Conversation",
  "Message",
  "Attestation",
  "Statistique",
  "Temoignage",
  "MembreEquipe",
  "Faq",
  "ContactInfo",
  "ModeleAttestation",
  "Nationalite",
  "MoyenPaiement",
  "ObjetContact",
  "ContactMessage",
  "Parametre",
  "AuditLog",
  "Notification",
  "EmailLog",
  "ContenuSection",
];

const ordered = [
  ...ORDER.filter((t) => tables.includes(t)),
  ...tables.filter((t) => !ORDER.includes(t)),
];

const BOOL_HINT = new Set([
  "actif",
  "partenaire",
  "kycVerifie",
  "isDemo",
  "lu",
  "traite",
  "paiementTranches",
  "notifEmail",
  "notifInApp",
  "workflowStrict",
  "exigerEmailVerifie",
]);

const DATE_HINT = new Set([
  "createdAt",
  "updatedAt",
  "date",
  "dateEmission",
  "televerseeLe",
  "kycVerifieLe",
  "emailVerified",
  "resetTokenExpires",
]);

function escDate(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") {
    // epoch ms (Prisma SQLite)
    const ms = val > 1e12 ? val : val * 1000;
    return `to_timestamp(${ms / 1000.0})`;
  }
  const s = String(val).replace(/'/g, "''");
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    const ms = n > 1e12 ? n : n * 1000;
    return `to_timestamp(${ms / 1000.0})`;
  }
  return `'${s}'::timestamp`;
}

const out = [];
out.push("BEGIN;");

for (const table of ordered) {
  const colsInfo = db.prepare(`PRAGMA table_info("${table}")`).all();
  const cols = colsInfo.map((c) => c.name);
  const rows = db.prepare(`SELECT * FROM "${table}"`).all();
  if (rows.length === 0) continue;

  out.push(`-- ${table}: ${rows.length} rows`);
  for (const row of rows) {
    const values = cols.map((col) => {
      let v = row[col];
      if (BOOL_HINT.has(col) && (v === 0 || v === 1)) {
        return v === 1 ? "TRUE" : "FALSE";
      }
      if (DATE_HINT.has(col)) {
        return escDate(v);
      }
      return esc(v, table, col);
    });
    const colList = cols.map((c) => `"${c}"`).join(", ");
    out.push(
      `INSERT INTO "${table}" (${colList}) VALUES (${values.join(", ")}) ON CONFLICT DO NOTHING;`,
    );
  }
}

// Reset serial sequences
const serialTables = [
  "Statistique",
  "Temoignage",
  "MembreEquipe",
  "Faq",
  "ModeleAttestation",
  "Nationalite",
  "MoyenPaiement",
  "ObjetContact",
  "ContactMessage",
  "AuditLog",
  "EmailLog",
  "ContenuSection",
];
for (const t of serialTables) {
  out.push(
    `SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 1), true);`,
  );
}

out.push("COMMIT;");
process.stdout.write(out.join("\n") + "\n");
