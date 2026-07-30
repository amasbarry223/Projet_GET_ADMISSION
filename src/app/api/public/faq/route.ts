import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/faq — FAQ publique (questions actives, triées par ordre)
export async function GET() {
  const faq = await db.faq.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
  return NextResponse.json(faq);
}
