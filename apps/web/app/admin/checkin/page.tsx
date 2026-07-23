"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { useOfflineSync } from "../../lib/offlineQueue";

type Method = "GEOLOCATION" | "MANUAL" | "STAFF_QR" | "VENUE_QR";

interface StatusResponse {
  totalAttendees: number;
  checkedInCount: number;
  breakdown: Record<Method, number>;
  checkedIn: { attendeeId: string; name: string; businessName: string | null; method: Method; checkedInAt: string }[];
  notCheckedIn: { attendeeId: string; name: string; phone: string; businessName: string | null }[];
}

const METHOD_LABEL: Record<Method, string> = {
  GEOLOCATION: "via location",
  MANUAL: "desk check-in",
  STAFF_QR: "admin check-in",
  VENUE_QR: "venue scan",
};

const POLL_MS = 7000;

export default function AdminCheckinPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [venueConfigured, setVenueConfigured] = useState(true);

  async function loadStatus() {
    const res = await fetch("/api/admin/checkin/status");
    if (res.ok) setStatus(await res.json());
  }

  const { online } = useOfflineSync();

  useEffect(() => {
    loadStatus();
    fetch("/api/admin/event")
      .then((r) => r.json())
      .then((e) => setVenueConfigured(e.venueLat != null && e.venueLng != null));
    const interval = setInterval(loadStatus, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="admin-page">
      <h1 className="title">Check-in management</h1>

      {!online && (
        <div className="banner info" style={{ marginBottom: 18 }}>
          <div>
            <b>Offline</b>
            Live counts will refresh once you&rsquo;re back online.
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
            <StatPill label="Venue scan" value={status.breakdown.VENUE_QR} tone="neutral" />
            <StatPill label="Desk check-in" value={status.breakdown.MANUAL} tone="neutral" />
          </div>

          <VenueQrCard />

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
              <h3 style={{ fontSize: ".95rem", marginBottom: 10 }}>Not yet checked in ({status.notCheckedIn.length})</h3>
              <ListTable
                rows={status.notCheckedIn.map((a) => ({
                  key: a.attendeeId,
                  cells: [a.name, a.phone],
                  href: `tel:${a.phone}`,
                }))}
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

// F3.7 — the printable venue attendance QR. Attendees scan this in-app to
// self-check-in. It encodes a URL so it also works if scanned with a native
// camera; the token is the event's current venueCheckinToken.
function VenueQrCard() {
  const [token, setToken] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const render = useCallback(async (nextToken: string) => {
    setToken(nextToken);
    const url = `${window.location.origin}/checkin?venue=${encodeURIComponent(nextToken)}`;
    try {
      setDataUrl(await QRCode.toDataURL(url, { margin: 2, width: 320, errorCorrectionLevel: "M" }));
    } catch {
      setDataUrl(null);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/event/venue-qr")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.token && render(data.token))
      .catch(() => undefined);
  }, [render]);

  return (
    <section className="venue-qr-card">
      <div className="venue-qr-copy">
        <h2>Venue attendance QR</h2>
        <p className="copy">
          Print this and display it at the entrance. Attendees tap <b>Check in</b> on their Home screen and
          scan it to mark themselves present.
        </p>
        <div className="venue-qr-actions">
          <a
            className="btn-primary"
            href={dataUrl ?? undefined}
            download="venue-attendance-qr.png"
            aria-disabled={!dataUrl}
          >
            Download PNG
          </a>
        </div>
      </div>
      <div className="venue-qr-preview">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="Venue attendance QR code" width={180} height={180} />
        ) : (
          <div className="venue-qr-placeholder" role="status">Preparing…</div>
        )}
        {token && <code className="venue-qr-token">{token.slice(0, 6)}…</code>}
      </div>
    </section>
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
  rows: { key: string; cells: string[]; href?: string }[];
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
            <tr
              key={row.key}
              style={{ borderTop: "1px solid var(--border)", cursor: row.href ? "pointer" : undefined }}
              onClick={row.href ? () => { window.location.href = row.href as string; } : undefined}
            >
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
