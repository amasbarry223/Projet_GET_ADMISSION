import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { mkdir, copyFile } from "fs/promises";
import path from "path";

// POST /api/profile/photo — upload photo de profil (BF-09)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
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
    uploaded = await saveUpload(file, `photos/${userId}`);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload échoué" },
      { status: 400 }
    );
  }

  // Copie vers public/uploads pour servir en static
  const publicDir = path.join(process.cwd(), "public", "uploads", "photos", userId);
  await mkdir(publicDir, { recursive: true });
  const fileName = path.basename(uploaded.cheminRelatif);
  const absUpload = path.join(process.cwd(), "upload", uploaded.cheminRelatif);
  const publicPath = path.join(publicDir, fileName);
  await copyFile(absUpload, publicPath);

  const photoUrl = `/uploads/photos/${userId}/${fileName}`;

  if (user.photoUrl?.startsWith("/uploads/")) {
    // ancien fichier laissé ; deleteUpload sur ancien chemin upload si possible
  }

  await db.user.update({
    where: { id: userId },
    data: { photoUrl },
  });

  return NextResponse.json({ success: true, photoUrl });
}
