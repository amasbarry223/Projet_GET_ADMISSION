import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/notifications — notifications de l'utilisateur connecté
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "1";

  const notifications = await db.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { lu: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await db.notification.count({ where: { userId, lu: false } });

  return NextResponse.json({ notifications, unreadCount });
}

// PUT /api/notifications — marquer comme lues { ids?: string[], all?: boolean }
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json().catch(() => ({}));

  if (body.all) {
    await db.notification.updateMany({ where: { userId, lu: false }, data: { lu: true } });
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    await db.notification.updateMany({
      where: { userId, id: { in: body.ids } },
      data: { lu: true },
    });
  }

  const unreadCount = await db.notification.count({ where: { userId, lu: false } });
  return NextResponse.json({ success: true, unreadCount });
}
