"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { BookmarkButton } from "../components/BookmarkButton";
import { DirectoryAvatar } from "../components/DirectoryAvatar";
import { PageIntro } from "../components/PageIntro";
import { type BookmarkConnection, connectionsCache } from "../lib/connectionsCache";
import { trackEvent } from "../lib/gtag";
import { matchesCache, type MatchesResponse, type MatchSuggestion } from "../lib/matchesCache";
import { MatchesSkeleton } from "./MatchesSkeleton";

// How many suggestions to show before the "Show more" reveal, so the first paint
// isn't a wall of cards.
const SUGGESTIONS_PREVIEW = 5;

export default function MatchesPage() {
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);

    const cachedBookmarks = connectionsCache.get()?.bookmarks ?? [];

    try {
      const [matchesResult, bookmarksResult] = await Promise.allSettled([
        fetch(`/api/matches${refresh ? "?refresh=1" : ""}`, { credentials: "include" }),
        fetch("/api/bookmarks", { credentials: "include" }),
      ]);

      let nextMatches = data;
      let nextBookmarks = bookmarks;
      let hasFreshData = false;

      if (matchesResult.status === "fulfilled" && matchesResult.value.ok) {
        nextMatches = await matchesResult.value.json() as MatchesResponse;
        matchesCache.set(nextMatches);
        hasFreshData = true;
      }

      if (bookmarksResult.status === "fulfilled" && bookmarksResult.value.ok) {
        nextBookmarks = await bookmarksResult.value.json() as BookmarkConnection[];
        const existingConnections = connectionsCache.get()?.connections ?? [];
        connectionsCache.set({ connections: existingConnections, bookmarks: nextBookmarks });
        hasFreshData = true;
      }

      if (!hasFreshData) throw new Error();

      setData(nextMatches);
      setBookmarks(nextBookmarks);
      setOffline(false);
      setError(false);
    } catch {
      if (!data && !matchesCache.get() && cachedBookmarks.length === 0) setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const cachedMatches = matchesCache.get();
    const cachedBookmarks = connectionsCache.get()?.bookmarks ?? [];
    if (cachedMatches) {
      setData(cachedMatches);
      setOffline(!navigator.onLine);
      setLoading(false);
    }
    if (cachedBookmarks.length > 0) {
      setBookmarks(cachedBookmarks);
      setOffline(!navigator.onLine);
      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleRecommendations = useMemo(
    () => (data?.matches ?? []).filter((match) => !bookmarks.some((bookmark) => bookmark.id === match.id)),
    [bookmarks, data?.matches],
  );

  function syncBookmarks(next: BookmarkConnection[]) {
    setBookmarks(next);
    const existingConnections = connectionsCache.get()?.connections ?? [];
    connectionsCache.set({ connections: existingConnections, bookmarks: next });
  }

  function updateBookmark(id: string, bookmarked: boolean) {
    if (data) {
      const next = { ...data, matches: data.matches.map((item) => item.id === id ? { ...item, bookmarked } : item) };
      setData(next);
      matchesCache.set(next);

      const match = next.matches.find((item) => item.id === id);
      if (bookmarked && match) {
        syncBookmarks(bookmarks.some((item) => item.id === id) ? bookmarks : [toBookmark(match), ...bookmarks]);
        return;
      }
    }

    if (!bookmarked) {
      syncBookmarks(bookmarks.filter((item) => item.id !== id));
    }
  }

  return (
    <AttendeePageShell>
      <main className="attendee-page matches-page">
        <PageIntro>Your saved list, plus smart-match suggestions you can add to it.</PageIntro>
        <div className="matches-top-actions" aria-label="Recommendation actions"><Link className="matches-browse-top" href="/directory"><DirectoryListIcon /><span>Browse directory</span></Link><button className={`matches-refresh${refreshing ? " is-refreshing" : ""}`} type="button" disabled={refreshing} onClick={() => load(true)} aria-label={refreshing ? "Refreshing attendees" : "Refresh attendees"}><RefreshIcon /><span>{refreshing ? "Refreshing..." : "Refresh"}</span></button></div>
        {offline && <div className="banner info"><div><b>Showing saved attendees</b>You are offline. Your Want to Meet list will refresh when you reconnect.</div></div>}
        {loading && <MatchesSkeleton />}
        {!loading && error && !data && bookmarks.length === 0 && <MatchState title="Can't load attendees" body="Check your connection and try again." />}
        {!loading && bookmarks.length === 0 && visibleRecommendations.length === 0 && !data?.profileComplete && <MatchState title="Complete your profile" body="Add what you're looking for and offering to receive useful recommendations." profileAction />}
        {!loading && !error && data?.profileComplete && bookmarks.length === 0 && visibleRecommendations.length === 0 && <MatchState title="Your Want to Meet list is empty" body="Save attendees from People and they'll appear here." directoryAction />}

        {!loading && (bookmarks.length > 0 || (data?.profileComplete && visibleRecommendations.length > 0)) && (
          <section className="matches-section" aria-label="Your saved list">
            <div className="matches-section-head">
              <h2><BookmarkGlyph /> Your list</h2>
              <span className="matches-section-count">{bookmarks.length}</span>
            </div>
            {bookmarks.length > 0 ? (
              <ul className="wtm-list">{bookmarks.map((person) => <SavedRow key={person.id} person={person} onBookmark={(value) => updateBookmark(person.id, value)} />)}</ul>
            ) : (
              <p className="empty-copy matches-section-empty">Nothing saved yet — add people from the suggestions below or from People.</p>
            )}
          </section>
        )}

        {!loading && data?.profileComplete && visibleRecommendations.length > 0 && (
          <section className="matches-section" aria-label="Suggested for you">
            <div className="matches-section-head suggested">
              <h2><span className="match-spark" aria-hidden="true">✦</span> Suggested for you</h2>
              <span className="matches-section-count">{visibleRecommendations.length} · tap <BookmarkGlyph /> to add</span>
            </div>
            <ul className="wtm-list">{(showAllSuggestions ? visibleRecommendations : visibleRecommendations.slice(0, SUGGESTIONS_PREVIEW)).map((match) => <SuggestionRow key={match.id} match={match} onBookmark={(value) => updateBookmark(match.id, value)} />)}</ul>
            {!showAllSuggestions && visibleRecommendations.length > SUGGESTIONS_PREVIEW && (
              <button className="matches-show-more" type="button" onClick={() => setShowAllSuggestions(true)}>
                Show {visibleRecommendations.length - SUGGESTIONS_PREVIEW} more suggestions
              </button>
            )}
          </section>
        )}
      </main>
    </AttendeePageShell>
  );
}

function PersonRow({
  id, name, photoUrl, sub, met, checkedIn, reason, initialBookmarked, onBookmark, source,
}: {
  id: string; name: string; photoUrl: string | null; sub: string; met: boolean; checkedIn?: boolean;
  reason?: string | null; initialBookmarked: boolean; onBookmark: (value: boolean) => void; source: "saved" | "recommendation";
}) {
  return (
    <li className="wtm-row">
      <div className="wtm-row-top">
        <Link className="wtm-row-main" href={`/attendees/${id}`} onClick={() => trackMatchOpen(source)}>
          <DirectoryAvatar name={name} photoUrl={photoUrl} />
          <span className="wtm-row-text">
            <span className="wtm-row-name">
              {name}
              {met && <span className="met-badge">Met</span>}
              {checkedIn && <span className="wtm-here">Here</span>}
            </span>
            {sub && <span className="wtm-row-sub">{sub}</span>}
          </span>
        </Link>
        <BookmarkButton attendeeId={id} initialBookmarked={initialBookmarked} compact onChange={onBookmark} />
      </div>
      {reason && (
        <div className="wtm-row-reason">
          <span className="match-spark" aria-hidden="true">✦</span>
          <span><ReasonText text={reason} /></span>
        </div>
      )}
    </li>
  );
}

// Bolds the leading "Offers:" / "Looking for:" label (matching.service.ts's
// buildHeadline always puts one of these at the start when present) so it reads
// as a label, not just more sentence text.
function ReasonText({ text }: { text: string }) {
  const match = text.match(/^(Offers|Looking for):\s*/);
  if (!match) return <>{text}</>;
  return (
    <>
      <strong>{match[0]}</strong>
      {text.slice(match[0].length)}
    </>
  );
}

function SavedRow({ person, onBookmark }: { person: BookmarkConnection; onBookmark: (value: boolean) => void }) {
  return (
    <PersonRow
      id={person.id} name={person.name} photoUrl={person.photoUrl} met={person.met}
      sub={[person.businessName, person.chapterName].filter(Boolean).join(" · ")}
      initialBookmarked onBookmark={onBookmark} source="saved"
    />
  );
}

function SuggestionRow({ match, onBookmark }: { match: MatchSuggestion; onBookmark: (value: boolean) => void }) {
  return (
    <PersonRow
      id={match.id} name={match.name} photoUrl={match.photoUrl} met={match.met} checkedIn={match.checkedIn}
      sub={[match.businessName, match.chapterName].filter(Boolean).join(" · ")}
      reason={match.headline} initialBookmarked={match.bookmarked} onBookmark={onBookmark} source="recommendation"
    />
  );
}

function trackMatchOpen(source: "recommendation" | "saved") {
  trackEvent("match_opened", {
    feature: "matches",
    target_type: source,
    success: true,
  });
}

function MatchState({ title, body, profileAction, directoryAction }: { title: string; body: string; profileAction?: boolean; directoryAction?: boolean }) {
  return <div className="directory-state"><h2>{title}</h2><p>{body}</p>{profileAction && <Link className="btn-primary" href="/profile">Open profile</Link>}{directoryAction && <Link className="btn-primary" href="/directory">Browse attendees</Link>}</div>;
}

function toBookmark(match: MatchSuggestion): BookmarkConnection {
  return {
    id: match.id,
    name: match.name,
    phone: match.phone,
    email: "",
    businessName: match.businessName,
    businessCategory: match.businessCategory,
    bio: null,
    tableNumber: match.tableNumber,
    photoUrl: match.photoUrl,
    linkedInUrl: match.linkedInUrl,
    met: match.met,
    bookmarkedAt: new Date().toISOString(),
    bookmarked: true,
    chapterName: match.chapterName,
    city: match.city,
  };
}

function BookmarkGlyph() { return <svg className="matches-bookmark-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4z" /></svg>; }
function DirectoryListIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="7" r="2" /><circle cx="7" cy="17" r="2" /><path d="M12 7h8M12 17h8" /></svg>; }
function RefreshIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M18.3 12A6.5 6.5 0 0 0 7 7.5L4 12M5.7 12A6.5 6.5 0 0 0 17 16.5l3-4.5" /></svg>; }
