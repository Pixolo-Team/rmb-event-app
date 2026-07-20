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
