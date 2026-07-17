"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AttendeeMenu, type MenuAttendee } from "./AttendeeMenu";
import { profileCache, type MyProfile } from "../lib/profileCache";

const PROFILE_REVALIDATE_MS = 60_000;

let cachedMenuAttendee: MenuAttendee | null = null;
let lastProfileRevalidatedAt = 0;
let profileRequest: Promise<MyProfile | "login" | "onboarding" | null> | null = null;

function toMenuAttendee(profile: MyProfile): MenuAttendee {
  return {
    name: profile.name,
    businessName: profile.businessName,
    chapterName: profile.chapterName,
    photoUrl: profile.photoUrl,
  };
}

function loadProfile() {
  if (!profileRequest) {
    lastProfileRevalidatedAt = Date.now();
    profileRequest = fetch("/api/attendees/me", { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) return "login" as const;
        if (!response.ok) return null;

        const me = (await response.json()) as MyProfile;
        profileCache.set(me);
        cachedMenuAttendee = me.profileCompletedAt ? toMenuAttendee(me) : null;
        return me.profileCompletedAt ? me : "onboarding";
      })
      .catch(() => null)
      .finally(() => {
        profileRequest = null;
      });
  }

  return profileRequest;
}

export function AttendeePageShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [attendee, setAttendee] = useState<MenuAttendee | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("preview") === "1") {
      setAttendee({ name: "Radha Sharma", businessName: "Radha Textiles", chapterName: "RMB Mumbai", photoUrl: null });
      return;
    }

    let cancelled = false;
    const cachedProfile = profileCache.get();
    const cachedAttendee = cachedMenuAttendee ?? (cachedProfile?.profileCompletedAt ? toMenuAttendee(cachedProfile) : null);

    if (cachedAttendee) {
      cachedMenuAttendee = cachedAttendee;
      setAttendee(cachedAttendee);
    }

    const recentlyChecked = cachedAttendee && Date.now() - lastProfileRevalidatedAt < PROFILE_REVALIDATE_MS;
    if (recentlyChecked) return;

    // Cache-first keeps tab navigation instant, while the background check still
    // catches real sign-outs or onboarding redirects.
    loadProfile().then((result) => {
      if (cancelled) return;

      if (result === "login") {
        router.replace("/login");
        return;
      }

      if (result === "onboarding") {
        router.replace("/onboarding");
        return;
      }

      if (result) {
        setAttendee(toMenuAttendee(result));
        return;
      }

      if (!cachedAttendee) {
        const fallback = profileCache.get();
        if (fallback?.profileCompletedAt) {
          const nextAttendee = toMenuAttendee(fallback);
          cachedMenuAttendee = nextAttendee;
          setAttendee(nextAttendee);
        } else {
          router.replace("/login");
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!attendee) {
    return (
      <main className="attendee-page">
        <div className="directory-loading" role="status">Loading...</div>
      </main>
    );
  }

  return (
    <div className="attendee-shell">
      <header className="full-page-header">
        <div className="wordmark"><span className="dot" />Evento</div>
        <AttendeeMenu attendee={attendee} />
      </header>
      {children}
    </div>
  );
}
