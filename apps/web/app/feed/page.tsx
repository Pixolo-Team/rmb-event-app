"use client";

import { useEffect, useState } from "react";
import { FeedSkeleton, FeedView } from "../(app)/tutorial/FeedView";
import type { AttendeeMe } from "../(app)/tutorial/TutorialPage";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { profileCache } from "../lib/profileCache";
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
  {
    id: "preview-photo-1",
    url: "/images/preview/networking-conversation.jpg",
    urls: [
      "/images/preview/networking-conversation.jpg",
      "/images/preview/business-card-exchange.jpg",
      "/images/preview/conference-applause.jpg",
    ],
    caption: "A great start to the evening - so many useful conversations already! New introductions, shared ideas, and promising collaborations.",
    createdAt: "2026-07-16T12:10:00.000Z",
    attendeeId: "preview-1",
    attendeeName: "Aarav Mehta",
    attendeeBusinessName: "Mehta Packaging Solutions",
    likeCount: 18,
    commentCount: 2,
    likedByMe: true,
    comments: [
      {
        id: "c1",
        name: "Neha Kapoor",
        message: "Wonderful meeting everyone!",
        createdAt: "2026-07-16T12:15:00.000Z",
      },
      {
        id: "c2",
        name: "Radha Sharma",
        message: "Great energy tonight.",
        createdAt: "2026-07-16T12:18:00.000Z",
      },
    ],
  },
];

export default function FeedPage() {
  const [attendee, setAttendee] = useState<AttendeeMe | null>(null);
  const [photos, setPhotos] = useState<FeedPhotoData[]>([]);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState(false);
  const [feedLoaded, setFeedLoaded] = useState(false);

  useEffect(() => {
    const previewMode =
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).get("preview") === "1";

    if (previewMode) {
      setPreview(true);
      setAttendee(PREVIEW_ATTENDEE);
      setPhotos(PREVIEW_PHOTOS);
      setFeedLoaded(true);
      return;
    }

    const cachedProfile = profileCache.get();
    if (cachedProfile?.profileCompletedAt) {
      setAttendee(cachedProfile);
    }

    Promise.allSettled([
      fetch("/api/attendees/me", { credentials: "include" }),
      fetch("/api/photos", { credentials: "include" }),
    ])
      .then(async ([attendeeResult, feedResult]) => {
        let resolvedAttendee = cachedProfile?.profileCompletedAt ? cachedProfile : null;

        if (attendeeResult.status === "fulfilled" && attendeeResult.value.ok) {
          const attendeeData = (await attendeeResult.value.json()) as AttendeeMe;
          resolvedAttendee = attendeeData;
          setAttendee(attendeeData);
        }

        if (feedResult.status === "fulfilled" && feedResult.value.ok) {
          const feedData = (await feedResult.value.json()) as { photos: FeedPhotoData[] };
          setPhotos(feedData.photos);
        }

        setFeedLoaded(true);

        if (!resolvedAttendee) {
          setError(true);
        }
      })
      .catch(() => {
        if (!cachedProfile?.profileCompletedAt) {
          setError(true);
        }
        setFeedLoaded(true);
      });
  }, []);

  return (
    <AttendeePageShell>
      <div className="attendee-page feed-page">
        {error && !attendee ? (
          <div className="directory-state">
            <h1>Can&apos;t open the photo feed</h1>
            <p>Check your connection and try again.</p>
          </div>
        ) : null}

        {!error && !attendee ? <FeedSkeleton /> : null}

        {attendee ? (
          <FeedView
            attendee={attendee}
            photos={photos}
            setPhotos={setPhotos}
            demoMode={preview}
            initialDataLoaded={feedLoaded}
            externalDataLoad
          />
        ) : null}
      </div>
    </AttendeePageShell>
  );
}
