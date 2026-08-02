import { requireAdminPage } from "@/lib/admin-page-auth";
import { MatriceAdminClient } from "./matrice-admin-client";

export default async function MatricePage() {
  await requireAdminPage("matrice.write");
  return <MatriceAdminClient />;
}
