import { StaffSessionProvider } from "@/components/staff-session-provider";

/**
 * /back-office est le point d'entrée de login staff, hors de l'arborescence /admin/* — il a
 * besoin du même SessionProvider scopé staff (cookie de session dédié, voir src/lib/auth.ts)
 * pour que signIn()/getSession() y ciblent le bon portail.
 *
 * force-dynamic : jamais de contenu statique/caché pour une page de login/session.
 */
export const dynamic = "force-dynamic";

export default function BackOfficeLayout({ children }: { children: React.ReactNode }) {
  return <StaffSessionProvider>{children}</StaffSessionProvider>;
}
