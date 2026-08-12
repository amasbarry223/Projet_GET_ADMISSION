"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Bouton "Installer l'application" pour le back-office (PWA scopée /admin).
 * Ne s'affiche que si le navigateur signale l'app comme installable
 * (Chrome/Edge/Android — beforeinstallprompt) et qu'elle n'est pas déjà installée.
 * Safari/iOS ne déclenchent jamais cet évènement : l'installation s'y fait via
 * le menu de partage natif ("Ajouter à l'écran d'accueil"), ce bouton reste masqué.
 */
export function AdminInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
  });

  React.useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 border-lapis/30 text-xs text-lapis hover:bg-lapis/10"
      onClick={() => void handleInstall()}
    >
      <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Installer l&apos;application
    </Button>
  );
}
