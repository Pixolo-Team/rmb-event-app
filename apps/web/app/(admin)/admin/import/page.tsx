"use client";

import { useRef, useState } from "react";
import { withCsrfHeaders } from "../../../lib/csrf";

type RowStatus = "OK" | "DUPLICATE" | "ERROR" | "FLAGGED";

interface ImportRowOutcome {
  rowNumber: number;
  status: RowStatus;
  reason?: string;
  attendeeId?: string;
}

interface ImportSummary {
  batchId: string;
  successCount: number;
  duplicateCount: number;
  errorCount: number;
  flaggedCount: number;
  rows: ImportRowOutcome[];
}

const STATUS_LABEL: Record<RowStatus, string> = {
  OK: "Imported",
  DUPLICATE: "Duplicate",
  ERROR: "Error",
  FLAGGED: "Flagged",
};

export default function AdminImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    setUploading(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/import", withCsrfHeaders({ method: "POST", body: formData }));
      const body = await res.json();

      if (!res.ok) {
        setError(body.message ?? "Import failed.");
        return;
      }
      setSummary(body as ImportSummary);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <div className="wordmark">
        <span className="dot" />
        Evento Admin
      </div>
      <h1 className="title">Import attendees</h1>
      <p className="copy">
        Upload the registration export (CSV). Columns are auto-detected by header keyword - name, email, phone,
        business/profession, and RMB chapter (optional). Payment columns are ignored; see docs/SCREENS.md Screen 3.3.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div
          style={{
            border: "1.5px dashed var(--border-strong)",
            borderRadius: "var(--radius-md)",
            padding: 24,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            style={{ marginBottom: 8 }}
          />
          <div style={{ fontSize: ".8rem", color: "var(--ink-faint)" }}>
            {fileName ? fileName : "No file chosen"}
          </div>
        </div>

        <button className="btn-primary" type="submit" disabled={uploading}>
          {uploading ? (
            <>
              <span className="spinner" /> Importing&hellip;
            </>
          ) : (
            "Import"
          )}
        </button>
      </form>

      {error && (
        <div className="banner warn" style={{ marginTop: 20 }}>
          <div>
            <b>Import failed</b>
            {error}
          </div>
        </div>
      )}

      {summary && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            <StatPill label="Imported" value={summary.successCount} tone="ok" />
            <StatPill label="Duplicates" value={summary.duplicateCount} tone="neutral" />
            <StatPill label="Flagged" value={summary.flaggedCount} tone="warn" />
            <StatPill label="Errors" value={summary.errorCount} tone="err" />
          </div>

          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <Th>Row</Th>
                  <Th>Status</Th>
                  <Th>Reason</Th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((row) => (
                  <tr key={row.rowNumber} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td mono>{row.rowNumber}</Td>
                    <Td>{STATUS_LABEL[row.status]}</Td>
                    <Td>{row.reason ?? "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: "ok" | "neutral" | "warn" | "err" }) {
  const bg = { ok: "var(--success-100)", neutral: "var(--surface-2)", warn: "var(--warning-100)", err: "var(--danger-100)" }[tone];
  const fg = { ok: "var(--success-700)", neutral: "var(--ink-muted)", warn: "var(--warning-700)", err: "var(--danger-500)" }[tone];
  return (
    <div style={{ background: bg, color: fg, borderRadius: "var(--radius-md)", padding: "10px 16px", minWidth: 100 }}>
      <div style={{ fontSize: ".68rem", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600 }}>{label}</div>
      <div className="tnum" style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1.3rem" }}>
        {value}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: "left", padding: "9px 12px", fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".04em", color: "var(--ink-faint)" }}>
      {children}
    </th>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td style={{ padding: "9px 12px", fontFamily: mono ? "var(--font-mono)" : undefined }}>{children}</td>
  );
}
