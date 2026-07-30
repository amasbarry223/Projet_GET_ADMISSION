import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/universites/[slug] — détail public
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const universite = await db.universite.findUnique({
    where: { slug },
    include: { formations: true },
  });

  if (!universite) {
    return NextResponse.json({ error: "Université non trouvée" }, { status: 404 });
  }

  const result = {
    ...universite,
    domaines: JSON.parse(universite.domaines),
    pointsForts: JSON.parse(universite.pointsForts),
    formations: universite.formations.map((f) => ({
      ...f,
      prerequis: JSON.parse(f.prerequis),
      piecesRequises: JSON.parse(f.piecesRequises),
    })),
  };

  return NextResponse.json(result);
}
