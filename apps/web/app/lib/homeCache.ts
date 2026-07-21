export interface HomeCacheAttendee {
  name: string;
  businessName: string | null;
  chapterName: string | null;
  photoUrl: string | null;
  tableNumber: string | null;
}

export interface HomeCacheCheckin {
  checkedIn: boolean;
  checkedInAt: string | null;
  method: "GEOLOCATION" | "MANUAL" | "STAFF_QR" | "VENUE_QR" | null;
}

export interface HomeCacheEvent {
  name?: string | null;
  venueLat: number | null;
  venueLng: number | null;
  venueAddress?: string | null;
  checkinRadiusM: number;
  startAt?: string | null;
  endAt?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
}

export interface HomeSnapshot {
  attendee: HomeCacheAttendee;
  checkin: HomeCacheCheckin;
  event: HomeCacheEvent | null;
  cachedAt: number;
}

const KEY = "evento-home-v1";

export const homeCache = {
  get(): HomeSnapshot | null {
    try {
      const value = localStorage.getItem(KEY);
      return value ? (JSON.parse(value) as HomeSnapshot) : null;
    } catch {
      return null;
    }
  },
  set(value: Omit<HomeSnapshot, "cachedAt">) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...value, cachedAt: Date.now() }));
    } catch {
      // The live Home response remains usable when storage is unavailable.
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Storage unavailable.
    }
  },
};
