import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUpload, deletePublicMedia } from "@/lib/storage";

// POST /api/profile/photo — upload photo de profil (BF-09)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = session.user.id;
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "La photo doit être une image (JPG, PNG, WEBP)" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  let uploaded;
  try {
    uploaded = await saveUpload(file, `photos/${userId}`, { visibility: "public" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload échoué" },
      { status: 400 }
    );
  }

  const photoUrl = uploaded.publicUrl;
  if (!photoUrl) {
    return NextResponse.json({ error: "Publication du fichier échouée" }, { status: 500 });
  }

  if (user.photoUrl) {
    await deletePublicMedia(user.photoUrl);
  }

  await db.user.update({
    where: { id: userId },
    data: { photoUrl },
  });

  return NextResponse.json({ success: true, photoUrl });
}
