"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * État capturé au niveau module (pas dans le composant) : beforeinstallprompt peut se
 * déclencher très tôt, avant que React n'ait fini de monter/hydrater — un écouteur posé
 * seulement dans un useEffect risquerait de rater l'évènement. Ici l'écoute démarre dès
 * l'évaluation du script, comme les providers de thème du projet (même pattern).
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  installed = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): "installed" | "installable" | "none" {
  if (installed) return "installed";
  return deferredPrompt ? "installable" : "none";
}

/**
 * Bouton "Installer l'application" pour le back-office (PWA scopée /admin).
 * Ne s'affiche que si le navigateur signale l'app comme réellement installable
 * (Chrome/Edge/Android — API beforeinstallprompt) et qu'elle n'est pas déjà installée.
 * Safari/iOS et Firefox ne prennent pas en charge cette API : sur ces navigateurs le
 * bouton reste masqué en permanence — l'installation s'y fait via le menu natif du
 * navigateur ("Ajouter à l'écran d'accueil" / partage), pas de bouton possible.
 */
export function AdminInstallButton() {
  const status = React.useSyncExternalStore(subscribe, getSnapshot, () => "none" as const);

  if (status !== "installable") return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
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
