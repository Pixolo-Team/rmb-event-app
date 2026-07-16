"use client";

import { ChangeEvent, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { FeedAttendee, FeedCommentData, FeedPhotoData } from "../../lib/feedTypes";

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

function previewFilter(brightness: number, filter: "none" | "warm" | "mono") {
  const tone = filter === "warm" ? "sepia(.25) saturate(1.2)" : filter === "mono" ? "grayscale(1)" : "";
  return `brightness(${brightness}%) ${tone}`.trim();
}

async function processPhoto(file: File, cropSquare: boolean, brightness: number, filter: "none" | "warm" | "mono"): Promise<File> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = sourceUrl;
    });
    let sourceX = 0, sourceY = 0, sourceWidth = image.naturalWidth, sourceHeight = image.naturalHeight;
    if (cropSquare) {
      const side = Math.min(sourceWidth, sourceHeight);
      sourceX = (sourceWidth - side) / 2; sourceY = (sourceHeight - side) / 2;
      sourceWidth = side; sourceHeight = side;
    }
    const scale = Math.min(1, 1600 / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sourceWidth * scale); canvas.height = Math.round(sourceHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image editing unavailable");
    context.filter = previewFilter(brightness, filter);
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Image conversion failed")), "image/jpeg", .88));
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally { URL.revokeObjectURL(sourceUrl); }
}

