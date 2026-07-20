"use client";

import { useEffect, useState } from "react";

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true);

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as DeferredInstallPrompt);
      setCanInstall(true);
    }

    function onAppInstalled() {
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => undefined);
    if (choice?.outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
    setCanInstall(false);
  }

  return { canInstall, isInstalled, promptInstall };
}
