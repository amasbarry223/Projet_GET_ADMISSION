import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AuditClient } from "@/components/admin/audit-client";

export default async function AuditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === "CANDIDAT") {
    redirect("/connexion");
  }

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
