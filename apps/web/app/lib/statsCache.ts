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

const listeners = new Set<(value: PersonalStats | null) => void>();

// A tiny in-memory store keeps already-mounted widgets in sync. It deliberately
// does not persist stats: ranks, bookmarks, and check-in counts are live data.
export const statsCache = {
  get(): PersonalStats | null { return null; },
  set(value: PersonalStats) {
    listeners.forEach((listener) => listener(value));
  },
  subscribe(listener: (value: PersonalStats | null) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export async function refreshPersonalStats() {
  const res = await fetch("/api/attendees/me/stats", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("stats unavailable");
  const data = (await res.json()) as PersonalStats;
  statsCache.set(data);
  return data;
}
