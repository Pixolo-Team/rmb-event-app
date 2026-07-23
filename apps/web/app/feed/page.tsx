"use client";

import { useEffect, useState } from "react";
import { FeedSkeleton, FeedView } from "../(app)/tutorial/FeedView";
import type { AttendeeMe } from "../(app)/tutorial/TutorialPage";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { trackEvent } from "../lib/gtag";
import { loadMyProfile, profileCache } from "../lib/profileCache";
import type { FeedPhotoData } from "../lib/feedTypes";

const PREVIEW_ATTENDEE: AttendeeMe = {
  id: "preview-me",
  name: "Radha Sharma",
  email: "radha@example.com",
  phone: "+919810012345",
  businessName: "Radha Textiles",
  chapterName: "RMB Mumbai",
  city: "Mumbai, Maharashtra",
  businessCategory: "Textiles",
  photoUrl: null,
  profileCompletedAt: new Date().toISOString(),
};

const PREVIEW_PHOTOS: FeedPhotoData[] = [
  { id: "preview-photo-own", url: "/images/preview/business-card-exchange.jpg", urls: ["/images/preview/business-card-exchange.jpg"], caption: "Sharing details with new connections.", createdAt: new Date().toISOString(), attendeeId: "preview-me", attendeeName: "Radha Sharma", attendeeBusinessName: "Radha Textiles", attendeePhotoUrl: null, likeCount: 5, commentCount: 0, likedByMe: false, comments: [] },
  { id: "preview-photo-1", url: "/images/preview/networking-conversation.jpg", urls: ["/images/preview/networking-conversation.jpg"], caption: "Great conversations tonight!", createdAt: new Date().toISOString(), attendeeId: "preview-1", attendeeName: "Aarav Mehta", attendeeBusinessName: "Mehta Packaging Solutions", attendeePhotoUrl: null, likeCount: 18, commentCount: 2, likedByMe: true, comments: [] },
];

export default function FeedPage() {
  const [attendee, setAttendee] = useState<AttendeeMe | null>(null);
  const [photos, setPhotos] = useState<FeedPhotoData[]>([]);
  const [error, setError] = useState(false);
  const [feedLoaded, setFeedLoaded] = useState(false);

  useEffect(() => {
    trackEvent("feed_opened", {
      feature: "feed",
      success: true,
    });

    const previewMode =
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).get("preview") === "1";

    if (previewMode) {
      setAttendee(PREVIEW_ATTENDEE);
      setPhotos(PREVIEW_PHOTOS);
      setFeedLoaded(true);
      return;
    }

    const cachedProfile = profileCache.get();
    if (cachedProfile?.profileCompletedAt) {
      setAttendee(cachedProfile);
    }

    // loadMyProfile is shared with AttendeePageShell's own header fetch — this
    // used to be an independent fetch("/api/attendees/me") duplicating the
    // shell's request on every Feed load; now it dedupes/throttles onto the
    // same in-flight or recently-cached result instead of a second DB round trip.
    Promise.allSettled([loadMyProfile(), fetch("/api/photos", { credentials: "include" })])
      .then(async ([attendeeResult, feedResult]) => {
        let resolvedAttendee: AttendeeMe | null = cachedProfile?.profileCompletedAt ? cachedProfile : null;

        if (attendeeResult.status === "fulfilled" && attendeeResult.value.profile) {
          resolvedAttendee = attendeeResult.value.profile;
          setAttendee(attendeeResult.value.profile);
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
            demoMode={false}
            initialDataLoaded={feedLoaded}
            externalDataLoad
          />
        ) : null}
      </div>
    </AttendeePageShell>
  );
}
