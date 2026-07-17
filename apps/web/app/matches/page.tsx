"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { BookmarkButton } from "../components/BookmarkButton";
import { DirectoryAvatar } from "../components/DirectoryAvatar";
import { matchesCache, type MatchesResponse, type MatchSuggestion } from "../lib/matchesCache";

const PREVIEW: MatchesResponse = { profileComplete: true, totalAttendees: 148, computedAt: new Date().toISOString(), matches: [
  { id: "match-1", name: "Ananya Desai", businessName: "Desai Retail Network", businessCategory: "Retail", city: "Mumbai, Maharashtra", chapterName: "RMB Mumbai", tableNumber: "8", photoUrl: null, checkedIn: true, phone: "+919810012345", linkedInUrl: "https://www.linkedin.com/in/ananya-desai", bookmarked: false, met: true, score: 7, reasons: ["They offer Retail Distribution, which you're looking for", "You're both in the RMB Mumbai chapter"], headline: "They offer Retail Distribution, which you're looking for", chapterRelation: "same", computedAt: new Date().toISOString() },
  { id: "match-2", name: "Rohan Iyer", businessName: "Iyer Logistics", businessCategory: "Logistics", city: "Pune, Maharashtra", chapterName: "RMB Pune", tableNumber: "15", photoUrl: null, checkedIn: false, phone: "+919820067890", linkedInUrl: null, bookmarked: true, met: false, score: 5, reasons: ["You offer Textiles, which they're looking for", "They're in the RMB Pune chapter"], headline: "You offer Textiles, which they're looking for", chapterRelation: "cross", computedAt: new Date().toISOString() },
] };

