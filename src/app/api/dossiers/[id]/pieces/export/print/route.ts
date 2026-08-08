import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertDossierFileAccess, escapeHtml } from "@/lib/dossier/piece-print";

// GET /api/dossiers/[id]/pieces/export/print — page d'impression du PDF groupé (toutes les pièces)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const role = session.user.role;
  const userId = session.user.id;

  const dossier = await db.dossier.findUnique({
    where: { id },
    select: { reference: true, candidatId: true, conseillerId: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  const access = assertDossierFileAccess(role, userId, dossier.candidatId, dossier.conseillerId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const src = `/api/dossiers/${id}/pieces/export?disposition=inline`;
  const title = escapeHtml(`Pièces du dossier ${dossier.reference}`);

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  html, body { margin: 0; height: 100%; background: #2b2b2b; }
  iframe { width: 100%; height: 100%; border: 0; display: block; }
</style>
</head>
<body>
  <iframe id="doc" src="${src}"></iframe>
  <script>
    (function () {
      var el = document.getElementById("doc");
      el.onload = function () {
        try {
          el.contentWindow.focus();
          el.contentWindow.print();
        } catch (e) {
          window.print();
        }
      };
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
