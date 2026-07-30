import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/dossiers — liste (candidat: ses dossiers ; staff: tous)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  let dossiers;
  if (role === "CANDIDAT") {
    dossiers = await db.dossier.findMany({
      where: { candidatId: userId },
      include: {
        candidat: { select: { prenom: true, nom: true, email: true, nationalite: true, telephone: true } },
        universite: true,
        formation: true,
        conseiller: { select: { prenom: true, nom: true } },
        pieces: true,
        paiements: true,
        historiques: { orderBy: { date: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
  } else {
    // Staff (conseiller, financier, admin, super-admin) — tous les dossiers
    dossiers = await db.dossier.findMany({
      include: {
        candidat: { select: { prenom: true, nom: true, email: true, nationalite: true } },
        universite: true,
        formation: true,
        conseiller: { select: { prenom: true, nom: true } },
        pieces: true,
        paiements: true,
        historiques: { orderBy: { date: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  return NextResponse.json(dossiers);
}
