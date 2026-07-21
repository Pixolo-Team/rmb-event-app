"use client";

import { useEffect, useState } from "react";
import { FeedSkeleton, FeedView } from "../(app)/tutorial/FeedView";
import type { AttendeeMe } from "../(app)/tutorial/TutorialPage";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { profileCache } from "../lib/profileCache";
import type { FeedPhotoData } from "../lib/feedTypes";

export default function FeedPage() {
  const [attendee, setAttendee] = useState<AttendeeMe | null>(null);
  const [photos, setPhotos] = useState<FeedPhotoData[]>([]);
  const [error, setError] = useState(false);
  const [feedLoaded, setFeedLoaded] = useState(false);

  useEffect(() => {
    const cachedProfile = profileCache.get();
    if (cachedProfile?.profileCompletedAt) {
      setAttendee(cachedProfile);
    }

    Promise.allSettled([
      fetch("/api/attendees/me", { credentials: "include" }),
      fetch("/api/photos", { credentials: "include" }),
    ])
      .then(async ([attendeeResult, feedResult]) => {
        let resolvedAttendee: AttendeeMe | null = cachedProfile?.profileCompletedAt ? cachedProfile : null;

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
            demoMode={false}
            initialDataLoaded={feedLoaded}
            externalDataLoad
          />
        ) : null}
      </div>
    </AttendeePageShell>
  );
}
