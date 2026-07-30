import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/dossiers — liste (candidat: ses dossiers ; staff: tous)
//
// Comportement de pagination (backward compatible) :
// - Sans `?page=`      → renvoie un tableau plat (legacy).
// - Avec `?page=N`      → renvoie { data, total, page, pageSize }.
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // --- Params de pagination (optionnels) ---
  const { searchParams } = new URL(request.url);
  const hasPagination = searchParams.has("page");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

  // --- Where + include partagés ---
  const where = role === "CANDIDAT" ? { candidatId: userId } : {};
  const include =
    role === "CANDIDAT"
      ? {
          candidat: { select: { prenom: true, nom: true, email: true, nationalite: true, telephone: true } },
          universite: true,
          formation: true,
          conseiller: { select: { prenom: true, nom: true } },
          pieces: true,
          paiements: true,
          historiques: { orderBy: { date: "asc" as const } },
        }
      : {
          candidat: { select: { prenom: true, nom: true, email: true, nationalite: true } },
          universite: true,
          formation: true,
          conseiller: { select: { prenom: true, nom: true } },
          pieces: true,
          paiements: true,
          historiques: { orderBy: { date: "asc" as const } },
        };

  if (hasPagination) {
    const [dossiers, total] = await Promise.all([
      db.dossier.findMany({
        where,
        include,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      db.dossier.count({ where }),
    ]);
    return NextResponse.json({ data: dossiers, total, page, pageSize });
  }

  // Legacy flat array (no pagination requested)
  const dossiers = await db.dossier.findMany({
    where,
    include,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(dossiers);
}
