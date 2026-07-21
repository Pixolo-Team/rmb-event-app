"use client";

export const GA_MEASUREMENT_ID = "G-8QXSQ79Y9E";

export type GtagEventName =
  | "profile_viewed"
  | "match_opened"
  | "bookmark_added"
  | "bookmark_removed"
  | "qr_scan_started"
  | "qr_scan_success"
  | "meeting_created"
  | "feed_opened"
  | "photo_uploaded"
  | "feedback_started"
  | "feedback_submitted";

type GtagParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function pageview(path: string, title: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: title,
  });
}

export function trackEvent(eventName: GtagEventName, params: GtagParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, {
    page_path: window.location.pathname,
    ...params,
  });
}
