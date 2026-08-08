import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertDossierFileAccess, buildPieceFilename, escapeHtml } from "@/lib/dossier/piece-print";

// GET /api/dossiers/[id]/pieces/[pieceId]/print — page d'impression (ouvre la boîte de dialogue d'impression du navigateur)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id, pieceId } = await params;
  const role = session.user.role;
  const userId = session.user.id;

  const piece = await db.piece.findFirst({
    where: { id: pieceId, dossierId: id },
    include: {
      dossier: {
        select: { candidatId: true, conseillerId: true, candidat: { select: { prenom: true, nom: true } } },
      },
    },
  });

  if (!piece || !piece.cheminFichier) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const access = assertDossierFileAccess(role, userId, piece.dossier.candidatId, piece.dossier.conseillerId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const candidat = piece.dossier.candidat;
  const ext = piece.type === "pdf" ? "pdf" : (piece.nomFichier?.split(".").pop() || "jpg");
  const filename = buildPieceFilename(`${candidat.prenom} ${candidat.nom}`, piece.libelle, ext);
  const isPdf = piece.type === "pdf";
  const src = `/api/dossiers/${id}/pieces/${pieceId}/download?disposition=inline`;
  const title = escapeHtml(filename);

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  html, body { margin: 0; height: 100%; background: #2b2b2b; }
  #doc { width: 100%; height: 100%; border: 0; display: block; }
  img#doc { object-fit: contain; background: #fff; }
  @media print {
    html, body { background: #fff; }
  }
</style>
</head>
<body>
  ${isPdf ? `<iframe id="doc" src="${src}"></iframe>` : `<img id="doc" src="${src}" alt="${title}" />`}
  <script>
    (function () {
      var el = document.getElementById("doc");
      function triggerPrint() {
        try {
          if (el.tagName === "IFRAME") {
            el.contentWindow.focus();
            el.contentWindow.print();
          } else {
            window.print();
          }
        } catch (e) {
          window.print();
        }
      }
      if (el.tagName === "IMG") {
        if (el.complete) triggerPrint();
        else el.onload = triggerPrint;
      } else {
        el.onload = triggerPrint;
      }
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
