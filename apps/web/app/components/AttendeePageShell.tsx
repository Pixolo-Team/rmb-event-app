"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AttendeeMenu, type MenuAttendee } from "./AttendeeMenu";

export function AttendeePageShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [attendee, setAttendee] = useState<MenuAttendee | null>(null);

  useEffect(() => {
    fetch("/api/attendees/me", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          router.replace("/login");
          return;
        }
        const me = await response.json();
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
      .catch(() => router.replace("/login"));
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
