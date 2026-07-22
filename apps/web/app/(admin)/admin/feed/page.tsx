"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { withCsrfHeaders } from "../../../lib/csrf";

type Tab = "all" | "deleted";

interface AdminPhoto {
  id: string;
  url: string;
  caption: string | null;
  createdAt: string;
  uploadedByAdmin: boolean;
  attendeeName: string;
  likeCount: number;
}

interface DeletedPhotoLog {
  id: string;
  photoId: string;
  attendeeName: string;
  caption: string | null;
  photoUrl: string;
  postedAt: string;
  deletedAt: string;
  deletedBy: string;
}

export default function AdminFeedPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [deletedLog, setDeletedLog] = useState<DeletedPhotoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const previews = useMemo(
    () => selectedFiles.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [selectedFiles],
  );

  useEffect(() => {
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  const refreshPhotos = useCallback(async () => {
    const res = await fetch("/api/admin/photos");
    if (!res.ok) throw new Error();
    setPhotos((await res.json()) as AdminPhoto[]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const path = tab === "all" ? "/api/admin/photos" : "/api/admin/photos/deleted";
        const res = await fetch(path);
        if (!res.ok) {
          if (!cancelled) setError("Couldn't reach the server. Please try again.");
          return;
        }
        const body = await res.json();
        if (cancelled) return;
        if (tab === "all") setPhotos(body as AdminPhoto[]);
        else setDeletedLog(body as DeletedPhotoLog[]);
      } catch {
        if (!cancelled) setError("Couldn't reach the server. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedFiles.length === 0) {
      setError("Choose at least one photo to upload.");
      return;
    }
    setUploading(true);
    setError(null);
    setUploadMessage(null);

    const body = new FormData();
    selectedFiles.forEach((file) => body.append("photos", file));
    if (caption.trim()) body.append("caption", caption.trim());

    try {
      const res = await fetch("/api/admin/photos", withCsrfHeaders({ method: "POST", body, credentials: "include" }));
      if (!res.ok) {
        setError("Couldn't upload photos. Use JPEG, PNG, WEBP, or HEIC files under 5MB each.");
        return;
      }
      const uploadedCount = selectedFiles.length;
      setSelectedFiles([]);
      setCaption("");
      setTab("all");
      setUploadMessage(`${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} uploaded to the gallery.`);
      await refreshPhotos();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photoId: string) {
    if (!window.confirm("Delete this photo? This cannot be undone.")) return;
    setDeletingId(photoId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/photos/${photoId}`, withCsrfHeaders({ method: "DELETE" }));
      if (!res.ok) {
        setError("Couldn't delete photo. Please try again.");
        return;
      }
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
      <div className="wordmark">
        <span className="dot" />
        Evento Admin
      </div>
      <h1 className="title">Gallery photos</h1>
      <p className="copy">Upload photos for the public gallery, remove anything inappropriate, and review a history of what's been removed.</p>

      <form
        onSubmit={handleUpload}
        style={{
          marginTop: 24,
          padding: 18,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          background: "var(--surface)",
          display: "grid",
          gap: 14,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Upload gallery photos</h2>
          <p className="copy" style={{ margin: "4px 0 0", fontSize: ".86rem" }}>Add up to 6 photos at a time. They will appear as posts from RMB Event Team.</p>
        </div>

        <label
          style={{
            border: "1.5px dashed var(--border-strong)",
            borderRadius: "var(--radius-md)",
            padding: 16,
            display: "grid",
            gap: 8,
            cursor: "pointer",
            background: "var(--surface-2)",
          }}
        >
          <span style={{ fontWeight: 800, color: "var(--ink)" }}>Choose photos</span>
          <span className="copy" style={{ margin: 0, fontSize: ".82rem" }}>JPEG, PNG, WEBP, or HEIC. Max 5MB each.</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []).slice(0, 6))}
            style={{ fontSize: ".86rem" }}
          />
        </label>

        {previews.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 10 }}>
            {previews.map((preview) => (
              <div key={preview.url} style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <Thumb src={preview.url} />
                <span style={{ fontSize: ".7rem", color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preview.name}</span>
              </div>
            ))}
          </div>
        ) : null}

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: ".78rem", fontWeight: 800, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>Caption</span>
          <textarea
            value={caption}
            maxLength={200}
            onChange={(event) => setCaption(event.target.value)}
            rows={3}
            placeholder="Optional caption"
            style={{ resize: "vertical", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12, font: "inherit" }}
          />
        </label>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-primary" type="submit" disabled={uploading || selectedFiles.length === 0}>
            {uploading ? "Uploading..." : "Upload photos"}
          </button>
          {selectedFiles.length > 0 ? (
            <button className="btn-secondary" type="button" disabled={uploading} onClick={() => {
              setSelectedFiles([]);
              setCaption("");
            }}>
              Clear
            </button>
          ) : null}
          {uploadMessage ? <span style={{ color: "var(--success)", fontWeight: 700, fontSize: ".86rem" }}>{uploadMessage}</span> : null}
        </div>
      </form>

      <div style={{ display: "flex", gap: 8, marginTop: 20, marginBottom: 20 }}>
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          All posts
        </TabButton>
        <TabButton active={tab === "deleted"} onClick={() => setTab("deleted")}>
          Deleted history
        </TabButton>
      </div>

      {error && (
        <div className="banner warn" style={{ marginBottom: 20 }}>
          <div>
            <b>Gallery photo issue</b>
            {error}
          </div>
        </div>
      )}

      {loading ? (
        <p className="copy">Loading&hellip;</p>
      ) : tab === "all" ? (
        photos.length === 0 ? (
          <p className="copy">No photos posted yet.</p>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <Th>Photo</Th>
                  <Th>Source</Th>
                  <Th>Caption</Th>
                  <Th>Posted</Th>
                  <Th>Likes</Th>
                  <Th>&nbsp;</Th>
                </tr>
              </thead>
              <tbody>
                {photos.map((photo) => (
                  <tr key={photo.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td>
                      <Thumb src={photo.url} />
                    </Td>
                    <Td>{photo.attendeeName}{photo.uploadedByAdmin ? " · Admin" : ""}</Td>
                    <Td>{photo.caption ?? "-"}</Td>
                    <Td>{new Date(photo.createdAt).toLocaleString()}</Td>
                    <Td mono>{photo.likeCount}</Td>
                    <Td>
                      <button
                        className="btn-primary"
                        type="button"
                        disabled={deletingId === photo.id}
                        onClick={() => handleDelete(photo.id)}
                        style={{ minHeight: 32, padding: "0 14px", fontSize: ".78rem" }}
                      >
                        {deletingId === photo.id ? "Deleting..." : "Delete"}
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : deletedLog.length === 0 ? (
        <p className="copy">No photos have been removed yet.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem" }}>
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                <Th>Photo</Th>
                <Th>Attendee</Th>
                <Th>Caption</Th>
                <Th>Posted</Th>
                <Th>Deleted</Th>
              </tr>
            </thead>
            <tbody>
              {deletedLog.map((log) => (
                <tr key={log.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <Td>
                    <Thumb src={log.photoUrl} />
                  </Td>
                  <Td>{log.attendeeName}</Td>
                  <Td>{log.caption ?? "-"}</Td>
                  <Td>{new Date(log.postedAt).toLocaleString()}</Td>
                  <Td>{new Date(log.deletedAt).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 40,
        padding: "0 18px",
        borderRadius: "var(--radius-pill)",
        border: active ? "1.5px solid var(--brand-500)" : "1.5px solid var(--border-strong)",
        background: active ? "var(--brand-100)" : "var(--surface)",
        color: active ? "var(--brand-700)" : "var(--ink-muted)",
        fontWeight: 700,
        fontSize: ".85rem",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Thumb({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      style={{ width: 56, height: 56, objectFit: "cover", borderRadius: "var(--radius-md)", display: "block" }}
    />
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
