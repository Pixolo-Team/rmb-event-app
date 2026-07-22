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
import { SingleSelectDropdown } from "../components/SingleSelectDropdown";

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
            <div className="filter-sheet-header">
              <h2 id="filter-title">Filter attendees</h2>
              <button className="menu-close" type="button" aria-label="Close filters" onClick={() => setFilterOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <FilterSelect label="Business category" value={filters.category} options={data?.facets.businessCategories ?? []} onChange={(category) => setFilters({ ...filters, category })} allLabel="All" />
            <FilterSelect label="Company" value={filters.company} options={data?.facets.companies ?? []} onChange={(company) => setFilters({ ...filters, company })} allLabel="All" />
            <FilterSelect label="City" value={filters.city} options={data?.facets.cities ?? []} onChange={(city) => setFilters({ ...filters, city })} allLabel="All" />
            <SingleSelectDropdown
              label="RMB chapter"
              value={filters.chapter}
              onChange={(chapter) => setFilters({ ...filters, chapter })}
              placeholder="All chapters"
              options={[
                { value: "", label: "All chapters" },
                ...(data?.facets.chapters ?? []).map((chapter) => ({ value: chapter, label: chapter })),
                ...(data?.facets.hasAttendeesWithoutChapter ? [{ value: "__none__", label: "No chapter" }] : []),
              ]}
            />
            <SingleSelectDropdown
              label="Check-in status"
              value={filters.checkin}
              onChange={(checkin) => setFilters({ ...filters, checkin: checkin as CheckinFilter })}
              options={[
                { value: "all", label: "Everyone" },
                { value: "checked-in", label: "Checked in" },
                { value: "not-checked-in", label: "Not checked in" },
              ]}
            />
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

  // Real identifiers only — the Attendee model has no job-title/designation
  // field and no mutual-connections aggregate, so those two items aren't
  // shown; everything below is genuine profile data. City is intentionally
  // left out per request — company + industry lead, chapter/table follow.
  const primaryLine = attendee.businessName;
  const secondaryLine = [attendee.businessCategory, attendee.chapterName, attendee.tableNumber && `Table ${attendee.tableNumber}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="directory-card-wrap">
      <Link className="directory-card" href={`/attendees/${attendee.id}`}>
        <DirectoryAvatar name={attendee.name} photoUrl={attendee.photoUrl} />
        <div className="directory-card-body">
          <div className="directory-name-row">
            <h2>{attendee.name}</h2>
            {attendee.met && <span className="met-badge">Met</span>}
            {attendee.checkedIn && <span className="presence-pill" title="Checked in">Present</span>}
          </div>
          {primaryLine ? <p className="attendee-meta primary">{primaryLine}</p> : null}
          {secondaryLine ? <p className="attendee-meta secondary">{secondaryLine}</p> : null}
        </div>
        <span className="directory-card-chevron" aria-hidden="true"><ChevronIcon /></span>
      </Link>
      <div className="directory-card-actions" aria-label={`Actions for ${attendee.name}`}>
        <BookmarkButton attendeeId={attendee.id} initialBookmarked={Boolean(attendee.bookmarked)} compact compactLabel onChange={onBookmark} />
        <a className="icon-btn" href={`tel:${attendee.phone}`} aria-label={`Call ${attendee.name}`}><PhoneIcon /><span>Call</span></a>
        <button className="icon-btn icon-only" type="button" onClick={shareAttendee} aria-label={`Share ${attendee.name}`} title="Share"><ShareIcon /></button>
        {attendee.linkedInUrl && <a className="icon-btn icon-only" href={attendee.linkedInUrl} target="_blank" rel="noreferrer" aria-label={`${attendee.name} on LinkedIn`} title="LinkedIn"><LinkedInIcon /></a>}
        {attendee.websiteUrl && <a className="icon-btn icon-only" href={attendee.websiteUrl} target="_blank" rel="noreferrer" aria-label={`${attendee.name} website`} title="Website"><WebsiteIcon /></a>}
      </div>
    </article>
  );
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allLabel: string;
}) {
  return (
    <SingleSelectDropdown
      label={label}
      value={value}
      onChange={onChange}
      placeholder={allLabel}
      options={[
        { value: "", label: allLabel },
        ...options.map((option) => ({ value: option, label: option })),
      ]}
    />
  );
}

function DirectoryState({ title, body }: { title: string; body: string }) { return <div className="directory-state"><h2>{title}</h2><p>{body}</p></div>; }
function PhoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path opacity="0.1" d="M3 6.5C3 14.5081 9.49187 21 17.5 21C18.166 21 18.8216 20.9551 19.4637 20.8682C20.3747 20.7448 21 19.9292 21 19.01V16.4415C21 15.5807 20.4491 14.8164 19.6325 14.5442L16.4841 13.4947C15.6836 13.2279 14.8252 13.699 14.6206 14.5177C14.3475 15.6102 12.987 15.987 12.1907 15.1907L8.80926 11.8093C8.01301 11.013 8.38984 9.65254 9.48229 9.37943C10.301 9.17476 10.7721 8.31644 10.5053 7.51586L9.45585 4.36754C9.18362 3.55086 8.41934 3 7.55848 3H4.99004C4.0708 3 3.25518 3.62533 3.13185 4.53627C3.0449 5.17845 3 5.83398 3 6.5Z" fill="currentColor" /><path d="M3 6.5C3 14.5081 9.49187 21 17.5 21C18.166 21 18.8216 20.9551 19.4637 20.8682C20.3747 20.7448 21 19.9292 21 19.01V16.4415C21 15.5807 20.4491 14.8164 19.6325 14.5442L16.4841 13.4947C15.6836 13.2279 14.8252 13.699 14.6206 14.5177C14.3475 15.6102 12.987 15.987 12.1907 15.1907L8.80926 11.8093C8.01301 11.013 8.38984 9.65254 9.48229 9.37943C10.301 9.17476 10.7721 8.31644 10.5053 7.51586L9.45585 4.36754C9.18362 3.55086 8.41934 3 7.55848 3H4.99004C4.0708 3 3.25518 3.62533 3.13185 4.53627C3.0449 5.17845 3 5.83398 3 6.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}
function LinkedInIcon() { return <svg className="brand-glyph" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.5h4v11H3v-11Zm6 0h3.8v1.5h.05c.53-.95 1.83-1.95 3.77-1.95C20.3 9.05 21 11 21 14.1v6.4h-4v-5.7c0-1.36-.02-3.1-1.9-3.1-1.9 0-2.2 1.48-2.2 3v5.8H9v-11Z" /></svg>; }
function WebsiteIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4a13 13 0 0 1 0 16M12 4a13 13 0 0 0 0 16" /></svg>; }
function ShareIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.2" /><circle cx="17" cy="6" r="2.2" /><circle cx="17" cy="18" r="2.2" /><path d="M8 11l7-4M8 13l7 4" /></svg>; }
function CloseIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>; }
