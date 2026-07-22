import type { ReactNode } from "react";
import { AttendeeBottomTabs } from "./AttendeeMenu";

// Static chrome for route-level loading boundaries (loading.tsx). Mirrors the
// authenticated shell — header (logo + title) and persistent bottom tabs — but
// with no auth gate or data fetching, so Next can paint it the instant a tab is
// tapped. The real page's shell takes over once its segment resolves, keeping
// the chrome visually in place across the transition.
export function AttendeeShellSkeleton({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="attendee-shell">
      <header className="full-page-header attendee-app-header">
        <button className="menu-trigger" type="button" aria-label="Open menu" aria-hidden="true" tabIndex={-1}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <h1 className="app-header-title">{title}</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/rmb-fellowship-logo.png"
          alt="Rotary Means Business Fellowship"
          className="app-topbar-brand"
          width={50}
          height={50}
        />
      </header>
      <div className="attendee-shell-content">{children}</div>
      <AttendeeBottomTabs />
    </div>
  );
}
