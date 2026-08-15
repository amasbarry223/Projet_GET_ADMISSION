import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { adminCandidatCreateSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

// GET /api/admin/candidats — liste des candidats (Admin/Super Admin)
export async function GET() {
  const auth = await requireApiPermission("candidats.read");
  if (!auth.ok) return auth.response;

  const candidats = await db.user.findMany({
    where: { role: "CANDIDAT" },
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      telephone: true,
      nationalite: true,
      actif: true,
      kycVerifie: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { dossiersCandidat: true } },
      dossiersCandidat: {
        where: { conseillerId: { not: null } },
        select: {
          conseillerId: true,
          conseiller: { select: { prenom: true, nom: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    candidats.map((c) => {
      const assigned = c.dossiersCandidat[0];
      const conseillerNom = assigned?.conseiller
        ? `${assigned.conseiller.prenom} ${assigned.conseiller.nom}`
        : null;
      return {
        id: c.id,
        email: c.email,
        prenom: c.prenom,
        nom: c.nom,
        telephone: c.telephone,
        nationalite: c.nationalite,
        actif: c.actif,
        kycVerifie: c.kycVerifie,
        dossiers: c._count.dossiersCandidat,
        date: c.createdAt.toISOString(),
        lastLoginAt: c.lastLoginAt?.toISOString() ?? null,
        conseillerId: assigned?.conseillerId ?? null,
        conseillerNom,
        isAssignedToConseiller: Boolean(assigned?.conseillerId),
      };
    }),
  );
}

// POST /api/admin/candidats — créer un compte candidat (Admin/Super Admin)
export async function POST(request: Request) {
  const auth = await requireApiPermission("candidats.write");
  if (!auth.ok) return auth.response;

  const rateLimited = await checkRateLimit(getClientId(request), "/api/admin/candidats");
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = parseOrRespond(adminCandidatCreateSchema, body);
  if (!parsed.ok) return parsed.response;
  const { prenom, nom, email, telephone, nationalite } = parsed.data;

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await db.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail" }, { status: 409 });
  }

  // Mot de passe temporaire — le candidat pourra le réinitialiser via "Mot de passe oublié".
  const tempPassword = `${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const candidat = await db.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      prenom: prenom.trim(),
      nom: nom.trim(),
      telephone: telephone?.trim() || null,
      nationalite: nationalite?.trim() || null,
      role: "CANDIDAT",
      actif: true,
      emailVerified: new Date(),
    },
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      telephone: true,
      nationalite: true,
      actif: true,
      createdAt: true,
    },
  });

  await logAudit({
    session: auth.session,
    action: "CREATE",
    resource: "user",
    resourceId: candidat.id,
    details: `Compte candidat créé par le staff : ${candidat.email}`,
  });

  return NextResponse.json(
    { ...candidat, tempPassword, dossiers: 0, kycVerifie: false, lastLoginAt: null, date: candidat.createdAt.toISOString() },
    { status: 201 },
  );
}
