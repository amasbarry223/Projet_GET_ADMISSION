import { AdminShell } from "@/components/admin/shell";
import { AdminThemeProvider } from "@/components/admin/admin-theme-provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <AdminShell>{children}</AdminShell>
    </AdminThemeProvider>
  );
}
