export type PersonalStats = {
  peopleMet: number;
  rank: number | null;
  totalRanked: number;
  bookmarks: number;
  photos: number;
  checkedInAt: string | null;
  checkInMethod: string | null;
  eventEndAt: string | null;
  generatedAt: string;
};

const KEY = "evento:stats:v1";
const listeners = new Set<(value: PersonalStats | null) => void>();

// Cache-first so the "Your stats" section renders instantly and survives offline,
// matching profileCache/summaryCache. The live time-at-event timer keeps ticking
// from the cached checkedInAt even without a network refresh.
export const statsCache = {
  get(): PersonalStats | null {
    try {
      const value = localStorage.getItem(KEY);
      return value ? (JSON.parse(value) as PersonalStats) : null;
    } catch {
      return null;
    }
  },
  set(value: PersonalStats) {
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      /* best effort */
    }
    listeners.forEach((listener) => listener(value));
  },
  subscribe(listener: (value: PersonalStats | null) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export async function refreshPersonalStats() {
  const res = await fetch("/api/attendees/me/stats", { credentials: "include" });
  if (!res.ok) throw new Error("stats unavailable");
  const data = (await res.json()) as PersonalStats;
  statsCache.set(data);
  return data;
}
