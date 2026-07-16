"use client";

import { useEffect, useState } from "react";

type Tab = "all" | "deleted";

interface AdminPhoto {
  id: string;
  url: string;
  caption: string | null;
  createdAt: string;
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

  async function handleDelete(photoId: string) {
    if (!window.confirm("Delete this photo? This cannot be undone.")) return;
    setDeletingId(photoId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/photos/${photoId}`, { method: "DELETE" });
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
      <h1 className="title">Feed moderation</h1>
      <p className="copy">View every photo posted to the event feed, remove anything inappropriate, and review a history of what's been removed.</p>

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
            <b>Feed moderation issue</b>
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
                  <Th>Attendee</Th>
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
                    <Td>{photo.attendeeName}</Td>
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
