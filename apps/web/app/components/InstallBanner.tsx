"use client";

import { useEffect, useState } from "react";
import { usePwaInstall } from "./PwaInstallProvider";

const DISMISSED_KEY = "evento-pwa-banner-dismissed";

export function InstallBanner() {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (isInstalled || !canInstall || dismissed) return null;

  function close() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage may be unavailable — the banner just won't stay dismissed.
    }
  }

  return (
    <div className="pwa-install-banner" role="region" aria-label="Install app">
      <button type="button" className="pwa-install-banner-main" onClick={() => promptInstall()}>
        <DownloadIcon />
        <span>Install Evento for quick, full-screen access</span>
      </button>
      <button type="button" className="pwa-install-banner-close" aria-label="Never show this again" onClick={close}>
        <CloseIcon />
      </button>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
