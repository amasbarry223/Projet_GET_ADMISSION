import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CANDIDAT_DOSSIER_INCLUDE,
  dossierLiveFingerprint,
} from "@/lib/dossier/candidat-dossier-include";
import { pickPrimaryDossier } from "@/lib/dossier/pick-dossier";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TICK_MS = 2500;
const HEARTBEAT_MS = 15000;

function serializeLiveDossier(d: {
  id: string;
  reference: string;
  etat: string;
  etapeActuelle: number;
  fraisAgence: number;
  mrz: string;
  paiementStatut: string;
  createdAt: Date;
  updatedAt: Date;
  candidat: unknown;
  universite: unknown;
  formation: unknown;
  conseiller: unknown;
  pieces: { televerseeLe: Date | null }[];
  paiements: { date: Date }[];
  historiques: { date: Date }[];
  conversation: { nonLusCandidat: number } | null;
}) {
  return {
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    pieces: d.pieces.map((p) => ({
      ...p,
      televerseeLe: p.televerseeLe?.toISOString() ?? null,
    })),
    paiements: d.paiements.map((p) => ({
      ...p,
      date: p.date.toISOString(),
    })),
    historiques: d.historiques.map((h) => ({
      ...h,
      date: h.date.toISOString(),
    })),
    conversation: d.conversation,
  };
}

/**
 * GET /api/dossiers/live — flux SSE authentifié (BF-24).
 * Pousse le dossier principal du candidat dès qu’une empreinte change.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;
  if (role !== "CANDIDAT" || !userId) {
    return new Response(JSON.stringify({ error: "Réservé aux candidats" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(request.url);
  const preferredId = searchParams.get("dossierId");

  const encoder = new TextEncoder();
  let closed = false;
  let lastFp = "";
  let lastHeartbeat = Date.now();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const tick = async () => {
        if (closed) return;
        try {
          const rows = await db.dossier.findMany({
            where: { candidatId: userId },
            include: CANDIDAT_DOSSIER_INCLUDE,
            orderBy: { updatedAt: "desc" },
          });
          const primary =
            (preferredId ? rows.find((r) => r.id === preferredId) : null) ??
            pickPrimaryDossier(rows) ??
            null;

          if (!primary) {
            const fp = "empty";
            if (fp !== lastFp) {
              lastFp = fp;
              send("dossier", { dossier: null });
            }
          } else {
            const fp = dossierLiveFingerprint(primary);
            if (fp !== lastFp) {
              lastFp = fp;
              send("dossier", { dossier: serializeLiveDossier(primary) });
            }
          }

          const now = Date.now();
          if (now - lastHeartbeat >= HEARTBEAT_MS) {
            lastHeartbeat = now;
            send("ping", { t: now });
          }
        } catch (err) {
          console.error("[dossiers/live]", err);
          send("error", { message: "sync" });
        }
      };

      void tick();
      const interval = setInterval(() => void tick(), TICK_MS);

      const abort = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", abort);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
