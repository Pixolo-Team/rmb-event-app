"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { enqueueWrite, useOfflineSync } from "../../lib/offlineQueue";

type Method = "GEOLOCATION" | "MANUAL" | "STAFF_QR";

interface StatusResponse {
  totalAttendees: number;
  checkedInCount: number;
  breakdown: Record<Method, number>;
  checkedIn: { attendeeId: string; name: string; businessName: string | null; method: Method; checkedInAt: string }[];
  notCheckedIn: { attendeeId: string; name: string; phone: string; businessName: string | null }[];
}

const METHOD_LABEL: Record<Method, string> = {
  GEOLOCATION: "via location",
  MANUAL: "manual",
  STAFF_QR: "staff scan",
};

const POLL_MS = 7000;

export default function AdminCheckinPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [venueConfigured, setVenueConfigured] = useState(true);
  const [copied, setCopied] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<{ tone: "ok" | "warn"; message: string } | null>(null);
  const scanningLocked = useRef(false);

  async function loadStatus() {
    const res = await fetch("/api/admin/checkin/status");
    if (res.ok) setStatus(await res.json());
  }

  // Reconcile the live list once a queued offline scan actually reaches the server.
  const { online } = useOfflineSync((kind) => {
    if (kind === "checkin-qr-scan") loadStatus();
  });

  useEffect(() => {
    loadStatus();
    fetch("/api/admin/event")
      .then((r) => r.json())
      .then((e) => setVenueConfigured(e.venueLat != null && e.venueLng != null));
    const interval = setInterval(loadStatus, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!scannerOpen) return;
    let cancelled = false;
    let scanner: Html5Qrcode | undefined;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      scanner = new Html5Qrcode("qr-reader");
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          async (decodedText: string) => {
            if (scanningLocked.current) return;
            scanningLocked.current = true;

            if (!navigator.onLine) {
              await enqueueWrite("checkin-qr-scan", "/api/admin/checkin/qr-scan", { qrToken: decodedText });
              setScanResult({ tone: "ok", message: "Scanned — saved offline, will confirm once back online" });
            } else {
              try {
                const res = await fetch("/api/admin/checkin/qr-scan", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ qrToken: decodedText }),
                });
                const outcome = await res.json();
                if (outcome.status === "not_found") {
                  setScanResult({ tone: "warn", message: "Invalid QR code — not found in attendee list" });
                } else if (outcome.status === "already_checked_in") {
                  setScanResult({ tone: "warn", message: `${outcome.attendeeName} is already checked in` });
                } else {
                  setScanResult({ tone: "ok", message: `✓ ${outcome.attendeeName} checked in` });
                  loadStatus();
                }
              } catch {
                // Network dropped mid-scan — queue it rather than surfacing an error.
                await enqueueWrite("checkin-qr-scan", "/api/admin/checkin/qr-scan", { qrToken: decodedText });
                setScanResult({ tone: "ok", message: "Scanned — saved offline, will confirm once back online" });
              }
            }

            setTimeout(() => {
              setScanResult(null);
              scanningLocked.current = false;
            }, 2000);
          },
          () => {
            // per-frame "no QR found yet" — expected, not an error to surface
          },
        )
        .catch(() => {
          setScanResult({ tone: "warn", message: "Camera permission required" });
          setScannerOpen(false);
        });
    });

    return () => {
      cancelled = true;
      scanner
        ?.stop()
        .then(() => scanner?.clear())
        .catch(() => {});
    };
  }, [scannerOpen]);

  function copyStragglerList() {
    if (!status) return;
    const text = status.notCheckedIn.map((a) => `${a.name} (${a.phone})`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="admin-page">
      <div className="wordmark">
        <span className="dot" />
        Evento Admin
      </div>
      <h1 className="title">Check-in management</h1>

      {!online && (
        <div className="banner info" style={{ marginBottom: 18 }}>
          <div>
            <b>Offline</b>
            Scanning still works — results are queued and will confirm once you&rsquo;re back online.
          </div>
        </div>
      )}

      {!venueConfigured && (
        <div className="banner warn" style={{ marginBottom: 18 }}>
          <div>
            <b>Venue location not configured</b>
            Geolocation check-in is disabled — attendees can still use manual check-in.{" "}
            <a href="/admin/event">Configure venue</a>
          </div>
        </div>
      )}

      {!status ? (
        <p className="copy">Loading&hellip;</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
            <StatPill
              label="Checked in"
              value={`${status.checkedInCount} of ${status.totalAttendees}`}
              tone="ok"
            />
            <StatPill label="Via location" value={status.breakdown.GEOLOCATION} tone="neutral" />
            <StatPill label="Manual" value={status.breakdown.MANUAL} tone="neutral" />
            <StatPill label="Staff scan" value={status.breakdown.STAFF_QR} tone="neutral" />
          </div>

          <div style={{ marginBottom: 28 }}>
            <button className="btn-primary" style={{ width: "auto", padding: "0 24px" }} onClick={() => setScannerOpen((o) => !o)}>
              {scannerOpen ? "Close scanner" : "Open QR scanner"}
            </button>

            {scannerOpen && (
              <div style={{ marginTop: 16, maxWidth: 360 }}>
                <div id="qr-reader" />
                {scanResult && (
                  <div className={`banner ${scanResult.tone === "ok" ? "ok" : "warn"}`} style={{ marginTop: 12 }}>
                    <div>{scanResult.message}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="two-col-grid">
            <div>
              <h3 style={{ fontSize: ".95rem", marginBottom: 10 }}>Checked in ({status.checkedIn.length})</h3>
              <ListTable
                rows={status.checkedIn.map((a) => ({
                  key: a.attendeeId,
                  cells: [a.name, a.businessName ?? "—", METHOD_LABEL[a.method], new Date(a.checkedInAt).toLocaleTimeString()],
                }))}
                headers={["Name", "Company", "Method", "Time"]}
                empty="No one checked in yet."
              />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ fontSize: ".95rem" }}>Not yet checked in ({status.notCheckedIn.length})</h3>
                <button className="link-muted" onClick={copyStragglerList} disabled={status.notCheckedIn.length === 0}>
                  {copied ? "Copied ✓" : "Copy list"}
                </button>
              </div>
              <ListTable
                rows={status.notCheckedIn.map((a) => ({ key: a.attendeeId, cells: [a.name, a.phone] }))}
                headers={["Name", "Phone"]}
                empty="Everyone's checked in."
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: string | number; tone: "ok" | "neutral" }) {
  const bg = tone === "ok" ? "var(--success-100)" : "var(--surface-2)";
  const fg = tone === "ok" ? "var(--success-700)" : "var(--ink-muted)";
  return (
    <div style={{ background: bg, color: fg, borderRadius: "var(--radius-md)", padding: "10px 16px", minWidth: 110 }}>
      <div style={{ fontSize: ".68rem", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600 }}>{label}</div>
      <div className="tnum" style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1.15rem" }}>
        {value}
      </div>
    </div>
  );
}

function ListTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: { key: string; cells: string[] }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p style={{ fontSize: ".82rem", color: "var(--ink-faint)" }}>{empty}</p>;
  }
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", maxHeight: 420, overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem" }}>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: ".68rem", textTransform: "uppercase", letterSpacing: ".04em", color: "var(--ink-faint)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} style={{ borderTop: "1px solid var(--border)" }}>
              {row.cells.map((c, i) => (
                <td key={i} style={{ padding: "8px 10px" }}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
