import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 3600; // Cache 1 heure

// GET /api/public/contact-info — singleton ContactInfo (id=1)
export async function GET() {
  try {
    const info = await db.contactInfo.findUnique({ where: { id: 1 } });
    return NextResponse.json(info ?? { email: "", telephone: "", adresses: "", horaires: "" });
  } catch {
    return NextResponse.json({ email: "", telephone: "", adresses: "", horaires: "" });
  }
}