export default function MatchesPage() {
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    try {
      const response = await fetch(`/api/matches${refresh ? "?refresh=1" : ""}`, { credentials: "include" });
      if (!response.ok) throw new Error();
      const result = await response.json() as MatchesResponse;
      matchesCache.set(result);
      setData(result);
      setOffline(false);
      setError(false);
    } catch {
      if (!data && !matchesCache.get()) setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const preview = process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("preview") === "1";
    if (preview) {
      setData(PREVIEW);
      setLoading(false);
      return;
    }
    const cached = matchesCache.get();
    if (cached) {
      setData(cached);
      setOffline(!navigator.onLine);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateBookmark(id: string, bookmarked: boolean) {
    if (!data) return;
    const next = { ...data, matches: data.matches.map((item) => item.id === id ? { ...item, bookmarked } : item) };
    setData(next);
    matchesCache.set(next);
  }

  return (
    <AttendeePageShell>
      <main className="attendee-page matches-page">
        <div className="page-heading-row"><div><p className="eyebrow">Smart matching</p><h1>People to Meet</h1><p>Recommendations based on what you need and what others offer.</p></div></div>
        <div className="matches-top-actions" aria-label="Recommendation actions"><Link className="matches-browse-top" href="/directory"><DirectoryListIcon /><span>Browse directory</span></Link><button className={`matches-refresh${refreshing ? " is-refreshing" : ""}`} type="button" disabled={refreshing} onClick={() => load(true)} aria-label={refreshing ? "Refreshing recommendations" : "Refresh recommendations"}><RefreshIcon /><span>{refreshing ? "Refreshing..." : "Refresh"}</span></button></div>
        {offline && <div className="banner info"><div><b>Showing saved recommendations</b>You are offline. These matches will refresh when you reconnect.</div></div>}
        {loading && <MatchesSkeleton />}
        {!loading && error && !data && <MatchState title="Can't load recommendations" body="Check your connection and try again." />}
        {data && !data.profileComplete && <MatchState title="Complete your profile" body="Add what you're looking for and offering to receive useful recommendations." profileAction />}
        {data?.profileComplete && data.matches.length === 0 && <MatchState title="No strong matches yet" body="Browse all attendees while more profiles are completed." directoryAction />}
        {data && data.matches.length > 0 && <><div className="matches-summary"><span><b>{data.matches.length}</b> recommendations</span><span>from {data.totalAttendees} profiles</span></div><div className="matches-list">{data.matches.map((match, index) => <MatchCard key={match.id} match={match} rank={index + 1} onBookmark={(value) => updateBookmark(match.id, value)} />)}</div></>}
      </main>
    </AttendeePageShell>
  );
}

function MatchCard({ match, rank, onBookmark }: { match: MatchSuggestion; rank: number; onBookmark: (value: boolean) => void }) {
  function shareMatch() {
    const url = `${window.location.origin}/p/${match.id}`;
    if (navigator.share) {
      navigator.share({ title: match.name, url }).catch(() => undefined);
      return;
    }
    navigator.clipboard?.writeText(url).catch(() => undefined);
  }

  return (
    <article className={`match-card${match.bookmarked ? " is-bookmarked" : ""}`}>
      <div className="match-rank">#{rank}</div>
      <Link className="match-person" href={`/attendees/${match.id}`}>
        <DirectoryAvatar name={match.name} photoUrl={match.photoUrl} />
        <div>
          <h2>{match.name}{match.met && <span className="met-badge">Met</span>}</h2>
          {match.businessName && <p>{match.businessName}</p>}
          <span>{[match.businessCategory, match.chapterName].filter(Boolean).join(" · ")}</span>
        </div>
      </Link>
      {match.bookmarked && <span className="match-saved-label">Saved</span>}
      <div className="card-icon-actions" aria-label={`Actions for ${match.name}`}>
        <BookmarkButton attendeeId={match.id} initialBookmarked={match.bookmarked} compact onChange={onBookmark} />
        <a className="icon-btn" href={`tel:${match.phone}`} aria-label={`Call ${match.name}`} title="Call"><PhoneIcon /></a>
        {match.linkedInUrl && <a className="icon-btn" href={match.linkedInUrl} target="_blank" rel="noreferrer" aria-label={`${match.name} on LinkedIn`} title="LinkedIn"><LinkedInIcon /></a>}
        <button className="icon-btn" type="button" onClick={shareMatch} aria-label={`Share ${match.name}`} title="Share"><ShareIcon /></button>
      </div>
      <div className="match-explanation"><span className="match-spark">✦</span><div><b>Why you should meet</b><p>{match.headline}</p></div></div>
      <div className="match-card-footer">{match.checkedIn ? <span className="match-present">At the event</span> : <span>Not checked in yet</span>}{match.tableNumber && <span>Table {match.tableNumber}</span>}<Link href={`/attendees/${match.id}`}>View profile →</Link></div>
    </article>
  );
}

function MatchState({ title, body, profileAction, directoryAction }: { title: string; body: string; profileAction?: boolean; directoryAction?: boolean }) {
  return <div className="directory-state"><h2>{title}</h2><p>{body}</p>{profileAction && <Link className="btn-primary" href="/profile">Open profile</Link>}{directoryAction && <Link className="btn-primary" href="/directory">Browse attendees</Link>}</div>;
}
function MatchesSkeleton() { return <div className="matches-list" aria-label="Loading recommendations">{[1, 2, 3].map((item) => <div className="match-card match-skeleton" key={item}><span /><div /><div /></div>)}</div>; }
function DirectoryListIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="7" r="2" /><circle cx="7" cy="17" r="2" /><path d="M12 7h8M12 17h8" /></svg>; }
function RefreshIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M18.3 12A6.5 6.5 0 0 0 7 7.5L4 12M5.7 12A6.5 6.5 0 0 0 17 16.5l3-4.5" /></svg>; }
function PhoneIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8c1.2 2.4 3.2 4.4 5.6 5.6l1.9-1.9c.3-.3.7-.4 1-.2 1 .4 2.1.6 3.2.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1C9.6 20 4 14.4 4 7.7c0-.6.4-1 1-1h3.1c.6 0 1 .4 1 1 0 1.1.2 2.2.6 3.2.1.3 0 .7-.2 1L6.6 10.8Z" /></svg>; }
function LinkedInIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v10M5 5.5v.1M10 19v-9M10 13.5c.7-2.2 2-3.5 4-3.5 2.6 0 4 1.7 4 5v4" /></svg>; }
function ShareIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.2" /><circle cx="17" cy="6" r="2.2" /><circle cx="17" cy="18" r="2.2" /><path d="M8 11l7-4M8 13l7 4" /></svg>; }
