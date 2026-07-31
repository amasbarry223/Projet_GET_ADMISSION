import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { normalizeUniversite } from "@/lib/types";
import { requireAdminPage } from "@/lib/admin-page-auth";
import { CatalogueDetailClient } from "@/components/admin/catalogue-detail-client";

export default async function AdminCatalogueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage("catalogue.write");

  const { id } = await params;
  const row = await db.universite.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { formations: true },
  });
  if (!row) notFound();

  return <CatalogueDetailClient universite={normalizeUniversite(row)} />;
}
