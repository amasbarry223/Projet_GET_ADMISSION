import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

// POST /api/contact — soumission du formulaire de contact (public)
//
// Body: { prenom, nom, email, telephone?, objet, message }
// - Rate limité à 5 messages / min / IP
// - Crée un ContactMessage (traite = false par défaut)
export async function POST(request: Request) {
  // Rate limiting (5 messages contact / min / IP)
  const rateLimited = checkRateLimit(getClientId(request), "/api/contact");
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(contactSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { prenom, nom, email, telephone, objet, message } = parsed.data;

  const created = await db.contactMessage.create({
    data: {
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.toLowerCase().trim(),
      telephone: telephone?.trim() ?? null,
      objet: objet.trim(),
      message: message.trim(),
    },
  });

  return NextResponse.json(
    { success: true, id: created.id },
    { status: 201 }
  );
}

// GET /api/contact — liste des messages de contact (staff uniquement)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const hasPagination = searchParams.has("page");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));
  const traite = searchParams.get("traite");

  const where = traite === "true" ? { traite: true } : traite === "false" ? { traite: false } : {};
  const orderBy = { createdAt: "desc" as const };

  if (hasPagination) {
    const [messages, total] = await Promise.all([
      db.contactMessage.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      db.contactMessage.count({ where }),
    ]);
    return NextResponse.json({ data: messages, total, page, pageSize });
  }

  const messages = await db.contactMessage.findMany({ where, orderBy });
  return NextResponse.json(messages);
}
