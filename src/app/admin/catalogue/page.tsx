import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { normalizeUniversite } from "@/lib/types";
import { CatalogueClient } from "@/components/admin/catalogue-client";

// Server component — fetches the full catalogue (universités + formations) via Prisma
// and parses JSON string fields via normalizeUniversite. No client waterfall.
// Auth: any staff member (not CANDIDAT).
export default async function AdminCataloguePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role === "CANDIDAT") redirect("/connexion");

  const universites = await db.universite.findMany({
    include: { formations: true },
    orderBy: { nom: "asc" },
  });

  // Parse JSON string fields (SQLite limitation) into real arrays.
  const data = universites.map(normalizeUniversite);

  return <CatalogueClient initialData={data} />;
}
