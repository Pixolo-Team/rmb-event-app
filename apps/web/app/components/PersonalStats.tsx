"use client";

import { useEffect, useState } from "react";
import { PersonalStats as Stats, refreshPersonalStats, statsCache } from "../lib/statsCache";

function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

// F11.1 — the attendee's own stats, surfaced on the Settings/Profile screen.
// Cache-first and offline-tolerant: renders from localStorage instantly, refreshes
// from the network when reachable, and keeps the time-at-event timer ticking either way.
export function PersonalStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const cached = statsCache.get();
    if (cached) setStats(cached);
    const unsubscribe = statsCache.subscribe((nextStats) => {
      if (nextStats) setStats(nextStats);
    });
    refreshPersonalStats()
      .catch(() => {
        /* offline / unreachable — keep the cached value */
      });
    return () => {
      unsubscribe();
    };
  }, []);

  // Minute granularity is enough for a "time at event" readout.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!stats) return null;

  const totalRanked = Math.max(stats.totalRanked, stats.rank ?? 0);
  const rankValue = formatRank(stats.rank);
  const rankSub = stats.rank && totalRanked > 0 ? `of ${totalRanked}` : undefined;

  const checkedIn = stats.checkedInAt !== null;
  const timeAtEvent = checkedIn
    ? formatDuration(
        Math.min(now, stats.eventEndAt ? new Date(stats.eventEndAt).getTime() : now) -
          new Date(stats.checkedInAt as string).getTime(),
      )
    : null;

  return (
    <section className="profile-section stats-section" aria-label="Your stats">
      <h2>Your stats</h2>
      <div className="stats-grid">
        <StatTile value={stats.peopleMet} label="People met" />
        <StatTile value={rankValue} sub={rankSub} label="Rank" />
        <StatTile value={stats.bookmarks} label="Bookmarks" />
        <StatTile value={stats.photos} label="Photos posted" />
      </div>
    </section>
  );
}

function formatRank(rank: number | null) {
  return rank ? `#${rank}` : "N/A";
}

function StatTile({
  value,
  label,
  sub,
  wide,
}: {
  value: React.ReactNode;
  label: string;
  sub?: string;
  wide?: boolean;
}) {
  return (
    <div className={`stat-tile${wide ? " stat-tile-wide" : ""}`}>
      <strong>{value}</strong>
      <span>{label}{sub && <em> {sub}</em>}</span>
    </div>
  );
}
