import { requireAdminPage } from "@/lib/admin-page-auth";
import DossierDetailClient from "./dossier-detail-client";

export default async function AdminDossierDetailPage() {
  await requireAdminPage("dossiers.read");
  return <DossierDetailClient />;
}
