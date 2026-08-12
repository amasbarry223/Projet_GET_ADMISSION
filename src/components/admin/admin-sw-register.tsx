"use client";

import * as React from "react";

/** Enregistre le service worker du back-office, scopé à /admin uniquement. */
export function AdminServiceWorkerRegister() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw-admin.js", { scope: "/admin" })
      .catch((e) => console.warn("[admin] Échec d'enregistrement du service worker :", e));
  }, []);
  return null;
}
