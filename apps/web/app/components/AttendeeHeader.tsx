"use client";

import Link from "next/link";
import { AttendeeMenu, type MenuAttendee } from "./AttendeeMenu";

// The one place that renders the attendee app's top header (hamburger, page
// title, RMB logo). Home used to keep its own copy of this markup separate
// from AttendeePageShell's — the two drifted out of sync more than once.
// Both now render through here instead.
export function AttendeeHeader({
  title,
  attendee,
  noDivider = false,
}: {
  title: string;
  attendee: MenuAttendee | null;
  noDivider?: boolean;
}) {
  return (
    <header className={`full-page-header attendee-app-header${noDivider ? " no-divider" : ""}`}>
      {attendee ? (
        <AttendeeMenu attendee={attendee} />
      ) : (
        <span className="app-header-spacer" aria-hidden="true" />
      )}
      <h1 className="app-header-title">{title}</h1>
      <Link href="/home" aria-label="Go to Home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/rmb-fellowship-logo.png"
          alt="Rotary Means Business Fellowship"
          className="app-topbar-brand"
          width={50}
          height={50}
        />
      </Link>
    </header>
  );
}
