"use client";

import { useEffect, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { GallerySkeleton } from "./GallerySkeleton";
import type { FeedPhotoData } from "../lib/feedTypes";

type FeedPageResponse = {
  photos: FeedPhotoData[];
  nextCursor: string | null;
};

const PREVIEW_PHOTOS: FeedPhotoData[] = [
  { id: "preview-photo-1", url: "/images/preview/networking-conversation.jpg", caption: "A great start to the evening — so many useful conversations already!", createdAt: "2026-07-16T12:10:00.000Z", attendeeId: "preview-1", attendeeName: "Aarav Mehta", attendeeBusinessName: "Mehta Packaging Solutions", likeCount: 18, commentCount: 2, likedByMe: true, comments: [] },
  { id: "preview-photo-2", url: "/images/preview/business-card-exchange.jpg", caption: "New introductions, shared ideas, and promising collaborations.", createdAt: "2026-07-16T11:35:00.000Z", attendeeId: "preview-me", attendeeName: "Radha Sharma", attendeeBusinessName: "Sharma Trading Co.", likeCount: 11, commentCount: 1, likedByMe: false, comments: [] },
  { id: "preview-photo-3", url: "/images/preview/conference-applause.jpg", caption: "Celebrating the ideas and people moving our business community forward.", createdAt: "2026-07-16T10:50:00.000Z", attendeeId: "preview-3", attendeeName: "Neha Kapoor", attendeeBusinessName: "Kapoor Digital", likeCount: 24, commentCount: 0, likedByMe: false, comments: [] },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "EV";
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<FeedPhotoData[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const previewMode = process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("preview") === "1";
    if (previewMode) {
      setPreview(true);
      setPhotos(PREVIEW_PHOTOS);
      setState("ready");
      return;
    }

    fetch("/api/photos", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = (await response.json()) as FeedPageResponse;
        setPhotos(data.photos);
        setNextCursor(data.nextCursor);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/photos?cursor=${encodeURIComponent(nextCursor)}`, { credentials: "include" });
      if (!response.ok) return;
      const data = (await response.json()) as FeedPageResponse;
      setPhotos((current) => [...current, ...data.photos]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  const openPhoto = photos.find((photo) => photo.id === openPhotoId) ?? null;

  return (
    <AttendeePageShell>
      <div className="attendee-page gallery-page">
        <section className="settings-card">
          <p className="settings-copy">Browse every photo shared from tonight.</p>
        </section>

        {state === "loading" ? <GallerySkeleton /> : null}

        {state === "error" ? (
          <section className="feature-card">
            <p className="feature-title">Can&apos;t load the gallery</p>
            <p className="feature-copy">Check your connection and try again.</p>
          </section>
        ) : null}

        {state === "ready" && photos.length === 0 ? (
          <section className="feature-card">
            <p className="feature-title">No photos yet</p>
            <p className="feature-copy">Photos shared to the feed will show up here.</p>
          </section>
        ) : null}

        {state === "ready" && photos.length > 0 ? (
          <div className="gallery-grid">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className="gallery-grid-item"
                onClick={() => setOpenPhotoId(photo.id)}
                aria-label={`Open photo from ${photo.attendeeName}`}
              >
                {photo.url ? (
                  <img src={photo.url} alt="" />
                ) : (
                  <span className="gallery-grid-placeholder" aria-hidden="true">
                    {getInitials(photo.attendeeName)}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : null}

        {!preview && nextCursor ? (
          <button className="btn-primary" type="button" disabled={loadingMore} onClick={handleLoadMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        ) : null}
      </div>

      {openPhoto ? (
        <div className="photo-modal-overlay" role="dialog" aria-modal="true" onClick={() => setOpenPhotoId(null)}>
          <div className="photo-modal-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button className="icon-action" type="button" onClick={() => setOpenPhotoId(null)}>
                Close
              </button>
            </div>

            <div className="photo-card-media">
              {openPhoto.url ? (
                <img src={openPhoto.url} alt="" />
              ) : (
                <div className="photo-card-placeholder" aria-hidden="true">
                  {getInitials(openPhoto.attendeeName)}
                </div>
              )}
            </div>

            <p className="person-name" style={{ marginTop: 12 }}>
              {openPhoto.attendeeName}
            </p>
            {openPhoto.caption ? <p className="person-bio">{openPhoto.caption}</p> : null}
            <p className="person-line muted">{formatTimestamp(openPhoto.createdAt)}</p>
          </div>
        </div>
      ) : null}
    </AttendeePageShell>
  );
}
