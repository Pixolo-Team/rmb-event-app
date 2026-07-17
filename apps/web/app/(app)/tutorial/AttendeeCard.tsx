"use client";

import type { DirectoryAttendee } from "./TutorialPage";
import { BookmarkIcon, CheckIcon, LinkedInIcon, PhoneIcon, ShareIcon } from "./icons";

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "EV";
}

export async function shareAttendee(person: Pick<DirectoryAttendee, "id" | "name">) {
  if (typeof window === "undefined") return;
  const url = `${window.location.origin}/p/${person.id}`;
  const title = `${person.name} — Evento`;
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
  } catch {
    // User dismissed the share sheet, or clipboard was blocked — nothing to recover.
  }
}

export function MetBadge() {
  return (
    <span className="met-badge">
      <CheckIcon size={13} />
      Met
    </span>
  );
}

export function AttendeeActions({
  person,
  busy,
  onToggleBookmark,
}: {
  person: DirectoryAttendee;
  busy: boolean;
  onToggleBookmark: () => void;
}) {
  return (
    <div className="person-actions">
      <button
        className={`icon-btn${person.bookmarked ? " active" : ""}`}
        type="button"
        disabled={busy}
        onClick={onToggleBookmark}
        aria-label={person.bookmarked ? "Remove bookmark" : "Bookmark"}
        title={person.bookmarked ? "Bookmarked" : "Bookmark"}
      >
        <BookmarkIcon filled={person.bookmarked} />
      </button>
      <a className="icon-btn" href={`tel:${person.phone}`} aria-label="Call" title="Call">
        <PhoneIcon />
      </a>
      {person.linkedInUrl ? (
        <a
          className="icon-btn"
          href={person.linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          title="LinkedIn"
        >
          <LinkedInIcon />
        </a>
      ) : null}
      <button
        className="icon-btn"
        type="button"
        onClick={() => shareAttendee(person)}
        aria-label="Share contact"
        title="Share"
      >
        <ShareIcon />
      </button>
    </div>
  );
}

export function AttendeeCard({
  person,
  busy,
  onToggleBookmark,
  onOpen,
}: {
  person: DirectoryAttendee;
  busy: boolean;
  onToggleBookmark: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="person-card">
      <button type="button" className="person-card-open" onClick={onOpen}>
        <div className="person-card-head">
          <div className="hero-avatar person-avatar" aria-hidden="true">
            {person.photoUrl ? <img src={person.photoUrl} alt="" /> : getInitials(person.name)}
          </div>
          <div className="person-meta">
            <h2 className="person-name">
              {person.name}
              {person.met ? <MetBadge /> : null}
            </h2>
            <p className="person-line">{person.businessName ?? "Business details coming soon"}</p>
            <p className="person-line muted">
              {[person.businessCategory, person.city, person.chapterName].filter(Boolean).join(" · ") || "Attendee"}
            </p>
          </div>
        </div>
        {person.bio ? <p className="person-bio">{person.bio}</p> : null}
      </button>
      <AttendeeActions person={person} busy={busy} onToggleBookmark={onToggleBookmark} />
    </article>
  );
}
