import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";
import { fetchDemandeCrous, getAvailableAttachments } from "@/lib/crous/partage";

// GET /api/admin/crous/[id] — détail d'une demande CROUS (SUPER_ADMIN uniquement)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("crous.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const demande = await fetchDemandeCrous(id);
  if (!demande) {
    return NextResponse.json({ error: "Demande CROUS non trouvée" }, { status: 404 });
  }

  return NextResponse.json({
    demande,
    disponibilite: getAvailableAttachments(demande),
  });
}
