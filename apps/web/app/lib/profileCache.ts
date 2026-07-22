// F4.1 — caches the attendee's own profile (including their signed qrToken) so
// the Settings/Profile screen and its QR code render offline with no network
// call (PRD US4.1A: "generated/cached locally — no network call to display it").
// The QR image itself is generated client-side from the token via the `qrcode`
// library, so a cached token is all that's needed to render offline.

export interface MyProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string | null;
  chapterName: string | null;
  photoUrl: string | null;
  city: string | null;
  businessCategory: string | null;
  websiteUrl?: string | null;
  linkedInUrl?: string | null;
  tableNumber: string | null;
  lookingFor: string[];
  offering: string[];
  goals: string[];
  bio: string | null;
  qrToken: string;
  profileCompletedAt: string | null;
}

const KEY = "evento-my-profile-v1";

export const profileCache = {
  get(): MyProfile | null {
    try {
      const value = localStorage.getItem(KEY);
      return value ? (JSON.parse(value) as MyProfile) : null;
    } catch {
      return null;
    }
  },
  set(value: MyProfile) {
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      // Storage full/unavailable — the live response stays usable this session.
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem("evento-home-v1");
    } catch {
      // Storage unavailable — there is nothing else to clear client-side.
    }
  },
};

const PROFILE_REVALIDATE_MS = 60_000;
let lastFetchedAt = 0;
let inFlight: Promise<{ status: number; profile: MyProfile | null }> | null = null;

// Single shared, deduplicated fetch of /attendees/me. AttendeePageShell's
// header and whichever page also needs the full profile (Profile, Feed) used
// to each fire their own independent request on the same page load — this
// collapses concurrent callers onto one in-flight network call, and throttles
// repeat calls within PROFILE_REVALIDATE_MS to zero network calls, cutting a
// real DB round trip off of every page that previously duplicated the shell's
// own fetch.
export function loadMyProfile(options?: { force?: boolean }): Promise<{ status: number; profile: MyProfile | null }> {
  const cached = profileCache.get();
  const recentlyFetched = Date.now() - lastFetchedAt < PROFILE_REVALIDATE_MS;
  if (!options?.force && cached && recentlyFetched) {
    return Promise.resolve({ status: 200, profile: cached });
  }

  if (!inFlight) {
    lastFetchedAt = Date.now();
    inFlight = fetch("/api/attendees/me", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return { status: response.status, profile: null };
        const profile = (await response.json()) as MyProfile;
        profileCache.set(profile);
        return { status: response.status, profile };
      })
      .catch(() => ({ status: 0, profile: null }))
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
