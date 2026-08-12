import type { Metadata } from "next";
import { StaffSessionProvider } from "@/components/staff-session-provider";
import { AdminShell } from "@/components/admin/shell";
import { AdminThemeProvider } from "@/components/admin/admin-theme-provider";
import { AdminServiceWorkerRegister } from "@/components/admin/admin-sw-register";

// Session par utilisateur, jamais statique.
export const dynamic = "force-dynamic";

// Manifeste dédié (scope /admin) — installable séparément de la vitrine/espace candidat.
export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GA Back-office",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffSessionProvider>
      <AdminThemeProvider>
        <AdminServiceWorkerRegister />
        <AdminShell>{children}</AdminShell>
      </AdminThemeProvider>
    </StaffSessionProvider>
  );
}
