export type LeaderboardEntry = { id: string; rank: number | null; name: string; businessName: string | null; photoUrl: string | null; metCount: number };
export type LeaderboardResponse = { top: LeaderboardEntry[]; me: LeaderboardEntry | null; totalAttendees: number; updatedAt: string };

const KEY = "evento:leaderboard:v1";
export const leaderboardCache = {
  get(): LeaderboardResponse | null { try { const value = localStorage.getItem(KEY); return value ? JSON.parse(value) as LeaderboardResponse : null; } catch { return null; } },
  set(value: LeaderboardResponse) { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* live data remains usable */ } },
};
