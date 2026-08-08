import { StaffSessionProvider } from "@/components/staff-session-provider";
import { AdminShell } from "@/components/admin/shell";
import { AdminThemeProvider } from "@/components/admin/admin-theme-provider";

// Session par utilisateur, jamais statique.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffSessionProvider>
      <AdminThemeProvider>
        <AdminShell>{children}</AdminShell>
      </AdminThemeProvider>
    </StaffSessionProvider>
  );
}
