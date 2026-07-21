export type MatchSuggestion = { id: string; name: string; businessName: string | null; businessCategory: string | null; city: string | null; chapterName: string | null; tableNumber: string | null; photoUrl: string | null; checkedIn: boolean; phone: string; linkedInUrl: string | null; websiteUrl?: string | null; bookmarked: boolean; met: boolean; score: number; reasons: string[]; headline: string; chapterRelation: "same" | "cross" | "none"; computedAt: string };
export type MatchesResponse = { profileComplete: boolean; totalAttendees: number; computedAt: string | null; matches: MatchSuggestion[] };
const KEY = "evento:matches:v1";
export const matchesCache = {
  get(): MatchesResponse | null { try { const value = localStorage.getItem(KEY); return value ? JSON.parse(value) as MatchesResponse : null; } catch { return null; } },
  set(value: MatchesResponse) { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* best-effort offline cache */ } },
};
