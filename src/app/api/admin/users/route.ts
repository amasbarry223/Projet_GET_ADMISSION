import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/users — liste des utilisateurs (staff uniquement)
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
  if (role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // --- Params de pagination (optionnels) ---
  const { searchParams } = new URL(request.url);
  const hasPagination = searchParams.has("page");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

  const orderBy = { createdAt: "asc" as const };
  const select = {
    id: true,
    email: true,
    prenom: true,
    nom: true,
    role: true,
    actif: true,
    createdAt: true,
    _count: { select: { dossiersConseiller: true } },
  };

  const mapToRow = (u: any) => ({
    id: u.id,
    email: u.email,
    nom: `${u.prenom} ${u.nom}`,
    initiales: `${u.prenom[0] ?? ""}${u.nom[0] ?? ""}`,
    role: u.role,
    actif: u.actif,
    date: u.createdAt.toISOString(),
    dossiers: u._count.dossiersConseiller,
  });

  if (hasPagination) {
    const [users, total] = await Promise.all([
      db.user.findMany({
        select,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      db.user.count(),
    ]);
    return NextResponse.json({ data: users.map(mapToRow), total, page, pageSize });
  }

  const users = await db.user.findMany({ select, orderBy });
  return NextResponse.json(users.map(mapToRow));
}
