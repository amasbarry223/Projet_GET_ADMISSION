import { broadcastRealtime } from "@/lib/realtime/broadcast";

/** Messagerie candidat <-> conseiller (par dossier). */
export const MESSAGES_LIVE_CHANNEL = "messages-live";
/** Messagerie interne Financier/Conseiller <-> Admin/Super Admin. */
export const MESSAGES_INTERNES_LIVE_CHANNEL = "messages-internes-live";

export async function broadcastMessageLive(dossierId: string): Promise<void> {
  await broadcastRealtime(MESSAGES_LIVE_CHANNEL, "message_created", {
    dossierId,
    at: new Date().toISOString(),
  });
}

export async function broadcastMessageInterneLive(conversationId: string): Promise<void> {
  await broadcastRealtime(MESSAGES_INTERNES_LIVE_CHANNEL, "message_interne_created", {
    conversationId,
    at: new Date().toISOString(),
  });
}
