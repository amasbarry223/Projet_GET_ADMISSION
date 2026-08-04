import { AdminShell } from "@/components/admin/shell";
import { ForceLightDocument } from "@/components/site/force-light-document";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ForceLightDocument />
      <AdminShell>{children}</AdminShell>
    </>
  );
}
