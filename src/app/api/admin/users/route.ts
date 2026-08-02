import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { adminUserCreateSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/rbac";
import { sendMail, invitationEmailHtml } from "@/lib/mail";
import {
  canAssignRole,
  INTERNAL_ROLES,
  isStaffManagementRole,
} from "@/lib/admin-users";

function generateTempPassword(length = 14): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

// GET /api/admin/users — liste du personnel interne
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const gate = requirePermission((session.user as { role?: string }).role, "users.write");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

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

// POST /api/admin/users — créer / inviter un membre du personnel
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "";
  if (!isStaffManagementRole(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

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

  if (!canAssignRole(role, newRole)) {
    return NextResponse.json(
      {
        error:
          newRole === "SUPER_ADMIN"
            ? "Seul un super-administrateur peut créer un super-administrateur"
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

  const defaultPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

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

  await sendMail({
    to: user.email,
    subject: "Invitation GET Admission — votre compte",
    html: invitationEmailHtml(user.prenom, user.email, defaultPassword),
    text: `Bonjour ${user.prenom}, votre compte GET Admission a été créé. E-mail : ${user.email}. Mot de passe temporaire : ${defaultPassword}`,
  });

  await logAudit({
    session,
    action: "CREATE",
    resource: "user",
    resourceId: user.id,
    details: `Utilisateur créé : ${user.email} (${newRole})`,
  });

  return NextResponse.json(
    {
      ...user,
      defaultPassword,
    },
    { status: 201 },
  );
}
