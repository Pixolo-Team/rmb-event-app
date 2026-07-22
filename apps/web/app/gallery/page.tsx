"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
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

function downloadFileName(photo: FeedPhotoData) {
  const safeName = photo.attendeeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "evento-photo";
  return `${safeName}-${photo.id}.jpg`;
}

type GalleryFilter = "all" | "organizer" | "attendees";

const SWIPE_THRESHOLD_PX = 50;

export default function GalleryPage() {
  const [photos, setPhotos] = useState<FeedPhotoData[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const touchStartX = useRef<number | null>(null);

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

  const visiblePhotos = photos.filter((photo) => {
    if (filter === "organizer") return photo.attendeeId === null;
    if (filter === "attendees") return photo.attendeeId !== null;
    return true;
  });
  const openPhoto = openIndex !== null ? visiblePhotos[openIndex] ?? null : null;

  function closeViewer() {
    setOpenIndex(null);
  }

  function showPrevious() {
    setOpenIndex((current) => (current === null ? current : Math.max(0, current - 1)));
  }

  function showNext() {
    setOpenIndex((current) => (current === null ? current : Math.min(visiblePhotos.length - 1, current + 1)));
  }

  function handleTouchStart(event: TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent) {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta > 0) showPrevious();
    else showNext();
  }

  return (
    <AttendeePageShell>
      <div className="attendee-page gallery-page">
        {state === "ready" && photos.length > 0 ? (
          <div className="gallery-filter-row" role="group" aria-label="Filter photos">
            <button type="button" className={`gallery-filter-chip${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>All</button>
            <button type="button" className={`gallery-filter-chip${filter === "organizer" ? " active" : ""}`} onClick={() => setFilter("organizer")}>Organizer</button>
            <button type="button" className={`gallery-filter-chip${filter === "attendees" ? " active" : ""}`} onClick={() => setFilter("attendees")}>Attendees</button>
          </div>
        ) : null}

        {state === "loading" ? <GallerySkeleton /> : null}

        {state === "ready" && photos.length === 0 ? (
          <section className="gallery-empty">
            <h2>No photos yet</h2>
            <p>Photos shared to the feed will show up here.</p>
          </section>
        ) : null}

        {state === "ready" && photos.length > 0 && visiblePhotos.length === 0 ? (
          <section className="gallery-empty">
            <h2>No photos here</h2>
            <p>Try a different filter.</p>
          </section>
        ) : null}

        {state === "ready" && visiblePhotos.length > 0 ? (
          <div className="gallery-grid">
            {visiblePhotos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                className="gallery-grid-item"
                onClick={() => setOpenIndex(index)}
                aria-label={`Open photo from ${photo.attendeeName}`}
              >
                {photo.url ? (
                  <img src={photo.url} alt="" loading="lazy" decoding="async" />
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
        <div className="gallery-viewer" role="dialog" aria-modal="true">
          <div className="gallery-viewer-topbar">
            <button className="gallery-viewer-close" type="button" onClick={closeViewer} aria-label="Close">
              <CloseIcon />
            </button>
            <span className="gallery-viewer-name">{openPhoto.attendeeName}</span>
            {openPhoto.url ? (
              <a className="gallery-viewer-download" href={openPhoto.url} download={downloadFileName(openPhoto)} aria-label="Download photo">
                <DownloadIcon />
              </a>
            ) : (
              <span className="gallery-viewer-download-spacer" aria-hidden="true" />
            )}
          </div>

          <div className="gallery-viewer-media" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {openPhoto.url ? (
              <img src={openPhoto.url} alt="" />
            ) : (
              <div className="photo-card-placeholder" aria-hidden="true">
                {getInitials(openPhoto.attendeeName)}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </AttendeePageShell>
  );
}

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 4v10" /><path d="m8 10 4 4 4-4" /><path d="M5 19h14" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}
