"use client";

import { useEffect, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { GallerySkeleton } from "./GallerySkeleton";
import type { FeedPhotoData } from "../lib/feedTypes";

type FeedPageResponse = {
  photos: FeedPhotoData[];
  nextCursor: string | null;
};

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
  const [photos, setPhotos] = useState<FeedPhotoData[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/photos", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = (await response.json()) as FeedPageResponse;
        setPhotos(data.photos);
        setNextCursor(data.nextCursor);
        setState("ready");
      })
      .catch(() => {
        setPhotos([]);
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

        {nextCursor ? (
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
