"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SESSION_MAX_AGE_SECONDS } from "@/shared/constants";

const IDLE_TIMEOUT_MS = SESSION_MAX_AGE_SECONDS * 1000; // 5 minutes

export function IdleSessionTimer({ portal = "candidat" }: { portal?: "candidat" | "staff" }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleIdleTimeout = React.useCallback(async () => {
    if (status !== "authenticated" || !session?.user) return;

    try {
      await signOut({ redirect: false });
    } catch {
      // Ignorer les erreurs d'invalidation réseau
    }

    const redirectPath = portal === "staff" ? "/back-office" : "/connexion";
    toast.error("Session expirée", {
      description: "Vous avez été déconnecté suite à 5 minutes d'inactivité.",
      duration: 6000,
    });

    router.push(`${redirectPath}?reason=idle`);
  }, [status, session?.user, portal, router]);

  const resetTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (status === "authenticated" && session?.user) {
      timerRef.current = setTimeout(() => {
        void handleIdleTimeout();
      }, IDLE_TIMEOUT_MS);
    }
  }, [status, session?.user, handleIdleTimeout]);

  React.useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Initialiser le timer
    resetTimer();

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // Throttler pour éviter de réinitialiser le timer à chaque micro-pixel de mouvement
    let throttleTimeout: NodeJS.Timeout | null = null;
    const onUserActivity = () => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
        resetTimer();
      }, 1000);
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, onUserActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (throttleTimeout) clearTimeout(throttleTimeout);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, onUserActivity);
      });
    };
  }, [status, session?.user, resetTimer]);

  return null;
}
