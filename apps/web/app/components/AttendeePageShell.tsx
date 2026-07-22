"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { AttendeeBottomTabs, AttendeeMenu, type MenuAttendee } from "./AttendeeMenu";
import { InstallBanner } from "./InstallBanner";
import { PoweredByFooter } from "./PoweredByFooter";
import { RotaryLoader } from "./RotaryLoader";
import { loadMyProfile, profileCache, type MyProfile } from "../lib/profileCache";

const PAGE_TITLES: Record<string, string> = {
  "/home": "Home",
  "/directory": "People",
  "/matches": "Want to Meet",
  "/profile": "Profile",
  "/scan": "Scan",
  "/connections": "My Connections",
  "/feed": "Feed",
  "/gallery": "Gallery",
  "/leaderboard": "Leaderboard",
  "/summary": "Event Summary",
  "/feedback": "Feedback",
  "/event": "Event Details",
};

function pageTitle(pathname: string) {
  if (pathname.startsWith("/attendees/")) return "Attendee Profile";
  return PAGE_TITLES[pathname] ?? "Evento";
}

let cachedMenuAttendee: MenuAttendee | null = null;

function toMenuAttendee(profile: MyProfile): MenuAttendee {
  return {
    name: profile.name,
    businessName: profile.businessName,
    chapterName: profile.chapterName,
    photoUrl: profile.photoUrl,
  };
}

export function AttendeePageShell({
  children,
  showFooter = true,
  showTabs = true,
}: {
  children: ReactNode;
  showFooter?: boolean;
  showTabs?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Seed from the module-level cache so tab-to-tab navigation renders the shell
  // (and the page's own skeleton) immediately instead of flashing the full-page
  // loader. Safe against hydration mismatch: this cache is null on the server and
  // on first hydration, and is only populated after a prior client-side mount.
  const [attendee, setAttendee] = useState<MenuAttendee | null>(() => cachedMenuAttendee);

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

    // Cache-first keeps tab navigation instant, while the background check still
    // catches real sign-outs or onboarding redirects. loadMyProfile is shared
    // with pages that need the full profile (Profile, Feed) — its own
    // dedup/throttle means this resolves with zero network calls when another
    // consumer already fetched within the last minute, instead of every
    // consumer firing its own request.
    loadMyProfile().then(({ status, profile }) => {
      if (cancelled) return;

      if (status === 401 || status === 403) {
        profileCache.clear();
        cachedMenuAttendee = null;
        router.replace("/login");
        return;
      }

      if (profile) {
        if (!profile.profileCompletedAt) {
          router.replace("/onboarding");
          return;
        }
        const nextAttendee = toMenuAttendee(profile);
        cachedMenuAttendee = nextAttendee;
        setAttendee(nextAttendee);
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
        <div className="directory-loading" role="status">
          <RotaryLoader />
          Loading...
        </div>
      </main>
    );
  }

  return (
    <div className="attendee-shell">
      <header className={`full-page-header attendee-app-header${pathname === "/matches" ? " no-divider" : ""}`}>
        <AttendeeMenu attendee={attendee} />
        <h1 className="app-header-title">{pageTitle(pathname)}</h1>
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
      <InstallBanner />
      <div className="attendee-shell-content">
        {children}
        {showFooter ? <PoweredByFooter /> : null}
      </div>
      {showTabs ? <AttendeeBottomTabs /> : null}
    </div>
  );
}
