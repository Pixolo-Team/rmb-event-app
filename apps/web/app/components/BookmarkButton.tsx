"use client";

import { useState } from "react";
import { withCsrfHeaders } from "../lib/csrf";
import { enqueueWrite } from "../lib/offlineQueue";
import { directoryCache } from "../lib/directoryCache";
import { matchesCache } from "../lib/matchesCache";

export function BookmarkButton({ attendeeId, initialBookmarked, compact = false, onChange }: { attendeeId: string; initialBookmarked: boolean; compact?: boolean; onChange?: (value: boolean) => void }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function change() {
    if (saving) return;
    const next = !bookmarked;
    setBookmarked(next);
    onChange?.(next);
    setSaving(true);
    const method = next ? "PUT" : "DELETE";
    try {
      const response = await fetch(
        `/api/bookmarks/${attendeeId}`,
        withCsrfHeaders({ method, credentials: "include" }),
      );
      if (response.status === 404) {
        setNotFound(true);
        setBookmarked(!next);
        // onChange runs first — callers (Directory/Matches pages) persist their
        // own optimistic update back into these same caches via onChange, so
        // clearing has to happen after that write, not before, or it gets
        // silently undone.
        onChange?.(!next);
        directoryCache.clear();
        matchesCache.clear();
        return;
      }
      if (!response.ok) throw new Error("server rejected bookmark");
    } catch (error) {
      if (error instanceof TypeError || !navigator.onLine) {
        await enqueueWrite(next ? "bookmark-add" : "bookmark-remove", `/api/bookmarks/${attendeeId}`, {}, method);
      } else {
        setBookmarked(!next);
        onChange?.(!next);
      }
    } finally {
      setSaving(false);
    }
  }

  if (notFound) {
    return <span className="bookmark-button bookmark-button-stale" title="This attendee is no longer available">
      <BookmarkIcon />{!compact && <span>No longer available</span>}
    </span>;
  }

  return <button className={`bookmark-button${bookmarked ? " is-bookmarked" : ""}${compact ? " compact" : ""}`} type="button" onClick={change} aria-pressed={bookmarked} aria-label={bookmarked ? "Remove from Want to Meet" : "Add to Want to Meet"}>
    <BookmarkIcon />{!compact && <span>{bookmarked ? "Saved to Want to Meet" : "Want to meet"}</span>}
  </button>;
}

function BookmarkIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.8L6 21V4.8Z" /></svg>; }
