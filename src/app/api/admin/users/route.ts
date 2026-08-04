import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { adminUserCreateSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { requireApiUser, requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import {
  canAssignRole,
  INTERNAL_ROLES,
  isStaffManagementRole,
} from "@/lib/admin-users";

// GET /api/admin/users — liste du personnel interne
export async function GET(request: Request) {
  const auth = await requireApiPermission("users.read");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const hasPagination = searchParams.has("page");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

  const where = { role: { in: INTERNAL_ROLES } };
  const orderBy = { createdAt: "asc" as const };
  const select = {
    id: true,
    email: true,
    prenom: true,
    nom: true,
    role: true,
    actif: true,
    createdAt: true,
    lastLoginAt: true,
    _count: { select: { dossiersConseiller: true } },
  };

  const mapToRow = (u: {
    id: string;
    email: string;
    prenom: string;
    nom: string;
    role: string;
    actif: boolean;
    createdAt: Date;
    lastLoginAt: Date | null;
    _count: { dossiersConseiller: number };
  }) => ({
    id: u.id,
    email: u.email,
    prenom: u.prenom,
    nom: u.nom,
    displayName: `${u.prenom} ${u.nom}`,
    initiales: `${u.prenom[0] ?? ""}${u.nom[0] ?? ""}`,
    role: u.role,
    actif: u.actif,
    date: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    dossiers: u._count.dossiersConseiller,
  });

  if (hasPagination) {
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      db.user.count({ where }),
    ]);
    return NextResponse.json({ data: users.map(mapToRow), total, page, pageSize });
  }

  const users = await db.user.findMany({ where, select, orderBy });
  return NextResponse.json(users.map(mapToRow));
}

// POST /api/admin/users — créer un membre du personnel (mot de passe défini par le Super Admin)
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { role } = auth.user;
  if (!isStaffManagementRole(role)) {
    return NextResponse.json(
      { error: "Seul un super-administrateur peut gérer le personnel" },
      { status: 403 },
    );
  }

  const rateLimited = await checkRateLimit(getClientId(request), "/api/admin/users");
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = parseOrRespond(adminUserCreateSchema, body);
  if (!parsed.ok) return parsed.response;
  const { prenom, nom, email, role: newRole, password } = parsed.data;

  if (!canAssignRole(role, newRole)) {
    return NextResponse.json(
      {
        error:
          newRole === "SUPER_ADMIN"
            ? "Seul un super-administrateur peut ajouter un Super Admin"
            : "Vous n'êtes pas autorisé à attribuer ce rôle",
      },
      { status: 403 },
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet e-mail" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      prenom: prenom.trim(),
      nom: nom.trim(),
      role: newRole,
      actif: true,
      emailVerified: new Date(),
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

  await logAudit({
    session: auth.session,
    action: "CREATE",
    resource: "user",
    resourceId: user.id,
    details: `Utilisateur créé : ${user.email} (${newRole})`,
  });

  return NextResponse.json(user, { status: 201 });
}
