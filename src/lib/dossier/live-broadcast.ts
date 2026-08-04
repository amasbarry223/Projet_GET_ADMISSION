/**
 * Wake-up temps réel via Supabase Realtime Broadcast (pas OTP).
 * Payload minimal : le client rafraîchit ensuite via l’API NextAuth + Prisma.
 */
export const DOSSIER_LIVE_CHANNEL = "dossier-suivi-live";

export type DossierLiveBroadcastPayload = {
  type: "dossier_updated";
  dossierId: string;
  etat: string;
  at: string;
};

export async function broadcastDossierLive(
  payload: Omit<DossierLiveBroadcastPayload, "type" | "at"> & {
    at?: string;
    /** @deprecated non diffusé (fuite métadonnées) */
    candidatId?: string;
  },
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const body: DossierLiveBroadcastPayload = {
    type: "dossier_updated",
    dossierId: payload.dossierId,
    etat: payload.etat,
    at: payload.at ?? new Date().toISOString(),
  };

  try {
    // API HTTP Broadcast — pas de session WebSocket serveur à maintenir
    const res = await fetch(`${url.replace(/\/$/, "")}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `realtime:${DOSSIER_LIVE_CHANNEL}`,
            event: "dossier_updated",
            payload: body,
          },
        ],
      }),
    });
    if (!res.ok) {
      // Fallback canal supabase-js si l’endpoint HTTP n’est pas dispo
      const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
      const supabase = createSupabaseAdminClient();
      const channel = supabase.channel(DOSSIER_LIVE_CHANNEL);
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("subscribe timeout")), 4000);
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(t);
            resolve();
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(t);
            reject(new Error(status));
          }
        });
      });
      await channel.send({ type: "broadcast", event: "dossier_updated", payload: body });
      await supabase.removeChannel(channel);
    }
  } catch (err) {
    console.warn("[live-broadcast] échec non bloquant:", err);
  }
}
