"use client";

import { useEffect, useState } from "react";
import { LeaderboardRows } from "../../components/LeaderboardRows";
import type { LeaderboardEntry } from "../../lib/leaderboardCache";

type VenueResponse = { top: LeaderboardEntry[]; totalAttendees: number; updatedAt: string };

export default function VenueLeaderboardPage() {
  const [data, setData] = useState<VenueResponse | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() { try { const response = await fetch("/api/leaderboard/venue", { cache: "no-store" }); if (!response.ok) throw new Error(); const result = await response.json() as VenueResponse; if (active) { setData(result); setError(false); } } catch { if (active) setError(true); } }
    load(); const timer = window.setInterval(load, 10000); return () => { active = false; window.clearInterval(timer); };
  }, []);
  return <main className="venue-leaderboard"><header><div className="wordmark"><span className="dot" />Evento</div><div><p>Live networking challenge</p><h1>Who’s making connections?</h1></div><span>{data?.totalAttendees ?? 0} checked in</span></header>
    {!data && !error && <div className="venue-loading">Loading live rankings…</div>}
    {error && !data && <div className="venue-loading">Leaderboard will return shortly.</div>}
    {data && data.top.length === 0 && <div className="venue-loading">The leaderboard starts with the first connection.</div>}
    {data && data.top.length > 0 && <LeaderboardRows entries={data.top} publicDisplay />}
    <footer>Scan a QR code to connect • Updates every 10 seconds</footer>
  </main>;
}
