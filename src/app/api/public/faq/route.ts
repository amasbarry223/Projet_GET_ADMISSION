import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 3600; // Cache 1 heure

// GET /api/public/faq — FAQ publique (questions actives, triées par ordre)
export async function GET() {
  const faq = await db.faq.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
  return NextResponse.json(faq);
}
