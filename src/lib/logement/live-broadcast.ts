import { broadcastRealtime } from "@/lib/realtime/broadcast";

/** Canal unique pour les mises à jour de demandes de logement (réservation + CROUS). */
export const LOGEMENT_LIVE_CHANNEL = "logement-live";

export async function broadcastLogementLive(payload: {
  reservationId?: string;
  demandeId?: string;
  candidatId: string;
  statut: string;
}): Promise<void> {
  await broadcastRealtime(LOGEMENT_LIVE_CHANNEL, "logement_updated", {
    ...payload,
    at: new Date().toISOString(),
  });
}
