"use client";

import { ChangeEvent, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { AttendeeMe, FeedCommentData, FeedPhotoData } from "./TutorialPage";
import { CommentIcon } from "./icons";
import { PoweredByFooter } from "./PoweredByFooter";
import { ConfirmDialog } from "./ConfirmDialog";
import { getCsrfToken, withCsrfHeaders } from "../../lib/csrf";
type FeedPageResponse = {
  photos: FeedPhotoData[];
  nextCursor: string | null;
};

const MAX_PHOTOS_PER_POST = 6;

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
  files: File[],
  caption: string,
  onProgress: (percent: number) => void,
): Promise<FeedPhotoData> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("photos", file));
    if (caption.trim()) formData.append("caption", caption.trim());

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/photos");
    xhr.withCredentials = true;
    const csrfToken = getCsrfToken();
    if (csrfToken) xhr.setRequestHeader("X-CSRF-Token", csrfToken);
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
  const localMode = demoMode;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
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
    const files = Array.from(event.target.files ?? []).slice(0, MAX_PHOTOS_PER_POST);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles(files);
    setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
    setComposerError(null);
    setComposerStatus("idle");
    if ((event.target.files?.length ?? 0) > MAX_PHOTOS_PER_POST) {
      setComposerError(`Choose up to ${MAX_PHOTOS_PER_POST} photos at a time.`);
    }
  }

  function resetComposer() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedFiles([]);
    setPreviewUrls([]);
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
    if (selectedFiles.length === 0) {
      setComposerError("Choose at least one photo first.");
      return;
    }
    setComposerError(null);

    if (localMode) {
      const createdAt = Date.now();
      const urls = selectedFiles.map((file) => URL.createObjectURL(file));
      const newPhoto: FeedPhotoData = {
        id: `demo-photo-${createdAt}`,
        url: urls[0],
        urls,
        caption: caption.trim() || null,
        createdAt: new Date(createdAt).toISOString(),
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
      const created = await uploadPhotoWithProgress(selectedFiles, caption, setUploadProgress);
      setPhotos((current) => [created, ...current]);
      setComposerStatus("success");
      closeComposer();
    } catch {
      setComposerStatus("error");
      setComposerError("Couldn't upload the selected photos. Try again.");
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
            <h1 className="settings-title">Share photos</h1>
            <p className="settings-copy">Select up to {MAX_PHOTOS_PER_POST} photos for one carousel post.</p>
          </div>
          <button
            className="photo-modal-close"
            type="button"
            onClick={closeComposer}
            disabled={composerStatus === "uploading"}
            aria-label="Close share photos modal"
          >
            Close
          </button>
        </div>

        <div className="field photo-modal-field">
          <label htmlFor="photo-input" className="photo-modal-label">
            Photos <small>({selectedFiles.length}/{MAX_PHOTOS_PER_POST})</small>
          </label>
          <label htmlFor="photo-input" className="photo-picker">
            {previewUrls.length > 0 ? (
              <span className={`composer-preview-grid count-${previewUrls.length}`}>
                {previewUrls.map((url, index) => <span className="composer-preview" key={url}><img src={url} alt={`Selected photo ${index + 1}`} /></span>)}
              </span>
            ) : (
              <span className="photo-picker-placeholder">
                <span className="photo-picker-icon" aria-hidden="true">
                  +
                </span>
                Add photos
              </span>
            )}
          </label>
          <input
            id="photo-input"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
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
            {composerStatus === "uploading"
              ? `Uploading... ${uploadProgress}%`
              : selectedFiles.length > 0
                ? `Post ${selectedFiles.length} photo${selectedFiles.length === 1 ? "" : "s"}`
                : "Post photos"}
          </button>
        </div>

        <PoweredByFooter />
      </div>
    </div>
  );
}

