import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/contact-info — singleton ContactInfo (id=1)
export async function GET() {
  const info = await db.contactInfo.findUnique({ where: { id: 1 } });
  return NextResponse.json(info ?? { email: "", telephone: "", adresses: "", horaires: "" });
}
