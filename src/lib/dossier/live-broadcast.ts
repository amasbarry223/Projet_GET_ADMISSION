/**
 * Wake-up temps réel via Supabase Realtime Broadcast (pas OTP).
 * Payload minimal : le client rafraîchit ensuite via l'API NextAuth + Prisma.
 */
import { broadcastRealtime } from "@/lib/realtime/broadcast";

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
  const body: DossierLiveBroadcastPayload = {
    type: "dossier_updated",
    dossierId: payload.dossierId,
    etat: payload.etat,
    at: payload.at ?? new Date().toISOString(),
  };
  await broadcastRealtime(DOSSIER_LIVE_CHANNEL, "dossier_updated", body);
}
