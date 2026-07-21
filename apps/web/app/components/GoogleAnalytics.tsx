"use client";

import Script from "next/script";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_MEASUREMENT_ID, pageview } from "../lib/gtag";

const PAGE_TITLES: Record<string, string> = {
  "/": "Evento",
  "/home": "Home",
  "/directory": "People Directory",
  "/matches": "Match Suggestions",
  "/connections": "Connections",
  "/scan": "QR Scanner",
  "/feed": "Feed",
  "/gallery": "Gallery",
  "/leaderboard": "Leaderboard",
  "/leaderboard/venue": "Venue Leaderboard",
  "/profile": "My Profile",
  "/summary": "Event Summary",
  "/feedback": "Feedback",
  "/checkin": "Check-In",
  "/tutorial": "Tutorial",
};

export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
    </>
  );
}

function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || pathname === "/admin" || pathname.startsWith("/admin/")) return;
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    pageview(normalizePath(path), titleForPath(pathname));
  }, [pathname, searchParams]);

  return null;
}

function normalizePath(path: string) {
  return path.replace(/^\/attendees\/[^/?#]+/, "/attendees/:id");
}

function titleForPath(pathname: string) {
  if (pathname.startsWith("/attendees/")) return "Attendee Profile";
  return PAGE_TITLES[pathname] ?? "Evento";
}
