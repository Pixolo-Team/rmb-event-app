"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { DirectoryAvatar } from "../components/DirectoryAvatar";
import { PageIntro } from "../components/PageIntro";
import { directoryCache, type DirectoryAttendee, type DirectoryResponse } from "../lib/directoryCache";
import { BookmarkButton } from "../components/BookmarkButton";
import { DirectorySkeleton } from "./DirectorySkeleton";
import { DirectoryToolbar } from "./DirectoryToolbar";

type CheckinFilter = "all" | "checked-in" | "not-checked-in";

const EMPTY_FILTERS = { category: "", company: "", chapter: "", city: "", checkin: "all" as CheckinFilter };
const DIRECTORY_REVALIDATE_MS = 60_000;

let lastDirectoryRevalidatedAt = 0;
let directoryRequest: Promise<DirectoryResponse> | null = null;

function loadDirectory() {
  if (!directoryRequest) {
    lastDirectoryRevalidatedAt = Date.now();
    directoryRequest = fetch("/api/attendees", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("directory unavailable");
        return (await response.json()) as DirectoryResponse;
      })
      .finally(() => {
        directoryRequest = null;
      });
  }

  return directoryRequest;
}

export default function DirectoryPage() {
  const [data, setData] = useState<DirectoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineResult, setOfflineResult] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMounted, setFilterMounted] = useState(false);

  useEffect(() => {
    if (filterOpen) {
      setFilterMounted(true);
      return;
    }
    if (!filterMounted) return;
    const timeout = window.setTimeout(() => setFilterMounted(false), 200);
    return () => window.clearTimeout(timeout);
  }, [filterOpen, filterMounted]);

  useEffect(() => {
    let cancelled = false;
    const cached = directoryCache.get();
    if (cached) {
      setData(cached);
      setOfflineResult(!navigator.onLine);
      setLoading(false);
    }

    const recentlyChecked = cached && Date.now() - lastDirectoryRevalidatedAt < DIRECTORY_REVALIDATE_MS;
    if (recentlyChecked) return;

    loadDirectory()
      .then((result) => {
        if (cancelled) return;
        directoryCache.set(result);
        setData(result);
        setOfflineResult(false);
        setError(false);
      })
      .catch(() => {
        if (!cached && !cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filterOpen]);

  const attendees = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return [...(data?.attendees ?? [])]
      .filter((attendee) => {
        const searchable = `${attendee.name} ${attendee.businessName ?? ""}`.toLocaleLowerCase();
        return (
          (!normalizedQuery || searchable.includes(normalizedQuery)) &&
          (!filters.category || attendee.businessCategory === filters.category) &&
          (!filters.company || attendee.businessName === filters.company) &&
          (!filters.chapter || (filters.chapter === "__none__" ? !attendee.chapterName : attendee.chapterName === filters.chapter)) &&
          (!filters.city || attendee.city === filters.city) &&
          (filters.checkin === "all" || attendee.checkedIn === (filters.checkin === "checked-in"))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, filters, query]);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key === "checkin" ? value !== "all" : Boolean(value)).length;

  return (
    <AttendeePageShell>
      <main className="attendee-page directory-page">
        <PageIntro>Find the right people before and during the event.</PageIntro>

        {offlineResult && <div className="banner info"><div><b>Showing saved directory</b>You are offline. Results may be slightly out of date.</div></div>}

        <DirectoryToolbar
          query={query}
          activeFilterCount={activeFilterCount}
          onQueryChange={setQuery}
          onClearQuery={() => setQuery("")}
          onOpenFilters={() => setFilterOpen(true)}
        />

        {loading && <DirectorySkeleton />}
        {!loading && error && !data && <DirectoryState title="Can't load directory" body="Check your connection and try again." />}
        {!loading && !error && data?.attendees.length === 0 && <DirectoryState title="No attendees yet" body="Check back after the organizer imports the attendee list." />}
        {!loading && data && data.attendees.length > 0 && (
          <>
            <p className="result-count">{attendees.length} {attendees.length === 1 ? "attendee" : "attendees"}</p>
            {attendees.length === 0 ? (
              <DirectoryState title="No attendees found" body={query ? `No matches found for "${query}".` : "Try removing one or more filters."} />
            ) : (
              <div className="directory-grid">
                {attendees.map((attendee) => <AttendeeCard key={attendee.id} attendee={attendee} onBookmark={(bookmarked) => {
                  if (!data) return;
                  const next = { ...data, attendees: data.attendees.map((item) => item.id === attendee.id ? { ...item, bookmarked } : item) };
                  setData(next);
                  directoryCache.set(next);
                }} />)}
              </div>
            )}
          </>
        )}
      </main>

      {filterMounted && (
        <div className={`filter-layer${filterOpen ? "" : " closing"}`}>
          <button className="menu-backdrop" type="button" aria-label="Close filters" onClick={() => setFilterOpen(false)} />
          <section className="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title">
            <div className="filter-sheet-header"><h2 id="filter-title">Filter attendees</h2><button type="button" aria-label="Close filters" onClick={() => setFilterOpen(false)}>x</button></div>
            <FilterSelect label="Business category" value={filters.category} options={data?.facets.businessCategories ?? []} onChange={(category) => setFilters({ ...filters, category })} />
            <FilterSelect label="Company" value={filters.company} options={data?.facets.companies ?? []} onChange={(company) => setFilters({ ...filters, company })} />
            <FilterSelect label="City" value={filters.city} options={data?.facets.cities ?? []} onChange={(city) => setFilters({ ...filters, city })} />
            <label className="filter-field"><span>RMB chapter</span><select value={filters.chapter} onChange={(event) => setFilters({ ...filters, chapter: event.target.value })}><option value="">All chapters</option>{data?.facets.chapters.map((chapter) => <option key={chapter}>{chapter}</option>)}{data?.facets.hasAttendeesWithoutChapter && <option value="__none__">No chapter</option>}</select></label>
            <label className="filter-field"><span>Check-in status</span><select value={filters.checkin} onChange={(event) => setFilters({ ...filters, checkin: event.target.value as CheckinFilter })}><option value="all">Everyone</option><option value="checked-in">Checked in</option><option value="not-checked-in">Not checked in</option></select></label>
            <div className="filter-actions"><button className="btn-secondary" type="button" onClick={() => setFilters(EMPTY_FILTERS)}>Clear all</button><button className="btn-primary" type="button" onClick={() => setFilterOpen(false)}>Show {attendees.length} results</button></div>
          </section>
        </div>
      )}
    </AttendeePageShell>
  );
}

function AttendeeCard({ attendee, onBookmark }: { attendee: DirectoryAttendee; onBookmark: (value: boolean) => void }) {
  function shareAttendee() {
    const url = `${window.location.origin}/p/${attendee.id}`;
    if (navigator.share) {
      navigator.share({ title: attendee.name, url }).catch(() => undefined);
      return;
    }
    navigator.clipboard?.writeText(url).catch(() => undefined);
  }

  return (
    <article className="directory-card-wrap">
      <Link className="directory-card" href={`/attendees/${attendee.id}`}>
        <DirectoryAvatar name={attendee.name} photoUrl={attendee.photoUrl} />
        <div className="directory-card-body">
          <div className="directory-name-row">
            <h2>{attendee.name}</h2>
            {attendee.met && <span className="met-badge">Met</span>}
            {attendee.checkedIn && <span className="status-dot" title="Checked in" />}
          </div>
          {attendee.businessName && <p className="company-name">{attendee.businessName}</p>}
          <p className="attendee-meta">{[attendee.businessCategory, attendee.city].filter(Boolean).join(" · ") || "Profile details coming soon"}</p>
          <div className="card-tags">{attendee.chapterName && <span>{attendee.chapterName}</span>}{attendee.tableNumber && <span>Table {attendee.tableNumber}</span>}</div>
        </div>
        <span className="card-arrow" aria-hidden="true">›</span>
      </Link>
      <div className="directory-card-actions" aria-label={`Actions for ${attendee.name}`}>
        <BookmarkButton attendeeId={attendee.id} initialBookmarked={Boolean(attendee.bookmarked)} compact onChange={onBookmark} />
        <a className="icon-btn" href={`tel:${attendee.phone}`} aria-label={`Call ${attendee.name}`} title="Call"><PhoneIcon /></a>
        {attendee.linkedInUrl && <a className="icon-btn" href={attendee.linkedInUrl} target="_blank" rel="noreferrer" aria-label={`${attendee.name} on LinkedIn`} title="LinkedIn"><LinkedInIcon /></a>}
        {attendee.websiteUrl && <a className="icon-btn" href={attendee.websiteUrl} target="_blank" rel="noreferrer" aria-label={`${attendee.name} website`} title="Website"><WebsiteIcon /></a>}
        <button className="icon-btn" type="button" onClick={shareAttendee} aria-label={`Share ${attendee.name}`} title="Share"><ShareIcon /></button>
      </div>
    </article>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="filter-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">All</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function DirectoryState({ title, body }: { title: string; body: string }) { return <div className="directory-state"><h2>{title}</h2><p>{body}</p></div>; }
function PhoneIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 4.5h3.2l1.6 4.2-2 1.7a14.2 14.2 0 0 0 5.3 5.3l1.7-2 4.2 1.6v3.2a1.8 1.8 0 0 1-2 1.8A15.8 15.8 0 0 1 3.7 6.5a1.8 1.8 0 0 1 1.8-2Z" /></svg>; }
function LinkedInIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v10M5 5.5v.1M10 19v-9M10 13.5c.7-2.2 2-3.5 4-3.5 2.6 0 4 1.7 4 5v4" /></svg>; }
function WebsiteIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4a13 13 0 0 1 0 16M12 4a13 13 0 0 0 0 16" /></svg>; }
function ShareIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.2" /><circle cx="17" cy="6" r="2.2" /><circle cx="17" cy="18" r="2.2" /><path d="M8 11l7-4M8 13l7 4" /></svg>; }
