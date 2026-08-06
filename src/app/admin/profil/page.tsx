import { requireAdminPage } from "@/lib/admin-page-auth";
import AdminProfilClient from "./profil-client";

export default async function AdminProfilPage() {
  await requireAdminPage("dashboard");
  return <AdminProfilClient />;
}
