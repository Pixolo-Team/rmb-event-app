"use client";

import { useEffect, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { FeedView } from "../(app)/tutorial/FeedView";
import type { AttendeeMe } from "../(app)/tutorial/TutorialPage";
import type { FeedPhotoData } from "../lib/feedTypes";

const PREVIEW_ATTENDEE: AttendeeMe = {
  id: "preview-me",
  name: "Radha Sharma",
  email: "radha@example.com",
  phone: "+91 98765 43210",
  businessName: "Sharma Trading Co.",
  chapterName: "RMB Ahmedabad",
  tableNumber: "A-12",
  city: "Ahmedabad",
  businessCategory: "Textiles",
  photoUrl: null,
  profileCompletedAt: new Date().toISOString(),
};
const PREVIEW_PHOTOS: FeedPhotoData[] = [
  { id: "preview-photo-1", url: null, caption: "A great start to the evening — so many useful conversations already!", createdAt: "2026-07-16T12:10:00.000Z", attendeeId: "preview-1", attendeeName: "Aarav Mehta", attendeeBusinessName: "Mehta Packaging Solutions", likeCount: 18, commentCount: 2, likedByMe: true, comments: [{ id: "c1", name: "Neha Kapoor", message: "Wonderful meeting everyone!", createdAt: "2026-07-16T12:15:00.000Z" }, { id: "c2", name: "Radha Sharma", message: "Great energy tonight.", createdAt: "2026-07-16T12:18:00.000Z" }] },
  { id: "preview-photo-2", url: null, caption: "Connections turning into collaborations.", createdAt: "2026-07-16T11:35:00.000Z", attendeeId: "preview-me", attendeeName: "Radha Sharma", attendeeBusinessName: "Sharma Trading Co.", likeCount: 11, commentCount: 0, likedByMe: false, comments: [] },
];

export default function FeedPage() {
  const [attendee, setAttendee] = useState<AttendeeMe | null>(null);
  const [photos, setPhotos] = useState<FeedPhotoData[]>([]);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const previewMode = process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("preview") === "1";
    if (previewMode) {
      setPreview(true); setAttendee(PREVIEW_ATTENDEE); setPhotos(PREVIEW_PHOTOS); return;
    }
    fetch("/api/attendees/me", { credentials: "include" }).then(async (response) => {
      if (!response.ok) throw new Error();
      setAttendee(await response.json() as AttendeeMe);
    }).catch(() => setError(true));
  }, []);

  return <AttendeePageShell><div className="attendee-page feed-page">
    {error && <div className="directory-state"><h1>Can’t open the photo feed</h1><p>Check your connection and try again.</p></div>}
    {!error && !attendee && <div className="directory-loading" role="status">Loading photo feed…</div>}
    {attendee && <FeedView attendee={attendee} photos={photos} setPhotos={setPhotos} demoMode={preview} />}
  </div></AttendeePageShell>;
}
