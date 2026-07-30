import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 0; // Pas de cache — les comptes démo peuvent changer

// GET /api/auth/demo-accounts — retourne les comptes démo officiels depuis la DB
// Filtre : isDemo = true AND actif = true
// Ne retourne JAMAIS de mots de passe ni de passwordHash.
export async function GET() {
  const roleOrder = ["CANDIDAT", "CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"];

  const roleLabels: Record<string, { label: string; desc: string; href: string }> = {
    CANDIDAT: { label: "Candidat", desc: "Suivi du dossier", href: "/espace" },
    CONSEILLER: { label: "Conseiller", desc: "Gère les dossiers", href: "/admin/dossiers" },
    FINANCIER: { label: "Financier", desc: "Transactions", href: "/admin/finance" },
    ADMIN: { label: "Admin", desc: "Pilotage", href: "/admin" },
    SUPER_ADMIN: { label: "Super Admin", desc: "Configuration", href: "/admin/parametres" },
  };

  // Récupère UNIQUEMENT les comptes marqués isDemo=true et actifs
  const users = await db.user.findMany({
    where: { isDemo: true, actif: true },
    select: {
      email: true,
      prenom: true,
      nom: true,
      role: true,
      photoUrl: true,
    },
  });

  const accounts = users
    .map((u) => ({
      email: u.email,
      role: u.role,
      label: roleLabels[u.role]?.label ?? u.role,
      desc: roleLabels[u.role]?.desc ?? "",
      href: roleLabels[u.role]?.href ?? "/espace",
      prenom: u.prenom,
      nom: u.nom,
      photoUrl: u.photoUrl,
    }))
    .sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role));

  return NextResponse.json({
    accounts,
    demoPassword: "demo1234",
    count: accounts.length,
  });
}
