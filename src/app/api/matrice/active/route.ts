import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadActiveMatriceRegles } from "@/lib/dossier/matrice-loader";
import { buildPiecesFromRegles } from "@/lib/dossier/matrice-engine";
import { buildPiecesRequises, type ProfilAcademiqueInput } from "@/lib/dossier/pieces-requises";

/** GET — règles actives (candidat / staff). ?simulate=1 + body via POST for preview. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const regles = await loadActiveMatriceRegles();
  return NextResponse.json({ regles: regles ?? [], source: regles ? "matrice" : "fallback" });
}

/** POST — simuler pièces pour un profil (aperçu admin / wizard). */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  let profil: ProfilAcademiqueInput;
  try {
    profil = (await request.json()) as ProfilAcademiqueInput;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const regles = await loadActiveMatriceRegles();
  const pieces =
    regles && regles.length > 0
      ? buildPiecesFromRegles(profil, regles)
      : buildPiecesRequises(profil);
  return NextResponse.json({ pieces, source: regles ? "matrice" : "fallback" });
}
