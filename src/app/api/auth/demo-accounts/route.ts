import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/auth/demo-accounts — retourne les comptes démo (email + rôle + libellé)
// Permet au login page d'afficher les boutons de connexion rapide dynamiquement.
// NOTE : ne retourne JAMAIS de mots de passe. Le mot de passe démo est "demo1234" (communiqué côté UI).
export async function GET() {
  // Récupère les utilisateurs actifs, triés par rôle (candidat d'abord, puis staff)
  const roleOrder = ["CANDIDAT", "CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"];
  const users = await db.user.findMany({
    where: { actif: true },
    select: {
      email: true,
      prenom: true,
      nom: true,
      role: true,
    },
  });

  const roleLabels: Record<string, { label: string; desc: string; href: string }> = {
    CANDIDAT: { label: "Candidat", desc: "Suivi du dossier", href: "/espace" },
    CONSEILLER: { label: "Conseiller", desc: "Gère les dossiers", href: "/admin/dossiers" },
    FINANCIER: { label: "Financier", desc: "Transactions", href: "/admin/finance" },
    ADMIN: { label: "Admin", desc: "Pilotage", href: "/admin" },
    SUPER_ADMIN: { label: "Super Admin", desc: "Configuration", href: "/admin/parametres" },
  };

  const accounts = users
    .map((u) => ({
      email: u.email,
      role: u.role,
      label: roleLabels[u.role]?.label ?? u.role,
      desc: roleLabels[u.role]?.desc ?? "",
      href: roleLabels[u.role]?.href ?? "/espace",
      prenom: u.prenom,
      nom: u.nom,
    }))
    .sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role));

  return NextResponse.json({ accounts, demoPassword: "demo1234" });
}
