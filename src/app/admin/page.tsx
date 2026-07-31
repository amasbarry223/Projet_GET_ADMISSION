import { requireAdminPage } from "@/lib/admin-page-auth";
import AdminDashboardClient from "./dashboard-client";

export default async function AdminDashboardPage() {
  await requireAdminPage("dashboard");
  return <AdminDashboardClient />;
}
