"use client";

import { ChangeEvent, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { AttendeeMe, FeedCommentData, FeedPhotoData, TEMP_BYPASS_LOGIN } from "./TutorialPage";
import { CommentIcon, ThumbUpIcon } from "./icons";
import { withCsrfHeaders } from "../../lib/csrf";
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

export function PostComposerModal({
  attendee,
  setPhotos,
  isOpen,
  onRequestClose,
  demoMode = false,
}: {
  attendee: AttendeeMe;
  setPhotos: Dispatch<SetStateAction<FeedPhotoData[]>>;
  isOpen: boolean;
  onRequestClose: () => void;
  demoMode?: boolean;
}) {
  const localMode = TEMP_BYPASS_LOGIN || demoMode;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [composerStatus, setComposerStatus] = useState<"idle" | "uploading" | "error" | "success">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    setComposerError(null);
    setComposerStatus("idle");
  }

  function resetComposer() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setComposerStatus("idle");
    setUploadProgress(0);
  }

  function closeComposer() {
    if (closing || composerStatus === "uploading") return;
    setClosing(true);
    window.setTimeout(() => {
      resetComposer();
      setClosing(false);
      onRequestClose();
    }, 200);
  }

  async function handlePost() {
    if (!selectedFile) {
      setComposerError("Choose a photo first.");
      return;
    }
    setComposerError(null);

    if (localMode) {
      const newPhoto: FeedPhotoData = {
        id: `demo-photo-${Date.now()}`,
        url: URL.createObjectURL(selectedFile),
        caption: caption.trim() || null,
        createdAt: new Date().toISOString(),
        attendeeId: attendee.id,
        attendeeName: attendee.name,
        attendeeBusinessName: attendee.businessName,
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        comments: [],
      };
      setPhotos((current) => [newPhoto, ...current]);
      setComposerStatus("success");
      closeComposer();
      return;
    }

    setComposerStatus("uploading");
    setUploadProgress(0);

    try {
      const created = await uploadPhotoWithProgress(selectedFile, caption, setUploadProgress);
      setPhotos((current) => [created, ...current]);
      setComposerStatus("success");
      closeComposer();
    } catch {
      setComposerStatus("error");
      setComposerError("Couldn't upload photo. Try again.");
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className={`photo-modal-overlay${closing ? " closing" : ""}`}
      role="dialog"
      aria-modal="true"
      onClick={closeComposer}
    >
      <div className="photo-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="photo-modal-handle" aria-hidden="true" />

        <div className="photo-modal-header">
          <div>
            <p className="photo-modal-eyebrow">New post</p>
            <h1 className="settings-title">Share a photo</h1>
            <p className="settings-copy">Post a photo from tonight and let others see what&apos;s happening.</p>
          </div>
          <button
            className="photo-modal-close"
            type="button"
            onClick={closeComposer}
            disabled={composerStatus === "uploading"}
            aria-label="Close share photo modal"
          >
            Close
          </button>
        </div>

        <div className="field photo-modal-field">
          <label htmlFor="photo-input" className="photo-modal-label">
            Photo
          </label>
          <label htmlFor="photo-input" className="photo-picker">
            {previewUrl ? (
              <img src={previewUrl} alt="Selected preview" />
            ) : (
              <span className="photo-picker-placeholder">
                <span className="photo-picker-icon" aria-hidden="true">
                  +
                </span>
                Add a photo
              </span>
            )}
          </label>
          <input
            id="photo-input"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>

        <div className="field photo-modal-field">
          <div className="photo-modal-label-row">
            <label htmlFor="photo-caption" className="photo-modal-label">
              Caption
            </label>
            <small className="photo-modal-counter">{caption.length}/200</small>
          </div>
          <textarea
            id="photo-caption"
            maxLength={200}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Say something about this moment..."
            className="photo-modal-textarea"
          />
        </div>

        {composerStatus === "uploading" ? (
          <div className="upload-progress-bar photo-modal-progress">
            <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        ) : null}

        {composerError ? (
          <div className="banner warn app-banner photo-modal-banner">
            <div>
              <b>Couldn't post</b>
              {composerError}
            </div>
          </div>
        ) : null}

        <div className="photo-modal-actions">
          <button className="photo-modal-secondary" type="button" onClick={closeComposer} disabled={composerStatus === "uploading"}>
            Cancel
          </button>
          <button className="btn-primary photo-modal-submit" type="button" disabled={composerStatus === "uploading"} onClick={handlePost}>
            {composerStatus === "uploading" ? `Uploading... ${uploadProgress}%` : "Post photo"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FeedView({
  attendee,
  photos,
  setPhotos,
  demoMode = false,
}: {
  attendee: AttendeeMe;
  photos: FeedPhotoData[];
  setPhotos: Dispatch<SetStateAction<FeedPhotoData[]>>;
  demoMode?: boolean;
}) {
  const localMode = TEMP_BYPASS_LOGIN || demoMode;
  const [feedState, setFeedState] = useState<"loading" | "ready" | "error">(
    localMode ? "ready" : "loading",
  );
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pendingLikes, setPendingLikes] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [enlargedPhotoId, setEnlargedPhotoId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!openMenuId) return;
    function handleClickAway(event: MouseEvent) {
      if (!(event.target instanceof Element) || !event.target.closest(".post-menu")) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("click", handleClickAway);
    return () => document.removeEventListener("click", handleClickAway);
  }, [openMenuId]);

  useEffect(() => {
    if (!enlargedPhotoId) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [enlargedPhotoId]);

  useEffect(() => {
    if (localMode) {
      setFeedState("ready");
      return;
    }

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
  }, [localMode, setPhotos]);

  async function handleToggleLike(photo: FeedPhotoData) {
    if (localMode) {
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
      const response = await fetch(`/api/photos/${photo.id}/like`, withCsrfHeaders({
        method: "POST",
        credentials: "include",
      }));
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

    if (localMode) {
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
      if (enlargedPhotoId === photoId) setEnlargedPhotoId(null);
      return;
    }

    setActionError(null);
    try {
      const response = await fetch(`/api/photos/${photoId}/comments`, withCsrfHeaders({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }));
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
      if (enlargedPhotoId === photoId) setEnlargedPhotoId(null);
    } catch {
      setActionError("Couldn't post comment. Check your connection and try again.");
    }
  }

  async function handleDelete(photoId: string) {
    if (typeof window !== "undefined" && !window.confirm("Delete this photo?")) return;
    setOpenMenuId(null);

    if (localMode) {
      setPhotos((current) => current.filter((item) => item.id !== photoId));
      if (enlargedPhotoId === photoId) setEnlargedPhotoId(null);
      return;
    }

    setActionError(null);
    try {
      const response = await fetch(`/api/photos/${photoId}`, withCsrfHeaders({ method: "DELETE", credentials: "include" }));
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

        {!localMode && nextCursor ? (
          <button className="btn-primary" type="button" disabled={loadingMore} onClick={handleLoadMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        ) : null}
      </main>

      {enlargedPhoto ? (
        <div className="photo-modal-overlay" role="dialog" aria-modal="true" onClick={() => setEnlargedPhotoId(null)}>
          <div className="photo-modal-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button className="icon-action" type="button" onClick={() => setEnlargedPhotoId(null)}>
                Close
              </button>
            </div>

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
              <button className="btn-primary" type="button" onClick={() => handleAddComment(enlargedPhoto.id)}>
                Send
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

      {photo.likeCount > 0 || photo.commentCount > 0 ? (
        <div className="post-stats">
          {photo.likeCount > 0 ? (
            <span className="post-stats-likes">
              <span className="post-stats-thumb" aria-hidden="true">
                <ThumbUpIcon filled size={11} />
              </span>
              {photo.likeCount}
            </span>
          ) : (
            <span />
          )}
          {photo.commentCount > 0 ? (
            <button type="button" className="post-stats-comments" onClick={onEnlarge}>
              {photo.commentCount} comment{photo.commentCount === 1 ? "" : "s"}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="post-action-bar">
        <button
          className={`post-action${photo.likedByMe ? " active" : ""}`}
          type="button"
          disabled={busyLike}
          onClick={onToggleLike}
        >
          <ThumbUpIcon filled={photo.likedByMe} />
          Like
        </button>
        <button className="post-action" type="button" onClick={onEnlarge}>
          <CommentIcon />
          Comment
        </button>
      </div>

      {visibleComments.length > 0 ? (
        <div className="comment-list">
          {photo.commentCount > visibleComments.length ? (
            <button type="button" className="link-muted" onClick={onEnlarge}>
              View all {photo.commentCount} comments
            </button>
          ) : null}
          {visibleComments.map((comment) => (
            <div key={comment.id} className="comment-row">
              <div className="comment-avatar" aria-hidden="true">
                {getInitials(comment.name)}
              </div>
              <div className="comment-bubble">
                <strong>{comment.name}</strong>
                <span>{comment.message}</span>
              </div>
            </div>
          ))}
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
        <button className="btn-primary" type="button" onClick={onSubmitComment}>
          Send
        </button>
      </div>
    </article>
  );
}
