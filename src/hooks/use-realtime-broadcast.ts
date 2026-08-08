"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * S'abonne à un canal Supabase Realtime Broadcast et appelle `onMessage` (debounced) à chaque
 * event reçu — simple signal de réveil, le payload n'est jamais utilisé directement : l'appelant
 * refait ensuite un fetch REST classique. Non bloquant si Realtime est indisponible.
 */
export function useRealtimeBroadcast(
  channel: string,
  event: string,
  onMessage: () => void,
  debounceMs = 500,
) {
  const onMessageRef = React.useRef(onMessage);
  React.useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  React.useEffect(() => {
    let cancelled = false;
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    let ch: RealtimeChannel | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    void (async () => {
      try {
        supabase = createSupabaseBrowserClient();
        ch = supabase
          .channel(channel)
          .on("broadcast", { event }, () => {
            if (cancelled) return;
            if (debounce) clearTimeout(debounce);
            debounce = setTimeout(() => {
              onMessageRef.current();
            }, debounceMs);
          })
          .subscribe();
      } catch {
        // realtime optionnel — pas bloquant
      }
    })();

    return () => {
      cancelled = true;
      if (debounce) clearTimeout(debounce);
      if (supabase && ch) void supabase.removeChannel(ch);
    };
  }, [channel, event, debounceMs]);
}
