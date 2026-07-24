"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import JSZip from "jszip";

interface Attendee {
  id: string;
  name: string;
  businessName: string | null;
  chapterName: string | null;
  tableNumbers: string[];
  qrToken: string;
  delegateNumber: number | null;
}

export default function AdminBadgesPage() {
  const [attendees, setAttendees] = useState<Attendee[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const badgeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetch("/api/admin/attendees")
      .then((res) => res.json())
      .then((data: Attendee[]) => {
        setAttendees(data);
        setSelected(new Set(data.map((a) => a.id)));
      });
  }, []);

  const selectedAttendees = useMemo(
    () => (attendees ?? []).filter((a) => selected.has(a.id)),
    [attendees, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!attendees) return;
    setSelected((prev) => (prev.size === attendees.length ? new Set() : new Set(attendees.map((a) => a.id))));
  }

  async function generatePreview() {
    setGenerating(true);
    const entries = await Promise.all(
      selectedAttendees.map(async (a) => [a.id, await QRCode.toDataURL(a.qrToken, { margin: 0, width: 600 })] as const),
    );
    setQrDataUrls(Object.fromEntries(entries));
    setGenerating(false);
    setShowPreview(true);
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadBadgesZip() {
    setDownloading(true);
    try {
      const pdfs: { name: string; blob: Blob }[] = [];

      for (const a of selectedAttendees) {
        const node = badgeRefs.current[a.id];
        if (!node) continue;

        const canvas = await html2canvas(node, {
          scale: 3,
          backgroundColor: "#ffffff",
          width: node.offsetWidth,
          height: node.offsetHeight,
          windowWidth: node.offsetWidth,
        });
        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

        const safeName = a.name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || a.id;
        pdfs.push({ name: `${safeName}.pdf`, blob: pdf.output("blob") });
      }

      if (pdfs.length === 1) {
        triggerDownload(pdfs[0].blob, pdfs[0].name);
        return;
      }

      const zip = new JSZip();
      for (const { name, blob } of pdfs) {
        zip.file(name, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      triggerDownload(zipBlob, "badges.zip");
    } finally {
      setDownloading(false);
    }
  }

  if (!attendees) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        <p className="copy">Loading&hellip;</p>
      </div>
    );
  }

  if (attendees.length === 0) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        <h1 className="title">Print badges</h1>
        <p className="copy">No attendees to print badges for yet - import attendees first.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }} className="badge-print-page">
      <div className="no-print">
        <h1 className="title">Print badges</h1>
        <p className="copy">
          Each badge shows the attendee&rsquo;s name in large type alongside their personal QR code, so staff and
          other attendees can confirm whose code they&rsquo;re scanning.
        </p>

        {!showPreview ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <button className="link-muted" onClick={toggleAll}>
                {selected.size === attendees.length ? "Deselect all" : "Select all"}
              </button>
              <span style={{ fontSize: ".8rem", color: "var(--ink-faint)", marginLeft: 10 }}>
                {selected.size} of {attendees.length} selected
              </span>
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", maxHeight: 360, overflowY: "auto", marginBottom: 20 }}>
              {attendees.map((a) => (
                <label
                  key={a.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", fontSize: ".85rem", borderBottom: "1px solid var(--border)" }}
                >
                  <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                  {a.name}
                  <span style={{ color: "var(--ink-faint)" }}>{a.businessName ?? ""}</span>
                  {a.tableNumbers.length > 0 && (
                    <span style={{ color: "var(--ink-faint)", fontSize: ".8rem" }}>
                      Tables: {a.tableNumbers.join(", ")}
                    </span>
                  )}
                </label>
              ))}
            </div>

            <button className="btn-primary" style={{ width: "auto", padding: "0 24px" }} disabled={selected.size === 0 || generating} onClick={generatePreview}>
              {generating ? (
                <>
                  <span className="spinner" /> Generating&hellip;
                </>
              ) : (
                `Preview ${selected.size} badge${selected.size === 1 ? "" : "s"}`
              )}
            </button>
          </>
        ) : (
          <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
            <button className="btn-primary" style={{ width: "auto", padding: "0 24px" }} disabled={downloading} onClick={downloadBadgesZip}>
              {downloading ? (
                <>
                  <span className="spinner" /> Preparing&hellip;
                </>
              ) : (
                "Print"
              )}
            </button>
            <button className="btn-secondary" style={{ width: "auto", padding: "0 24px", marginTop: 0 }} onClick={() => setShowPreview(false)}>
              Back to selection
            </button>
          </div>
        )}
      </div>

      {showPreview && (
        <>
          <div className="badge-grid">
            {selectedAttendees.map((a) => (
              <div className="badge-card" key={a.id}>
                {a.delegateNumber != null && (
                  <div className="badge-delegate-no">{String(a.delegateNumber).padStart(3, "0")}</div>
                )}
                {qrDataUrls[a.id] && <img src={qrDataUrls[a.id]} alt={`QR code for ${a.name}`} className="badge-qr" />}
                <div className="badge-name">{a.name}</div>
                {a.businessName && <div className="badge-sub">{a.businessName}</div>}
                {a.tableNumbers.length > 0 && (
                  <div className="badge-tables">
                    <div className="badge-tables-label">Round Tables</div>
                    <div className="badge-tables-sequence">{a.tableNumbers.join(" → ")}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="badge-print-offscreen" aria-hidden="true">
            {selectedAttendees.map((a) => (
              <div className="badge-card-print" key={a.id} ref={(el) => { badgeRefs.current[a.id] = el; }}>
                {a.delegateNumber != null && (
                  <div className="badge-delegate-no">{String(a.delegateNumber).padStart(3, "0")}</div>
                )}
                {qrDataUrls[a.id] && <img src={qrDataUrls[a.id]} alt={`QR code for ${a.name}`} className="badge-qr" />}
                <div className="badge-name">{a.name}</div>
                {a.businessName && <div className="badge-sub">{a.businessName}</div>}
                {a.tableNumbers.length > 0 && (
                  <div className="badge-tables">
                    <div className="badge-tables-label">Round Tables</div>
                    <div className="badge-tables-sequence">{a.tableNumbers.join(" → ")}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
