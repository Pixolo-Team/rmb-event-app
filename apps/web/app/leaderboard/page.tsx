"use client";

import { useCallback, useEffect, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { LeaderboardRows } from "../components/LeaderboardRows";
import { PageIntro } from "../components/PageIntro";
import { PoweredByFooter } from "../components/PoweredByFooter";
import { leaderboardCache, type LeaderboardResponse } from "../lib/leaderboardCache";

const PREVIEW: LeaderboardResponse = {
  top: [
    { id: "1", rank: 1, name: "Aarav Mehta", businessName: "Mehta Packaging", photoUrl: null, metCount: 18 },
    { id: "2", rank: 2, name: "Neha Kapoor", businessName: "Kapoor Digital", photoUrl: null, metCount: 14 },
    { id: "3", rank: 3, name: "Vikram Shah", businessName: "Shah Industrial Systems", photoUrl: null, metCount: 11 },
    { id: "me", rank: 4, name: "Radha Sharma", businessName: "Radha Textiles", photoUrl: null, metCount: 8 },
    { id: "5", rank: 5, name: "Kabir Malhotra", businessName: "Malhotra Foods", photoUrl: null, metCount: 6 },
  ],
  me: { id: "me", rank: 4, name: "Radha Sharma", businessName: "Radha Textiles", photoUrl: null, metCount: 8 },
  totalAttendees: 42,
  updatedAt: new Date().toISOString(),
};

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (quiet = false) => {
    const preview = process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("preview") === "1";
    if (preview) {
      setData(PREVIEW);
      setLoading(false);
      return;
    }
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
    const timer = window.setInterval(() => load(true), 10000);
    return () => window.clearInterval(timer);
  }, [load]);

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
        {data?.me && <section className="leaderboard-my-stat"><div><span>Your rank</span><strong>#{data.me.rank}</strong></div><div><span>People met</span><strong>{data.me.metCount}</strong></div><div><span>Attendees</span><strong>{data.totalAttendees}</strong></div></section>}
        {loading && !data && <div className="leaderboard-skeleton" role="status">Loading live rankings...</div>}
        {error && !data && <div className="directory-state"><h2>Can&apos;t load leaderboard</h2><p>Check your connection and try refreshing.</p></div>}
        {data && data.top.length === 0 && <div className="directory-state"><h2>No rankings yet</h2><p>No one has checked in yet.</p></div>}
        {data && data.top.length > 0 && <><div className="leaderboard-label-row"><span>Top attendees</span><span>Updated {formatTime(data.updatedAt)}</span></div><LeaderboardRows entries={data.top} currentId={data.me?.id} /></>}
        <PoweredByFooter />
      </main>
    </AttendeePageShell>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
