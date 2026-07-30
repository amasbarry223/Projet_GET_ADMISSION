import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/universites — liste publique (catalogue)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pays = searchParams.get("pays");
  const domaine = searchParams.get("domaine");
  const q = searchParams.get("q");

  const universites = await db.universite.findMany({
    where: {
      AND: [
        pays && pays !== "tous" ? { pays } : {},
        domaine && domaine !== "tous" ? { domaines: { contains: domaine } } : {},
        q ? {
          OR: [
            { nom: { contains: q } },
            { ville: { contains: q } },
            { pays: { contains: q } },
          ]
        } : {},
      ],
    },
    include: { formations: true },
    orderBy: { nom: "asc" },
  });

  // Parse JSON string fields
  const result = universites.map((u) => ({
    ...u,
    domaines: JSON.parse(u.domaines),
    pointsForts: JSON.parse(u.pointsForts),
  }));

  return NextResponse.json(result);
}
