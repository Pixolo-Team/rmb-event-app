"use client";

import type { DirectoryAttendee } from "./TutorialPage";
import { AttendeeActions, MetBadge, getInitials } from "./AttendeeCard";

export function FullProfileModal({
  person,
  busy,
  onToggleBookmark,
  onClose,
}: {
  person: DirectoryAttendee;
  busy: boolean;
  onToggleBookmark: () => void;
  onClose: () => void;
}) {
  const tags = [
    ...(person.businessCategory ? [person.businessCategory] : []),
    ...(person.city ? [person.city] : []),
    ...(person.chapterName ? [person.chapterName] : []),
  ];

  return (
    <div className="photo-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="photo-modal-card" onClick={(event) => event.stopPropagation()}>
        <button className="icon-action" type="button" onClick={onClose} style={{ marginBottom: 16 }}>
          Close
        </button>

        <div className="profile-hero">
          <div className="hero-avatar profile-hero-avatar" aria-hidden="true">
            {person.photoUrl ? <img src={person.photoUrl} alt="" /> : getInitials(person.name)}
          </div>
          <h2 className="profile-hero-name">
            {person.name}
            {person.met ? <MetBadge /> : null}
          </h2>
          {person.businessName ? <p className="profile-hero-business">{person.businessName}</p> : null}
        </div>

        {tags.length > 0 ? (
          <div className="chip-row" style={{ marginTop: 14 }}>
            {tags.map((tag) => (
              <span key={tag} className="chip static">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {person.bio ? <p className="person-bio" style={{ marginTop: 14 }}>{person.bio}</p> : null}

        <div style={{ marginTop: 16 }}>
          <AttendeeActions person={person} busy={busy} onToggleBookmark={onToggleBookmark} />
        </div>
      </div>
    </div>
  );
}
