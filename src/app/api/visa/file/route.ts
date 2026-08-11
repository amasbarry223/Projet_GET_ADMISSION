import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";
import { isStaff } from "@/lib/rbac";
import path from "path";

// GET /api/visa/file?userId=xxx&disposition=inline — Streaming du visa scanné
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const url = new URL(request.url);
  const targetUserId = url.searchParams.get("userId") || session.user.id;
  const disposition = url.searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  // Droits : Le candidat ne peut voir que son propre visa. Le staff peut voir celui de tout candidat.
  const isSelf = session.user.id === targetUserId;
  const isStaffUser = isStaff(session.user.role);

  if (!isSelf && !isStaffUser) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const visa = await db.demandeVisa.findUnique({
    where: { candidatId: targetUserId },
  });

  if (!visa || !visa.fichierVisaUrl) {
    return NextResponse.json({ error: "Aucun visa scanné disponible pour ce candidat" }, { status: 404 });
  }

  try {
    const { buffer, contentType, fileName } = await readUpload(visa.fichierVisaUrl, "private");
    const ext = path.extname(fileName).toLowerCase() || path.extname(visa.fichierVisaUrl).toLowerCase() || ".pdf";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="visa-${targetUserId}${ext}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier inaccessible sur le serveur" }, { status: 404 });
  }
}
