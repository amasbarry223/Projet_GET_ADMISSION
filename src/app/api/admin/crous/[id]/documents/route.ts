import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-auth";
import { saveUpload } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

// POST /api/admin/crous/[id]/documents — téléverse un document lié à une demande CROUS (SUPER_ADMIN uniquement)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("crous.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const demande = await db.demandeCrous.findUnique({ where: { id } });
  if (!demande) {
    return NextResponse.json({ error: "Demande CROUS non trouvée" }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const libelle = form.get("libelle");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }

  let uploaded;
  try {
    uploaded = await saveUpload(file, `crous/${id}`, { visibility: "private" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload échoué" },
      { status: 400 },
    );
  }

  const document = await db.demandeCrousDocument.create({
    data: {
      demandeId: id,
      libelle: typeof libelle === "string" && libelle.trim() ? libelle.trim() : uploaded.nomFichier,
      nomFichier: uploaded.nomFichier,
      cheminFichier: uploaded.cheminRelatif,
      taille: uploaded.taille,
    },
  });

  await logAudit({
    session: auth.session,
    action: "CREATE",
    resource: "crous",
    resourceId: id,
    details: `Ajout du document « ${document.libelle} » à la demande CROUS`,
  });

  return NextResponse.json({ document }, { status: 201 });
}
