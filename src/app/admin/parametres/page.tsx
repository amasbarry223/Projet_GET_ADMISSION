import { requireAdminPage } from "@/lib/admin-page-auth";
import AdminParametresClient from "./parametres-client";

export default async function AdminParametresPage() {
  await requireAdminPage("parametres.read");
  return <AdminParametresClient />;
}