function uploadPhotoWithProgress(
  file: File,
  caption: string,
  onProgress: (percent: number) => void,
): Promise<FeedPhotoData> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("photo", file);
    if (caption.trim()) formData.append("caption", caption.trim());

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/photos");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as FeedPhotoData);
        } catch {
          reject(new Error("Invalid response"));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

export function FeedView({
  attendee,
  photos,
  setPhotos,
  demoMode = false,
}: {
  attendee: FeedAttendee;
  photos: FeedPhotoData[];
  setPhotos: Dispatch<SetStateAction<FeedPhotoData[]>>;
  demoMode?: boolean;
}) {
  const [feedState, setFeedState] = useState<"loading" | "ready" | "error">(
    demoMode ? "ready" : "loading",
  );
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [cropSquare, setCropSquare] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [filter, setFilter] = useState<"none" | "warm" | "mono">("none");
  const [composerStatus, setComposerStatus] = useState<"idle" | "uploading" | "error" | "success">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [composerError, setComposerError] = useState<string | null>(null);

  const [pendingLikes, setPendingLikes] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [enlargedPhotoId, setEnlargedPhotoId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (demoMode) return;

    let cancelled = false;
    async function load() {
      setFeedState("loading");
      try {
        const response = await fetch("/api/photos", { credentials: "include" });
        if (!response.ok) {
          if (!cancelled) setFeedState("error");
          return;
        }
        const data = (await response.json()) as FeedPageResponse;
        if (cancelled) return;
        setPhotos(data.photos);
        setNextCursor(data.nextCursor);
        setFeedState("ready");
      } catch {
        if (!cancelled) setFeedState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [demoMode, setPhotos]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 5);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles(files);
    setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
    setComposerError((event.target.files?.length ?? 0) > 5 ? "You can post up to 5 photos at a time." : null);
    setComposerStatus("idle");
  }

  function resetComposer() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedFiles([]);
    setPreviewUrls([]);
    setCaption("");
    setCropSquare(false);
    setBrightness(100);
    setFilter("none");
    setComposerStatus("idle");
    setUploadProgress(0);
  }

  async function handlePost() {
    if (selectedFiles.length === 0) {
      setComposerError("Choose at least one photo first.");
      return;
    }
    setComposerError(null);

    const uploadFiles = await Promise.all(selectedFiles.map(async (file) => {
      try { return await processPhoto(file, cropSquare, brightness, filter); } catch { return file; }
    }));

    if (demoMode) {
      const newPhotos: FeedPhotoData[] = uploadFiles.map((uploadFile, index) => ({
        id: `demo-photo-${Date.now()}-${index}`,
        url: URL.createObjectURL(uploadFile),
        caption: caption.trim() || null,
        createdAt: new Date().toISOString(),
        attendeeId: attendee.id,
        attendeeName: attendee.name,
        attendeeBusinessName: attendee.businessName,
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        comments: [],
      }));
      setPhotos((current) => [...newPhotos, ...current]);
      setComposerStatus("success");
      resetComposer();
      return;
    }

    setComposerStatus("uploading");
    setUploadProgress(0);

    try {
      const created: FeedPhotoData[] = [];
      for (let index = 0; index < uploadFiles.length; index += 1) {
        const photo = await uploadPhotoWithProgress(uploadFiles[index], caption, (percent) => setUploadProgress(Math.round(((index + percent / 100) / uploadFiles.length) * 100)));
        created.push(photo);
      }
      setPhotos((current) => [...created, ...current]);
      setComposerStatus("success");
      resetComposer();
    } catch {
      setComposerStatus("error");
      setComposerError("Couldn't upload photo. Try again.");
    }
  }

  async function handleToggleLike(photo: FeedPhotoData) {
    if (demoMode) {
      setPhotos((current) =>
        current.map((item) =>
          item.id === photo.id
            ? { ...item, likedByMe: !item.likedByMe, likeCount: item.likeCount + (item.likedByMe ? -1 : 1) }
            : item,
        ),
      );
      return;
    }

    setPendingLikes((current) => [...current, photo.id]);
    setActionError(null);
    const previousPhotos = photos;
    setPhotos((current) =>
      current.map((item) =>
        item.id === photo.id
          ? { ...item, likedByMe: !item.likedByMe, likeCount: item.likeCount + (item.likedByMe ? -1 : 1) }
          : item,
      ),
    );

    try {
      const response = await fetch(`/api/photos/${photo.id}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setPhotos(previousPhotos);
        setActionError("Couldn't update like. Try again.");
      }
    } catch {
      setPhotos(previousPhotos);
      setActionError("Couldn't update like. Check your connection and try again.");
    } finally {
      setPendingLikes((current) => current.filter((id) => id !== photo.id));
    }
  }

  async function handleAddComment(photoId: string) {
    const message = (commentDrafts[photoId] ?? "").trim();
    if (!message) return;

    if (demoMode) {
      const newComment: FeedCommentData = {
        id: `demo-comment-${Date.now()}`,
        name: attendee.name,
        message,
        createdAt: new Date().toISOString(),
      };
      setPhotos((current) =>
        current.map((item) =>
          item.id === photoId
            ? { ...item, comments: [...item.comments, newComment], commentCount: item.commentCount + 1 }
            : item,
        ),
      );
      setCommentDrafts((current) => ({ ...current, [photoId]: "" }));
      return;
    }

    setActionError(null);
    try {
      const response = await fetch(`/api/photos/${photoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        setActionError("Couldn't post comment. Try again.");
        return;
      }
      const newComment = (await response.json()) as FeedCommentData;
      setPhotos((current) =>
        current.map((item) =>
          item.id === photoId
            ? { ...item, comments: [...item.comments, newComment], commentCount: item.commentCount + 1 }
            : item,
        ),
      );
      setCommentDrafts((current) => ({ ...current, [photoId]: "" }));
    } catch {
      setActionError("Couldn't post comment. Check your connection and try again.");
    }
  }

  async function handleDelete(photoId: string) {
    if (typeof window !== "undefined" && !window.confirm("Delete this photo?")) return;
    setOpenMenuId(null);

    if (demoMode) {
      setPhotos((current) => current.filter((item) => item.id !== photoId));
      if (enlargedPhotoId === photoId) setEnlargedPhotoId(null);
      return;
    }

    setActionError(null);
    try {
      const response = await fetch(`/api/photos/${photoId}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) {
        setActionError("Couldn't delete photo. Try again.");
        return;
      }
      setPhotos((current) => current.filter((item) => item.id !== photoId));
      if (enlargedPhotoId === photoId) setEnlargedPhotoId(null);
    } catch {
      setActionError("Couldn't delete photo. Check your connection and try again.");
    }
  }

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/photos?cursor=${encodeURIComponent(nextCursor)}`, {
        credentials: "include",
      });
      if (!response.ok) {
        setActionError("Couldn't load more photos.");
        return;
      }
      const data = (await response.json()) as FeedPageResponse;
      setPhotos((current) => [...current, ...data.photos]);
      setNextCursor(data.nextCursor);
    } catch {
      setActionError("Couldn't load more photos. Check your connection.");
    } finally {
      setLoadingMore(false);
    }
  }

  const enlargedPhoto = photos.find((photo) => photo.id === enlargedPhotoId) ?? null;

  return (
    <>
      <main className="app-content">
        {actionError ? (
          <div className="banner warn app-banner">
            <div>
              <b>Feed issue</b>
              {actionError}
            </div>
          </div>
        ) : null}

        <div className="feed-heading"><div><p className="eyebrow">Event community</p><h1>Event Photos</h1></div></div>

        <section className="composer-card feed-composer">
          <div className="composer-person">
            <div className="hero-avatar composer-avatar" aria-hidden="true">{getInitials(attendee.name)}</div>
            <div><strong>{attendee.name}</strong><span>Share a moment with attendees</span></div>
          </div>

          <div className="field composer-caption">
            <label className="sr-only" htmlFor="photo-caption">Caption</label>
            <textarea id="photo-caption" maxLength={200} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="What would you like to share?" />
            <small>{caption.length}/200</small>
          </div>

          <div className="composer-actions">
            <button className="composer-photo-button" type="button" onClick={() => fileInputRef.current?.click()}><PhotoAddIcon />{selectedFiles.length ? `${selectedFiles.length} selected` : "Add photos"}</button>
            <input
              className="sr-only"
              id="photo-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleFileChange}
            />
            <button className="btn-primary composer-post-button" type="button" disabled={composerStatus === "uploading" || selectedFiles.length === 0} onClick={handlePost}>
              {composerStatus === "uploading" ? `${uploadProgress}%` : "Post"}
            </button>
          </div>

          {previewUrls.length ? (
            <div className={`composer-preview-grid count-${Math.min(previewUrls.length, 4)}`}>
              {previewUrls.map((url, index) => <div className="composer-preview" key={url}><img src={url} alt={`Selected preview ${index + 1}`} style={{ filter: previewFilter(brightness, filter) }} /></div>)}
            </div>
          ) : null}

          {previewUrls.length ? <div className="photo-editor" aria-label="Photo adjustments">
            <label><input type="checkbox" checked={cropSquare} onChange={(event) => setCropSquare(event.target.checked)} /> Square crop</label>
            <label><span>Brightness</span><input type="range" min="60" max="140" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} /><output>{brightness}%</output></label>
            <label><span>Filter</span><select value={filter} onChange={(event) => setFilter(event.target.value as "none" | "warm" | "mono")}><option value="none">Original</option><option value="warm">Warm</option><option value="mono">Black & white</option></select></label>
          </div> : null}

          {composerStatus === "uploading" ? (
            <div className="upload-progress-bar" style={{ marginTop: 12 }}>
              <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          ) : null}

          {composerError ? (
            <div className="banner warn app-banner" style={{ marginTop: 12 }}>
              <div>
                <b>Couldn't post</b>
                {composerError}
              </div>
            </div>
          ) : null}

        </section>

        {feedState === "loading" ? (
          <section className="feature-card">
            <p className="feature-title">Loading the feed&hellip;</p>
          </section>
        ) : null}

        {feedState === "error" ? (
          <section className="feature-card">
            <p className="feature-title">Can't load the feed</p>
            <p className="feature-copy">Check your connection and try again.</p>
          </section>
        ) : null}

        {feedState === "ready" && photos.length === 0 ? (
          <section className="feature-card">
            <p className="feature-title">No photos yet</p>
            <p className="feature-copy">Be the first to post!</p>
          </section>
        ) : null}

        {feedState === "ready"
          ? photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                isOwn={photo.attendeeId === attendee.id}
                busyLike={pendingLikes.includes(photo.id)}
                menuOpen={openMenuId === photo.id}
                commentDraft={commentDrafts[photo.id] ?? ""}
                onToggleMenu={() => setOpenMenuId((current) => (current === photo.id ? null : photo.id))}
                onToggleLike={() => handleToggleLike(photo)}
                onCommentDraftChange={(value) => setCommentDrafts((current) => ({ ...current, [photo.id]: value }))}
                onSubmitComment={() => handleAddComment(photo.id)}
                onDelete={() => handleDelete(photo.id)}
                onEnlarge={() => setEnlargedPhotoId(photo.id)}
              />
            ))
          : null}

        {!demoMode && nextCursor ? (
          <button className="btn-primary" type="button" disabled={loadingMore} onClick={handleLoadMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        ) : null}
      </main>

      {enlargedPhoto ? (
        <div className="photo-modal-overlay" role="dialog" aria-modal="true" onClick={() => setEnlargedPhotoId(null)}>
          <div className="photo-modal-card" onClick={(event) => event.stopPropagation()}>
            <button className="icon-action" type="button" onClick={() => setEnlargedPhotoId(null)} style={{ marginBottom: 12 }}>
              Close
            </button>

            <div className="photo-card-media">
              {enlargedPhoto.url ? (
                <img src={enlargedPhoto.url} alt="" />
              ) : (
                <div className="photo-card-placeholder" aria-hidden="true">
                  {getInitials(enlargedPhoto.attendeeName)}
                </div>
              )}
            </div>

            <p className="person-name" style={{ marginTop: 12 }}>
              {enlargedPhoto.attendeeName}
            </p>
            {enlargedPhoto.caption ? <p className="person-bio">{enlargedPhoto.caption}</p> : null}
            <p className="person-line muted">{formatTimestamp(enlargedPhoto.createdAt)}</p>

            <div className="comment-list" style={{ marginTop: 16 }}>
              {enlargedPhoto.comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <strong>{comment.name}</strong> {comment.message}
                </div>
              ))}
            </div>

            <div className="comment-form">
              <input
                placeholder="Add a comment..."
                value={commentDrafts[enlargedPhoto.id] ?? ""}
                onChange={(event) =>
                  setCommentDrafts((current) => ({ ...current, [enlargedPhoto.id]: event.target.value }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAddComment(enlargedPhoto.id);
                }}
              />
              <button className="comment-send" type="button" onClick={() => handleAddComment(enlargedPhoto.id)} aria-label="Send comment">
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PhotoCard({
  photo,
  isOwn,
  busyLike,
  menuOpen,
  commentDraft,
  onToggleMenu,
  onToggleLike,
  onCommentDraftChange,
  onSubmitComment,
  onDelete,
  onEnlarge,
}: {
  photo: FeedPhotoData;
  isOwn: boolean;
  busyLike: boolean;
  menuOpen: boolean;
  commentDraft: string;
  onToggleMenu: () => void;
  onToggleLike: () => void;
  onCommentDraftChange: (value: string) => void;
  onSubmitComment: () => void;
  onDelete: () => void;
  onEnlarge: () => void;
}) {
  const visibleComments = photo.comments.slice(-2);

  return (
    <article className="photo-card person-card">
      <div className="person-card-head">
        <div className="hero-avatar person-avatar" aria-hidden="true">
          {getInitials(photo.attendeeName)}
        </div>
        <div className="person-meta">
          <h2 className="person-name">{photo.attendeeName}</h2>
          <p className="person-line muted">
            {[photo.attendeeBusinessName, formatTimestamp(photo.createdAt)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="post-menu">
          <button className="post-menu-btn" type="button" onClick={onToggleMenu} aria-label="Post options">
            &hellip;
          </button>
          {menuOpen ? (
            <div className="post-menu-dropdown">
              {isOwn ? (
                <button type="button" onClick={onDelete}>
                  Delete
                </button>
              ) : (
                <span className="person-line muted">No actions available</span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <button type="button" className="photo-card-media" onClick={onEnlarge} aria-label="Enlarge photo">
        {photo.url ? (
          <img src={photo.url} alt="" />
        ) : (
          <div className="photo-card-placeholder" aria-hidden="true">
            {getInitials(photo.attendeeName)}
          </div>
        )}
      </button>

      {photo.caption ? <p className="person-bio">{photo.caption}</p> : null}

      <div className="person-actions">
        <button className={`like-btn${photo.likedByMe ? " active" : ""}`} type="button" disabled={busyLike} onClick={onToggleLike}>
          <LikeIcon /><span>{photo.likeCount}</span><span className="sr-only">{photo.likedByMe ? "Unlike" : "Like"}</span>
        </button>
        <button className="person-link" type="button" onClick={onEnlarge} aria-label={`${photo.commentCount} comments`}>
          <CommentIcon /><span>{photo.commentCount}</span>
        </button>
      </div>

      {visibleComments.length > 0 ? (
        <div className="comment-list">
          {visibleComments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <strong>{comment.name}</strong> {comment.message}
            </div>
          ))}
          {photo.commentCount > visibleComments.length ? (
            <button type="button" className="link-muted" onClick={onEnlarge}>
              View all {photo.commentCount} comments
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="comment-form">
        <input
          placeholder="Add a comment..."
          value={commentDraft}
          onChange={(event) => onCommentDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmitComment();
          }}
        />
        <button className="comment-send" type="button" onClick={onSubmitComment} aria-label="Send comment" disabled={!commentDraft.trim()}>
          <SendIcon />
        </button>
      </div>
    </article>
  );
}

function PhotoAddIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h4l1.5-2h5L16 6h4v14H4V6Z" /><circle cx="12" cy="13" r="4" /></svg>; }
function LikeIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>; }
function CommentIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v11H9l-4 3V5Z" /></svg>; }
function SendIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 5 16 7-16 7 3-7-3-7Zm3 7h13" /></svg>; }
