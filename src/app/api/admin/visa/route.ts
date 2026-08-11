import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/rbac";

// GET /api/admin/visa — Liste des demandes de visa pour Admin & SuperAdmin
export async function GET() {
  const session = await getSession("staff");
  if (!session?.user || !isStaff(session.user.role)) {
    return NextResponse.json({ error: "Non autorise — Accès restreint au personnel" }, { status: 403 });
  }

  // Vérifier qu'il s'agit bien d'un rôle d'administration (ADMIN ou SUPER_ADMIN)
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "CONSEILLER") {
    return NextResponse.json({ error: "Privilèges insuffisants pour gérer les visas." }, { status: 403 });
  }

  try {
    const visas = await db.demandeVisa.findMany({
      include: {
        candidat: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            telephone: true,
            nationalite: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const items = visas.map((v) => ({
      id: v.id,
      candidatId: v.candidatId,
      candidatNom: `${v.candidat.prenom} ${v.candidat.nom}`,
      candidatEmail: v.candidat.email,
      candidatTelephone: v.candidat.telephone ?? "Non renseigné",
      candidatNationalite: v.candidat.nationalite ?? "Non renseigné",
      statut: v.statut,
      fichierVisaUrl: v.fichierVisaUrl,
      motifRefus: v.motifRefus,
      remarqueAdmin: v.remarqueAdmin,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));

    return NextResponse.json({ visas: items });
  } catch (error) {
    console.error("Erreur récuperation visas admin:", error);
    return NextResponse.json({ error: "Impossible de charger la liste des visas" }, { status: 500 });
  }
}
