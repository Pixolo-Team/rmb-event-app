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
  { id: "preview-photo-1", url: "/images/preview/networking-conversation.jpg", caption: "A great start to the evening so many useful conversations already!", createdAt: "2026-07-16T12:10:00.000Z", attendeeId: "preview-1", attendeeName: "Aarav Mehta", attendeeBusinessName: "Mehta Packaging Solutions", likeCount: 18, commentCount: 2, likedByMe: true, comments: [] },
  { id: "preview-photo-2", url: "/images/preview/business-card-exchange.jpg", caption: "New introductions, shared ideas, and promising collaborations.", createdAt: "2026-07-16T11:35:00.000Z", attendeeId: "preview-me", attendeeName: "Radha Sharma", attendeeBusinessName: "Sharma Trading Co.", likeCount: 11, commentCount: 1, likedByMe: false, comments: [] },
  { id: "preview-photo-3", url: "/images/preview/conference-applause.jpg", caption: "Celebrating the ideas and people moving our business community forward.", createdAt: "2026-07-16T10:50:00.000Z", attendeeId: "preview-3", attendeeName: "Neha Kapoor", attendeeBusinessName: "Kapoor Digital", likeCount: 24, commentCount: 0, likedByMe: false, comments: [] },
  { id: "preview-photo-4", url: "/images/preview/business-card-exchange.jpg", caption: "Quick introductions turning into follow-up meetings.", createdAt: "2026-07-16T10:05:00.000Z", attendeeId: "preview-4", attendeeName: "Priya Nair", attendeeBusinessName: "Nair Advisory", likeCount: 9, commentCount: 0, likedByMe: false, comments: [] },
  { id: "preview-photo-5", url: "/images/preview/networking-conversation.jpg", caption: "Busy corners, strong conversations, and plenty of energy.", createdAt: "2026-07-16T09:35:00.000Z", attendeeId: "preview-5", attendeeName: "Vikram Shah", attendeeBusinessName: "Shah Industrial Systems", likeCount: 14, commentCount: 1, likedByMe: false, comments: [] },
  { id: "preview-photo-6", url: "/images/preview/conference-applause.jpg", caption: "One more moment worth saving from the event gallery.", createdAt: "2026-07-16T09:05:00.000Z", attendeeId: "preview-6", attendeeName: "Meera Joshi", attendeeBusinessName: "Joshi Consulting", likeCount: 7, commentCount: 0, likedByMe: false, comments: [] },
  { id: "preview-photo-7", url: "/images/preview/networking-conversation.jpg", caption: "Fresh connections and warm introductions across the room.", createdAt: "2026-07-16T08:40:00.000Z", attendeeId: "preview-7", attendeeName: "Ishita Verma", attendeeBusinessName: "Verma Ventures", likeCount: 5, commentCount: 0, likedByMe: false, comments: [] },
  { id: "preview-photo-8", url: "/images/preview/business-card-exchange.jpg", caption: "A quick exchange that turned into a meaningful conversation.", createdAt: "2026-07-16T08:15:00.000Z", attendeeId: "preview-8", attendeeName: "Kunal Bhatia", attendeeBusinessName: "Bhatia Distribution", likeCount: 6, commentCount: 0, likedByMe: false, comments: [] },
  { id: "preview-photo-9", url: "/images/preview/conference-applause.jpg", caption: "One more polished event moment to fill out the gallery view.", createdAt: "2026-07-16T07:55:00.000Z", attendeeId: "preview-9", attendeeName: "Sana Sheikh", attendeeBusinessName: "Sheikh Advisory", likeCount: 8, commentCount: 0, likedByMe: false, comments: [] },
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

function downloadFileName(photo: FeedPhotoData) {
  const safeName = photo.attendeeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "evento-photo";
  return `${safeName}-${photo.id}.jpg`;
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<FeedPhotoData[]>(PREVIEW_PHOTOS);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready">("ready");
  const [loadingMore, setLoadingMore] = useState(false);
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const [preview, setPreview] = useState(true);

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
        const nextPhotos = data.photos.length > 0 ? data.photos : PREVIEW_PHOTOS;
        setPhotos(nextPhotos);
        setNextCursor(data.nextCursor);
        setPreview(data.photos.length === 0);
        setState("ready");
      })
      .catch(() => {
        setPhotos(PREVIEW_PHOTOS);
        setPreview(true);
        setState("ready");
      });
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
        <section className="gallery-copy-block">
          <p className="gallery-copy">Browse every photo shared from tonight.</p>
          {preview ? <p className="gallery-preview-note">Showing sample photos so you can review the gallery UI.</p> : null}
        </section>

        {state === "loading" ? <GallerySkeleton /> : null}

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
            <div className="photo-card-media">
              {openPhoto.url ? (
                <img src={openPhoto.url} alt="" />
              ) : (
                <div className="photo-card-placeholder" aria-hidden="true">
                  {getInitials(openPhoto.attendeeName)}
                </div>
              )}
            </div>

            <div className="gallery-photo-meta">
              <div className="gallery-photo-meta-copy">
                <p className="person-name">
                  {openPhoto.attendeeName}
                </p>
                <p className="person-line muted">{formatTimestamp(openPhoto.createdAt)}</p>
              </div>
              {openPhoto.url ? (
                <a className="gallery-download-inline" href={openPhoto.url} download={downloadFileName(openPhoto)} aria-label="Download photo">
                  <DownloadIcon />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </AttendeePageShell>
  );
}

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 4v10" /><path d="m8 10 4 4 4-4" /><path d="M5 19h14" /></svg>;
}
