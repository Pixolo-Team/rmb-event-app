"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AttendeeMenu, type MenuAttendee } from "./AttendeeMenu";
import { profileCache } from "../lib/profileCache";

export function AttendeePageShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [attendee, setAttendee] = useState<MenuAttendee | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("preview") === "1") {
      setAttendee({ name: "Radha Sharma", businessName: "Radha Textiles", chapterName: "RMB Mumbai", photoUrl: null });
      return;
    }
    // Fall back to the cached profile so the app (and the offline QR on the
    // profile screen) still render when the API is unreachable. Only redirect to
    // login on an actual auth failure (401/403) — never on a network error or a
    // 5xx from an unreachable API proxy, which are not sign-outs.
    function useCacheOrLogin() {
      const cached = profileCache.get();
      if (cached?.profileCompletedAt) {
        setAttendee({
          name: cached.name,
          businessName: cached.businessName,
          chapterName: cached.chapterName,
          photoUrl: cached.photoUrl,
        });
      } else {
        router.replace("/login");
      }
    }

    fetch("/api/attendees/me", { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          useCacheOrLogin();
          return;
        }
        const me = await response.json();
        profileCache.set(me);
        if (!me.profileCompletedAt) {
          router.replace("/onboarding");
          return;
        }
        setAttendee({
          name: me.name,
          businessName: me.businessName,
          chapterName: me.chapterName,
          photoUrl: me.photoUrl,
        });
      })
      .catch(useCacheOrLogin);
  }, [router]);

  if (!attendee) {
    return (
      <main className="attendee-page">
        <div className="directory-loading" role="status">Loading…</div>
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
