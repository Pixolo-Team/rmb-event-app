"use client";

import { useCallback, useEffect, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { LeaderboardRows } from "../components/LeaderboardRows";
import { PageIntro } from "../components/PageIntro";
import { PoweredByFooter } from "../components/PoweredByFooter";
import { leaderboardCache, type LeaderboardResponse } from "../lib/leaderboardCache";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton";

const REFRESH_MS = 30_000;

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/leaderboard", { credentials: "include" });
      if (!response.ok) throw new Error();
      const result = await response.json() as LeaderboardResponse;
      leaderboardCache.set(result);
      setData(result);
      setOffline(false);
      setError(false);
    } catch {
      const cached = leaderboardCache.get();
      if (cached) {
        setData(cached);
        setOffline(true);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const visibleTop = data?.top.filter((entry) => entry.metCount > 0) ?? [];

  return (
    <AttendeePageShell showFooter={false}>
      <main className="attendee-page leaderboard-page">
        <div className="page-context-row">
          <PageIntro>Every confirmed connection earns one point.</PageIntro>
          <button className="leaderboard-refresh" type="button" onClick={() => load()} disabled={loading}>
            Refresh
          </button>
        </div>
        {offline && data && <div className="banner info"><div><b>Showing saved leaderboard</b>Last updated {formatTime(data.updatedAt)}.</div></div>}
        {data?.me && <section className="leaderboard-my-stat"><div><span>Your rank</span><strong>{formatRank(data.me.rank)}</strong></div><div><span>People met</span><strong>{data.me.metCount}</strong></div><div><span>Present</span><strong>{data.totalAttendees}</strong></div></section>}
        {loading && !data && <LeaderboardSkeleton />}
        {error && !data && <div className="directory-state"><h2>Can&apos;t load leaderboard</h2><p>Check your connection and try refreshing.</p></div>}
        {data && visibleTop.length === 0 && <div className="directory-state"><h2>No rankings yet</h2><p>No one has made a confirmed connection yet.</p></div>}
        {data && visibleTop.length > 0 && <><div className="leaderboard-label-row"><span>Top attendees</span><span>Updated {formatTime(data.updatedAt)}</span></div><LeaderboardRows entries={visibleTop} currentId={data.me?.id} /></>}
        <PoweredByFooter />
      </main>
    </AttendeePageShell>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatRank(rank: number | null) {
  return rank ? `#${rank}` : "N/A";
}
