"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { DirectoryAvatar } from "../components/DirectoryAvatar";
import { PoweredByFooter } from "../components/PoweredByFooter";
import { EventSummary, summaryCache } from "../lib/summaryCache";

function formatMetDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(iso));
}

export default function SummaryPage() {
  const [data, setData] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    const cached = summaryCache.get();
    if (cached) {
      setData(cached);
      setOffline(!navigator.onLine);
      setLoading(false);
    }

    fetch("/api/attendees/me/summary", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result = (await response.json()) as EventSummary;
        summaryCache.set(result);
        setData(result);
        setOffline(false);
        setError(false);
      })
      .catch(() => {
        if (!cached) setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AttendeePageShell showFooter={false}>
      <main className="attendee-page summary-page">
        {offline ? (
          <div className="banner info">
            <div>
              <b>Showing saved summary</b>
              You&apos;re offline. Export requires a connection.
            </div>
          </div>
        ) : null}

        {loading ? <div className="directory-loading">Preparing your summary...</div> : null}

        {!loading && error && !data ? (
          <div className="directory-state">
            <h1>Can&apos;t load your summary</h1>
            <p>Check your connection and try again.</p>
          </div>
        ) : null}

        {data ? (
          <>
            <section className="summary-hero">
              <p className="eyebrow">Your event recap</p>
              <h1>{data.event.name}</h1>
              <p>
                {data.event.startAt
                  ? new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(data.event.startAt))
                  : "Networking summary"}
              </p>
            </section>

            <section className="summary-stats" aria-label="Event statistics">
              <div>
                <strong>{data.peopleMet}</strong>
                <span>People met</span>
              </div>
              <div>
                <strong>{data.cardsCollected}</strong>
                <span>Cards collected</span>
              </div>
              <div>
                <strong>{data.rank ? `#${data.rank}` : "Not ranked"}</strong>
                <span>{data.rank ? `of ${data.totalRanked} attendees` : "Check in to join the leaderboard"}</span>
              </div>
            </section>

            <section className="summary-section">
              <div className="summary-section-heading">
                <div>
                  <p className="eyebrow">Follow up</p>
                  <h2>Top connections</h2>
                </div>
                <Link href="/connections">View all</Link>
              </div>

              {data.topConnections.length ? (
                <div className="summary-connections">
                  {data.topConnections.map((person) => {
                    // Real identifiers, same pattern as the directory card — no
                    // generic "Evento attendee" filler. Falls back to when you
                    // met them (always available) only if there's truly no
                    // business info to show.
                    const infoLine = [person.businessName, person.businessCategory, person.chapterName]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <Link href={`/attendees/${person.id}`} className="summary-person" key={person.id}>
                        <DirectoryAvatar name={person.name} photoUrl={null} />
                        <div>
                          <b>{person.name}</b>
                          <span>{infoLine || `Met ${formatMetDate(person.metAt)}`}</span>
                          {person.tableNumber ? <small>Table {person.tableNumber}</small> : null}
                        </div>
                        <span className="summary-person-arrow" aria-hidden="true">›</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="summary-empty">
                  <p>You didn&apos;t record any meetings yet.</p>
                  <Link href="/directory">Browse attendees</Link>
                </div>
              )}
            </section>

            <PoweredByFooter />
          </>
        ) : null}
      </main>
    </AttendeePageShell>
  );
}
