/**
 * Configure Supabase Auth pour OTP e-mail (template + URLs).
 *
 * Usage (PowerShell) :
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # PAT du compte OWNER du projet
 *   node scripts/configure-supabase-auth-otp.mjs
 *
 * Créer un PAT : https://supabase.com/dashboard/account/tokens
 * (compte propriétaire de bmkvwgrpgntpvkngcfku)
 */
const REF = process.env.SUPABASE_PROJECT_REF || "bmkvwgrpgntpvkngcfku";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SITE_URL =
  process.env.NEXTAUTH_URL || "https://get-admission-two.vercel.app";

if (!TOKEN) {
  console.error(
    "SUPABASE_ACCESS_TOKEN manquant.\n" +
      "Crée un Personal Access Token avec le compte OWNER du projet :\n" +
      "https://supabase.com/dashboard/account/tokens",
  );
  process.exit(1);
}

const OTP_SUBJECT = "Votre code GET Admission";
const OTP_HTML = `<h2>Votre code GET Admission</h2>
<p>Entrez ce code dans l'application :</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>Il expire dans quelques minutes. Si vous n'avez rien demandé, ignorez cet e-mail.</p>`;

const uriAllowList = [
  `${SITE_URL.replace(/\/$/, "")}/**`,
  "http://localhost:3000/**",
  "http://127.0.0.1:3000/**",
].join(",");

async function api(method, path, body) {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" && data?.message
        ? data.message
        : text || res.statusText;
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`);
  }
  return data;
}

async function main() {
  console.log(`Projet ${REF} — Site URL: ${SITE_URL}`);

  // Vérifie l'accès au projet
  const projects = await api("GET", "/projects");
  const mine = Array.isArray(projects)
    ? projects.find((p) => p.id === REF || p.ref === REF)
    : null;
  if (!mine) {
    console.error(
      `Ce PAT n'a pas accès au projet ${REF}.\n` +
        `Connecte-toi avec le compte propriétaire et crée un nouveau token.`,
    );
    const ids = (Array.isArray(projects) ? projects : [])
      .map((p) => p.id)
      .slice(0, 20);
    console.error("Projets visibles:", ids.join(", ") || "(aucun)");
    process.exit(1);
  }
  console.log(`Accès OK: ${mine.name || REF}`);

  await api("PATCH", `/projects/${REF}/config/auth`, {
    site_url: SITE_URL.replace(/\/$/, ""),
    uri_allow_list: uriAllowList,
    mailer_subjects_magic_link: OTP_SUBJECT,
    mailer_templates_magic_link_content: OTP_HTML,
    external_email_enabled: true,
  });
  console.log("✓ Template Magic Link → OTP ({{ .Token }})");
  console.log("✓ Site URL + redirect URLs mis à jour");

  // Récupère service_role si possible
  try {
    const keys = await api("GET", `/projects/${REF}/api-keys`);
    const list = Array.isArray(keys) ? keys : keys?.api_keys || [];
    const service = list.find(
      (k) =>
        k.name === "service_role" ||
        k.type === "secret" ||
        (typeof k.api_key === "string" && k.api_key.includes("service_role")),
    );
    // Formats legacy : name service_role
    const legacy = list.find((k) => k.name === "service_role" || k.id === "service_role");
    const chosen = legacy || service;
    if (chosen?.api_key) {
      console.log("\nSERVICE_ROLE_KEY (à coller dans .env / Vercel, ne pas committer) :");
      console.log(chosen.api_key);
      console.log(
        "\nPuis :\n" +
          '  echo KEY | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production --force\n' +
          '  (idem preview / development)\n',
      );
    } else {
      console.log(
        "\nClés API listées sans service_role exposé. Copie-la depuis le Dashboard → API Keys.",
      );
      console.log(
        "Noms reçus:",
        list.map((k) => k.name || k.id || k.type).join(", "),
      );
    }
  } catch (e) {
    console.warn("Impossible de lister les API keys:", e.message);
    console.warn(
      "Copie SUPABASE_SERVICE_ROLE_KEY depuis:\n" +
        `https://supabase.com/dashboard/project/${REF}/settings/api-keys`,
    );
  }

  console.log("\nTerminé.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
