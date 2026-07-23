"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
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

function downloadFileName(item: GalleryItem) {
  const safeName = item.attendeeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "evento-photo";
  return `${safeName}-${item.key}.jpg`;
}

// A feed post can carry several photos (a carousel). The gallery is a flat wall
// of individual photos, so every photo in every post becomes its own tile.
type GalleryItem = { key: string; url: string | null; attendeeName: string };

function toGalleryItems(photos: FeedPhotoData[]): GalleryItem[] {
  return photos.flatMap((photo) => {
    const urls = photo.urls.length > 0 ? photo.urls : photo.url ? [photo.url] : [null];
    return urls.map((url, index) => ({
      key: `${photo.id}-${index}`,
      url,
      attendeeName: photo.attendeeName,
    }));
  });
}

type GalleryFilter = "all" | "organizer" | "attendees";

const SWIPE_THRESHOLD_PX = 50;

export default function GalleryPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<FeedPhotoData[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [downloading, setDownloading] = useState(false);
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
  const galleryItems = toGalleryItems(visiblePhotos);
  const openItem = openIndex !== null ? galleryItems[openIndex] ?? null : null;

  function closeViewer() {
    setOpenIndex(null);
  }

  // The photos are served from cross-origin signed URLs, so a plain
  // <a download> is ignored by the browser and just opens the image in a new
  // tab. Fetching the bytes into a blob first lets us force a real download.
  async function downloadPhoto(item: GalleryItem) {
    if (!item.url || downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(item.url);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadFileName(item);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Blob fetch can fail (network / CORS) — fall back to opening the image
      // so the user can still save it manually.
      window.open(item.url, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
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
    setOpenIndex((current) => {
      if (current === null) return current;
      if (delta > 0) return Math.max(0, current - 1);
      return Math.min(galleryItems.length - 1, current + 1);
    });
  }

  return (
    <AttendeePageShell>
      <div className="attendee-page gallery-page">
        <div className="back-link-row">
          <button type="button" className="back-link gallery-back" onClick={() => router.back()}>
            <span className="back-link-icon" aria-hidden="true"><BackArrowIcon /></span>
            <span>Back</span>
          </button>
        </div>

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

        {state === "ready" && galleryItems.length > 0 ? (
          <div className="gallery-grid">
            {galleryItems.map((item, index) => (
              <button
                key={item.key}
                type="button"
                className="gallery-grid-item"
                onClick={() => setOpenIndex(index)}
                aria-label={`Open photo from ${item.attendeeName}`}
              >
                {item.url ? (
                  <img src={item.url} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="gallery-grid-placeholder" aria-hidden="true">
                    {getInitials(item.attendeeName)}
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

      {openItem && openIndex !== null ? (
        <div className="gallery-viewer" role="dialog" aria-modal="true" onClick={closeViewer}>
          <div className="gallery-viewer-topbar">
            <button
              type="button"
              className="gallery-viewer-close"
              aria-label="Close"
              onClick={(event) => {
                event.stopPropagation();
                closeViewer();
              }}
            >
              <CloseIcon />
            </button>
            <span className="gallery-viewer-name">{openItem.attendeeName}</span>
            {openItem.url ? (
              <button
                type="button"
                className="gallery-viewer-download"
                aria-label="Download photo"
                disabled={downloading}
                onClick={(event) => {
                  event.stopPropagation();
                  downloadPhoto(openItem);
                }}
              >
                <DownloadIcon />
              </button>
            ) : (
              <span className="gallery-viewer-download-spacer" aria-hidden="true" />
            )}
          </div>

          <div
            className="gallery-viewer-track"
            style={{ transform: `translateX(-${openIndex * 100}%)` }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {galleryItems.map((item, index) => (
              <div className="gallery-viewer-slide" key={item.key}>
                {/* Only mount the image near the current slide — the track holds
                    every photo for a smooth slide, but loading them all at once
                    would be wasteful for a large gallery. */}
                {Math.abs(index - openIndex) <= 1 && item.url ? (
                  <img src={item.url} alt="" />
                ) : Math.abs(index - openIndex) <= 1 ? (
                  <div className="photo-card-placeholder" aria-hidden="true">
                    {getInitials(item.attendeeName)}
                  </div>
                ) : null}
              </div>
            ))}
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

function BackArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
