import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptionsStaff } from "@/lib/auth";
import { hasPermission, requirePermission, type Permission } from "@/lib/rbac";

/** Guard serveur pour les pages /admin — defense-in-depth au-delà du middleware */
export async function requireAdminPage(permission: Permission) {
  const session = await getServerSession(authOptionsStaff);
  if (!session?.user) redirect("/back-office");

  const role = session.user.role;
  const gate = requirePermission(role, permission);
  if (!gate.ok) {
    if (hasPermission(role, "dossiers.read")) redirect("/admin/dossiers");
    if (hasPermission(role, "finance.read")) redirect("/admin/finance");
    if (hasPermission(role, "dashboard")) redirect("/admin");
    redirect("/back-office");
  }
  return session;
}
