/**
 * Broadcast temps réel générique via Supabase Realtime — utilisé pour réveiller les clients
 * (ils rafraîchissent ensuite via l'API REST classique ; aucune donnée sensible dans le payload).
 */
export async function broadcastRealtime(channel: string, event: string, payload: unknown): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

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
        messages: [{ topic: `realtime:${channel}`, event, payload }],
      }),
    });
    if (!res.ok) {
      // Fallback canal supabase-js si l'endpoint HTTP n'est pas dispo
      const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
      const supabase = createSupabaseAdminClient();
      const ch = supabase.channel(channel);
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("subscribe timeout")), 4000);
        ch.subscribe((status) => {
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
      await ch.send({ type: "broadcast", event, payload });
      await supabase.removeChannel(ch);
    }
  } catch (err) {
    console.warn(`[realtime] broadcast échoué (${channel}/${event}):`, err);
  }
}
