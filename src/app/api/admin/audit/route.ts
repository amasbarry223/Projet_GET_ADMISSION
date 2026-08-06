import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { paginationQuerySchema } from "@/lib/validations";

// GET /api/admin/audit — journal d'audit (staff uniquement, §4.7)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission(session.user.role, "audit.read");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource");
  const action = searchParams.get("action");
  const query = paginationQuerySchema.parse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });
  const page = query.page;
  const pageSize = query.pageSize;

  const where = {
    ...(resource && resource !== "tous" ? { resource } : {}),
    ...(action && action !== "tous" ? { action } : {}),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    data: logs.map((l) => ({
      ...l,
      date: l.date.toISOString(),
    })),
    total,
    page,
    pageSize,
  });
}