export function FeedView({
  attendee,
  photos,
  setPhotos,
  demoMode = false,
  initialDataLoaded = false,
  externalDataLoad = false,
}: {
  attendee: AttendeeMe;
  photos: FeedPhotoData[];
  setPhotos: Dispatch<SetStateAction<FeedPhotoData[]>>;
  demoMode?: boolean;
  initialDataLoaded?: boolean;
  externalDataLoad?: boolean;
}) {
  const localMode = demoMode;
  const [feedState, setFeedState] = useState<"loading" | "ready" | "error">(
    localMode || initialDataLoaded ? "ready" : "loading",
  );
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pendingLikes, setPendingLikes] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [enlargedPhotoId, setEnlargedPhotoId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [enlargedClosing, setEnlargedClosing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

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

  function closeEnlarged() {
    if (enlargedClosing) return;
    setEnlargedClosing(true);
    window.setTimeout(() => {
      setEnlargedPhotoId(null);
      setEnlargedClosing(false);
    }, 200);
  }

  useEffect(() => {
    if (localMode || initialDataLoaded) {
      setFeedState("ready");
      return;
    }
    if (externalDataLoad) {
      setFeedState("loading");
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
  }, [externalDataLoad, initialDataLoaded, localMode, setPhotos]);

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
      if (enlargedPhotoId === photoId) closeEnlarged();
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
      if (enlargedPhotoId === photoId) closeEnlarged();
    } catch {
      setActionError("Couldn't post comment. Check your connection and try again.");
    }
  }

  async function deletePhoto(photoId: string) {
    setOpenMenuId(null);

    if (localMode) {
      setPhotos((current) => current.filter((item) => item.id !== photoId));
      if (enlargedPhotoId === photoId) closeEnlarged();
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
      if (enlargedPhotoId === photoId) closeEnlarged();
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
        <section className="feed-composer" aria-label="Create a post">
          <div className="composer-person">
            <span className="directory-avatar fallback composer-avatar" aria-hidden="true">{getInitials(attendee.name)}</span>
            <button className="composer-start-button" type="button" onClick={() => setComposerOpen(true)}>
              Start a post
            </button>
          </div>
          <button className="composer-photo-entry" type="button" onClick={() => setComposerOpen(true)}>
            <PhotoEntryIcon />
            Photo
          </button>
        </section>

        {actionError ? (
          <div className="banner warn app-banner">
            <div>
              <b>Feed issue</b>
              {actionError}
            </div>
          </div>
        ) : null}

        {feedState === "loading" ? (
          <FeedSkeleton />
        ) : null}

        {feedState === "error" ? (
          <section className="feature-card">
            <p className="feature-title">Can't load the feed</p>
            <p className="feature-copy">Check your connection and try again.</p>
          </section>
        ) : null}

        {feedState === "ready" && photos.length === 0 ? (
          <p className="feed-empty-message">No posts yet</p>
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
                onDelete={() => setDeleteTargetId(photo.id)}
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

      <PostComposerModal
        attendee={attendee}
        setPhotos={setPhotos}
        isOpen={composerOpen}
        onRequestClose={() => setComposerOpen(false)}
        demoMode={demoMode}
      />

      {enlargedPhoto ? (
        <div
          className={`photo-modal-overlay${enlargedClosing ? " closing" : ""}`}
          role="dialog"
          aria-modal="true"
          onClick={closeEnlarged}
        >
          <div className="photo-modal-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button className="icon-action" type="button" onClick={closeEnlarged}>
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

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete this photo?"
        message="This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTargetId) deletePhoto(deleteTargetId);
          setDeleteTargetId(null);
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  );
}

function PhotoEntryIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m5 17 5-5 3 3 2-2 4 4" /></svg>;
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
  const mediaUrls = photo.urls?.length ? photo.urls : photo.url ? [photo.url] : [];
  const [activeMedia, setActiveMedia] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

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

      {photo.caption ? <p className={`post-caption${captionExpanded ? " expanded" : ""}`}><span>{photo.caption}</span>{photo.caption.length > 72 && <button type="button" onClick={() => setCaptionExpanded(!captionExpanded)}>{captionExpanded ? "less" : "Read more"}</button>}</p> : null}

      <div className="post-carousel">
      <button type="button" className="photo-card-media" onClick={onEnlarge} aria-label="Enlarge photo">
        {mediaUrls[activeMedia] ? (
          <img src={mediaUrls[activeMedia]} alt="" />
        ) : (
          <div className="photo-card-placeholder" aria-hidden="true">
            {getInitials(photo.attendeeName)}
          </div>
        )}
      </button>
      {mediaUrls.length > 1 && <><button className="carousel-arrow previous" type="button" aria-label="Previous photo" onClick={() => setActiveMedia((activeMedia - 1 + mediaUrls.length) % mediaUrls.length)}>‹</button><button className="carousel-arrow next" type="button" aria-label="Next photo" onClick={() => setActiveMedia((activeMedia + 1) % mediaUrls.length)}>›</button><div className="carousel-dots" aria-label={`Photo ${activeMedia + 1} of ${mediaUrls.length}`}>{mediaUrls.map((_, index) => <span key={index} className={index === activeMedia ? "active" : ""} />)}</div></>}
      </div>

      <div className="post-action-bar">
        <button
          className={`post-action${photo.likedByMe ? " active" : ""}`}
          type="button"
          disabled={busyLike}
          onClick={onToggleLike}
        >
          <HeartIcon filled={photo.likedByMe} />
          <span>{photo.likeCount}</span>
          <span className="sr-only"> likes</span>
        </button>
        <button className="post-action" type="button" aria-label="Open comments" onClick={() => setCommentsOpen(!commentsOpen)}>
          <CommentIcon />
          <span>{photo.commentCount}</span>
          <span className="sr-only"> comments</span>
        </button>
      </div>

      {commentsOpen && visibleComments.length > 0 ? (
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

      {commentsOpen && <div className="comment-form">
        <input
          placeholder="Add a comment..."
          value={commentDraft}
          onChange={(event) => onCommentDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmitComment();
          }}
        />
        <button className="comment-send" type="button" aria-label="Send comment" disabled={!commentDraft.trim()} onClick={onSubmitComment}>
          <SendCommentIcon />
        </button>
      </div>}
    </article>
  );
}

export function FeedSkeleton() {
  return <section className="feed-post-skeleton" aria-label="Loading posts" aria-busy="true">
    <div className="feed-skeleton-author">
      <span className="skeleton-block feed-skeleton-avatar" />
      <span className="feed-skeleton-author-lines">
        <span className="skeleton-block feed-skeleton-name" />
        <span className="skeleton-block feed-skeleton-meta" />
      </span>
    </div>
    <span className="skeleton-block feed-skeleton-caption" />
    <span className="skeleton-block feed-skeleton-photo" />
    <div className="feed-skeleton-actions">
      <span className="skeleton-block" />
      <span className="skeleton-block" />
    </div>
    <span className="sr-only">Loading posts…</span>
  </section>;
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SendCommentIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14" /></svg>; }
