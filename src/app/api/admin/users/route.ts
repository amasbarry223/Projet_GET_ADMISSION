import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { adminUserCreateSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

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

// POST /api/admin/users — inviter un nouvel utilisateur (admin uniquement)
//
// Body: { prenom, nom, email, role }
// - Mot de passe par défaut : "demo1234"
// - Email doit être unique
// - Rôle peut être CANDIDAT, CONSEILLER, FINANCIER, ADMIN, SUPER_ADMIN
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Rate limiting (10 invitations / min / IP)
  const rateLimited = checkRateLimit(getClientId(request), "/api/admin/users");
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(adminUserCreateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { prenom, nom, email, role: newRole } = parsed.data;

  // Un ADMIN non-SUPER_ADMIN ne peut pas créer de SUPER_ADMIN
  if (newRole === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Seul un super-administrateur peut créer un autre super-administrateur" },
      { status: 403 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Vérifier que l'email n'existe pas déjà
  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet e-mail" },
      { status: 409 }
    );
  }

  // Hasher le mot de passe par défaut
  const defaultPassword = "demo1234";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      prenom: prenom.trim(),
      nom: nom.trim(),
      role: newRole,
      actif: true,
    },
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      role: true,
      actif: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    {
      ...user,
      defaultPassword, // retourné une seule fois pour communication à l'utilisateur
    },
    { status: 201 }
  );
}
