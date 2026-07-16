"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { DirectoryAvatar } from "../components/DirectoryAvatar";
import { directoryCache, type DirectoryAttendee, type DirectoryResponse } from "../lib/directoryCache";
import { BookmarkButton } from "../components/BookmarkButton";

type SortOption = "name" | "company";
type CheckinFilter = "all" | "checked-in" | "not-checked-in";

const EMPTY_FILTERS = { category: "", company: "", chapter: "", city: "", checkin: "all" as CheckinFilter };

export default function DirectoryPage() {
  const [data, setData] = useState<DirectoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineResult, setOfflineResult] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("name");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const cached = directoryCache.get();
    if (cached) {
      setData(cached);
      setOfflineResult(!navigator.onLine);
      setLoading(false);
    }

    fetch("/api/attendees", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("directory unavailable");
        const result = (await response.json()) as DirectoryResponse;
        directoryCache.set(result);
        setData(result);
        setOfflineResult(false);
        setError(false);
      })
      .catch(() => {
        if (!cached) setError(true);
      })
      .finally(() => setLoading(false));
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
      .sort((a, b) => {
        const first = sort === "company" ? a.businessName ?? a.name : a.name;
        const second = sort === "company" ? b.businessName ?? b.name : b.name;
        return first.localeCompare(second);
      });
  }, [data, filters, query, sort]);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key === "checkin" ? value !== "all" : Boolean(value)).length;

  return (
    <AttendeePageShell>
      <main className="attendee-page directory-page">
        <div className="page-heading-row">
          <div>
            <p className="eyebrow">Networking</p>
            <h1>Attendee Directory</h1>
            <p>Find the right people before and during the event.</p>
          </div>
        </div>

        {offlineResult && <div className="banner info"><div><b>Showing saved directory</b>You’re offline. Results may be slightly out of date.</div></div>}

        <div className="directory-toolbar">
          <label className="search-control">
            <span className="sr-only">Search attendees</span>
            <SearchIcon />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or company" />
            {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>×</button>}
          </label>
          <button className="filter-button" type="button" onClick={() => setFilterOpen(true)}>
            <FilterIcon /> Filters {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>
          <label className="sort-control">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
              <option value="name">Name</option>
              <option value="company">Company</option>
            </select>
          </label>
        </div>

        {loading && <DirectorySkeleton />}
        {!loading && error && !data && <DirectoryState title="Can’t load directory" body="Check your connection and try again." />}
        {!loading && !error && data?.attendees.length === 0 && <DirectoryState title="No attendees yet" body="Check back after the organizer imports the attendee list." />}
        {!loading && data && data.attendees.length > 0 && (
          <>
            <p className="result-count">{attendees.length} {attendees.length === 1 ? "attendee" : "attendees"}</p>
            {attendees.length === 0 ? (
              <DirectoryState title="No attendees found" body={query ? `No matches found for “${query}”.` : "Try removing one or more filters."} />
            ) : (
              <div className="directory-grid">
                {attendees.map((attendee) => <AttendeeCard key={attendee.id} attendee={attendee} onBookmark={(bookmarked) => {
                  if (!data) return;
                  const next = { ...data, attendees: data.attendees.map((item) => item.id === attendee.id ? { ...item, bookmarked } : item) };
                  setData(next); directoryCache.set(next);
                }} />)}
              </div>
            )}
          </>
        )}
      </main>

      {filterOpen && (
        <div className="filter-layer">
          <button className="menu-backdrop" type="button" aria-label="Close filters" onClick={() => setFilterOpen(false)} />
          <section className="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title">
            <div className="filter-sheet-header"><h2 id="filter-title">Filter attendees</h2><button type="button" aria-label="Close filters" onClick={() => setFilterOpen(false)}>×</button></div>
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
  return (
    <article className="directory-card-wrap"><Link className="directory-card" href={`/attendees/${attendee.id}`}>
      <DirectoryAvatar name={attendee.name} photoUrl={attendee.photoUrl} />
      <div className="directory-card-body">
        <div className="directory-name-row"><h2>{attendee.name}</h2>{attendee.checkedIn && <span className="status-dot" title="Checked in" />}</div>
        {attendee.businessName && <p className="company-name">{attendee.businessName}</p>}
        <p className="attendee-meta">{[attendee.businessCategory, attendee.city].filter(Boolean).join(" · ") || "Profile details coming soon"}</p>
        <div className="card-tags">{attendee.chapterName && <span>{attendee.chapterName}</span>}{attendee.tableNumber && <span>Table {attendee.tableNumber}</span>}</div>
      </div>
      <span className="card-arrow" aria-hidden="true">›</span>
    </Link><BookmarkButton attendeeId={attendee.id} initialBookmarked={Boolean(attendee.bookmarked)} compact onChange={onBookmark} /></article>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="filter-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">All</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function DirectoryState({ title, body }: { title: string; body: string }) { return <div className="directory-state"><h2>{title}</h2><p>{body}</p></div>; }
function DirectorySkeleton() { return <div className="directory-grid" aria-label="Loading directory">{[1, 2, 3, 4].map((item) => <div className="directory-card skeleton-card" key={item}><span /><div><span /><span /></div></div>)}</div>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>; }
function FilterIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>; }
