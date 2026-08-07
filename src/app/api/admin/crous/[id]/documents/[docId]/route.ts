import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-auth";
import { deleteUpload } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

// DELETE /api/admin/crous/[id]/documents/[docId] — supprime un document d'une demande CROUS (SUPER_ADMIN uniquement)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const auth = await requireApiPermission("crous.manage");
  if (!auth.ok) return auth.response;

  const { id, docId } = await params;
  const document = await db.demandeCrousDocument.findUnique({ where: { id: docId } });
  if (!document || document.demandeId !== id) {
    return NextResponse.json({ error: "Document non trouvé" }, { status: 404 });
  }

  await deleteUpload(document.cheminFichier, "private");
  await db.demandeCrousDocument.delete({ where: { id: docId } });

  await logAudit({
    session: auth.session,
    action: "DELETE",
    resource: "crous",
    resourceId: id,
    details: `Suppression du document « ${document.libelle} » de la demande CROUS`,
  });

  return NextResponse.json({ success: true });
}
