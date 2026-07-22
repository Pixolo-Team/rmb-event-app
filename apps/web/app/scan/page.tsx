"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { PoweredByFooter } from "../components/PoweredByFooter";
import { enqueueWrite, useOfflineSync } from "../lib/offlineQueue";
import { withCsrfHeaders } from "../lib/csrf";
import { trackEvent } from "../lib/gtag";
import { pauseScanner, resumeScanner, stopAndClearScanner } from "../lib/html5QrCode";
import { refreshPersonalStats } from "../lib/statsCache";

type ScanApiResult =
  | { status: "not_found" }
  | { status: "self" }
  | { status: "met" | "already_met"; attendee: { id: string; name: string; businessName: string | null } };

type Outcome =
  | { kind: "met" | "already_met"; id: string; name: string; businessName: string | null }
  | { kind: "self" }
  | { kind: "not_found" }
  | { kind: "error" }
  | { kind: "offline" };

export default function ScanPage() {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lockRef = useRef(false);
  // Latest-value ref so the html5-qrcode decode callback (created once) can read
  // whether a result is currently showing without being re-registered.
  const pausedRef = useRef(false);

  // Keep the offline queue draining while this screen is open.
  useOfflineSync((kind) => {
    if (kind === "meeting-scan") {
      refreshPersonalStats().catch(() => undefined);
    }
  });

  useEffect(() => {
    let cancelled = false;

    async function handleDecode(qrToken: string) {
      if (lockRef.current || pausedRef.current) return;
      lockRef.current = true;

      try {
        if (!navigator.onLine) {
          await enqueueWrite("meeting-scan", "/api/meetings/scan", { qrToken });
          showResult({ kind: "offline" });
          return;
        }
        const res = await fetch("/api/meetings/scan", withCsrfHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ qrToken }),
        }));
        if (!res.ok) throw new Error("scan failed");
        const data = (await res.json()) as ScanApiResult;
        trackEvent("qr_scan_success", {
          feature: "qr_scanner",
          target_type: "attendee_qr",
          success: data.status === "met" || data.status === "already_met",
        });
        if (data.status === "met") {
          trackEvent("meeting_created", {
            feature: "qr_scanner",
            target_type: "meeting",
            success: true,
          });
        }
        if (data.status === "self") showResult({ kind: "self" });
        else if (data.status === "not_found") showResult({ kind: "not_found" });
        else {
          refreshPersonalStats().catch(() => undefined);
          showResult({ kind: data.status, id: data.attendee.id, name: data.attendee.name, businessName: data.attendee.businessName });
        }
      } catch {
        // Network dropped mid-scan — queue rather than losing the meeting.
        await enqueueWrite("meeting-scan", "/api/meetings/scan", { qrToken });
        showResult({ kind: "offline" });
      } finally {
        lockRef.current = false;
      }
    }

    function showResult(result: Outcome) {
      pausedRef.current = true;
      pauseScanner(scannerRef.current);
      setOutcome(result);
    }

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText: string) => void handleDecode(decodedText),
          () => {
            // per-frame "no QR in view" — expected, not surfaced
          },
        )
        .then(() => {
          trackEvent("qr_scan_started", {
            feature: "qr_scanner",
            target_type: "attendee_qr",
            success: true,
          });
        })
        .catch(() => {
          trackEvent("qr_scan_started", {
            feature: "qr_scanner",
            target_type: "attendee_qr",
            success: false,
          });
          setCameraError(true);
        });
    });

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      void stopAndClearScanner(scanner);
    };
  }, []);

  function scanNext() {
    setOutcome(null);
    pausedRef.current = false;
    resumeScanner(scannerRef.current);
  }

  return (
    <AttendeePageShell showFooter={false}>
      <main className="attendee-page scan-page">
        <div className="scan-intro">
          <p className="copy">Point your camera at another attendee&rsquo;s QR to swap cards and log that you met.</p>
        </div>

        <div className="scan-stage">
          <div id="qr-reader" className={outcome ? "scan-reader dimmed" : "scan-reader"} />

          {cameraError && !outcome && (
            <div className="banner warn scan-banner">
              <div>
                <b>Camera unavailable</b>
                Allow camera access in your browser settings, then reload.
              </div>
            </div>
          )}

          {outcome && <ResultCard outcome={outcome} onScanNext={scanNext} />}
        </div>

        <PoweredByFooter />
      </main>
    </AttendeePageShell>
  );
}

function ResultCard({ outcome, onScanNext }: { outcome: Outcome; onScanNext: () => void }) {
  if (outcome.kind === "met" || outcome.kind === "already_met") {
    const company = outcome.businessName ? ` from ${outcome.businessName}` : "";
    return (
      <div className={`scan-result ${outcome.kind === "met" ? "tone-success" : "tone-warning"}`}>
        <span className={`ring ${outcome.kind === "met" ? "ok" : "warn"} lg`}>{outcome.kind === "met" ? "✓" : "↻"}</span>
        <h2>{outcome.kind === "met" ? `You met ${outcome.name}!` : `You already met ${outcome.name}`}</h2>
        <p className="copy">
          {outcome.kind === "met" ? `${outcome.name}${company} is now in your connections.` : "No worries — go find someone new to meet."}
        </p>
        <div className="scan-actions">
          <Link className="btn-primary" href={`/attendees/${outcome.id}`}>View profile</Link>
          <button className="btn-secondary" type="button" onClick={onScanNext}>Scan next</button>
        </div>
      </div>
    );
  }

  const copy: Record<"self" | "not_found" | "error" | "offline", { icon: string; tone: string; title: string; body: string }> = {
    self: { icon: "🙂", tone: "tone-warning", title: "That's your own code", body: "Scan someone else's QR to connect with them." },
    not_found: { icon: "!", tone: "tone-warning", title: "Couldn't read that code", body: "It isn't a valid attendee code. Try again, or ask staff for help." },
    error: { icon: "!", tone: "tone-warning", title: "Something went wrong", body: "Please try scanning again." },
    offline: { icon: "✓", tone: "tone-success", title: "Saved offline", body: "You're offline — this meeting will sync automatically once you're back online." },
  };
  const c = copy[outcome.kind];
  return (
    <div className={`scan-result ${c.tone}`}>
      <span className={`ring ${outcome.kind === "offline" ? "ok" : "warn"} lg`}>{c.icon}</span>
      <h2>{c.title}</h2>
      <p className="copy">{c.body}</p>
      <div className="scan-actions">
        <button className="btn-primary" type="button" onClick={onScanNext}>Scan next</button>
      </div>
    </div>
  );
}
