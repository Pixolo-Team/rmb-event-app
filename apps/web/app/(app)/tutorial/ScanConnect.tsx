"use client";

import { useEffect, useRef, useState } from "react";

type ScanState = "starting" | "scanning" | "denied" | "error" | "done";

export function ScanConnect({
  onDetected,
  onClose,
}: {
  onDetected: (qrToken: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const containerId = "qr-scanner-region";
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const handledRef = useRef(false);
  const [state, setState] = useState<ScanState>("starting");
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText: string) => {
            if (handledRef.current) return;
            handledRef.current = true;
            const message = await onDetected(decodedText);
            setResultMessage(message);
            setState("done");
            try {
              await scanner.stop();
            } catch {
              // Already stopping — safe to ignore.
            }
          },
          () => {
            // Per-frame decode failures are normal while aiming; ignore them.
          },
        );
        if (!cancelled) setState("scanning");
      } catch (error) {
        if (cancelled) return;
        const name = (error as { name?: string })?.name;
        setState(name === "NotAllowedError" || name === "PermissionDeniedError" ? "denied" : "error");
      }
    }

    start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => undefined);
      }
    };
  }, [onDetected]);

  return (
    <div className="photo-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="photo-modal-card" onClick={(event) => event.stopPropagation()}>
        <button className="icon-action" type="button" onClick={onClose} style={{ marginBottom: 12 }}>
          Close
        </button>

        <h1 className="settings-title">Scan to connect</h1>
        <p className="settings-copy">Point your camera at another attendee&apos;s QR code.</p>

        <div className="scan-region-wrap" style={{ marginTop: 16 }}>
          <div id={containerId} className="scan-region" />
          {state === "starting" ? <p className="scan-hint">Starting camera&hellip;</p> : null}
          {state === "scanning" ? <p className="scan-hint">Looking for a QR code&hellip;</p> : null}
        </div>

        {state === "denied" ? (
          <div className="banner warn app-banner" style={{ marginTop: 16 }}>
            <div>
              <b>Camera blocked</b>
              Allow camera access in your browser settings, then reopen this screen.
            </div>
          </div>
        ) : null}

        {state === "error" ? (
          <div className="banner warn app-banner" style={{ marginTop: 16 }}>
            <div>
              <b>Camera unavailable</b>
              We couldn&apos;t start the camera on this device.
            </div>
          </div>
        ) : null}

        {state === "done" ? (
          <div className="banner ok app-banner" style={{ marginTop: 16 }}>
            <div>
              <b>{resultMessage ? "Connected" : "Couldn't connect"}</b>
              {resultMessage ?? "That QR code wasn't recognised."}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
