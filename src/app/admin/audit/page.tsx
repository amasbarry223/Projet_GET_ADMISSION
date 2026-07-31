import { db } from "@/lib/db";
import { AuditClient } from "@/components/admin/audit-client";
import { requireAdminPage } from "@/lib/admin-page-auth";

export default async function AuditPage() {
  await requireAdminPage("audit.read");

  const logs = await db.auditLog.findMany({
    orderBy: { date: "desc" },
    take: 50,
  });

  const data = logs.map((l) => ({
    ...l,
    date: l.date.toISOString(),
  }));

  return <AuditClient initialData={data} />;
}
