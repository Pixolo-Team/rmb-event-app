import Link from "next/link";
import { AttendeeShellSkeleton } from "../components/AttendeeShellSkeleton";
import { MatchesSkeleton } from "./MatchesSkeleton";

// Route-level loading boundary: Next renders this the instant the "Bookmark"
// tab is tapped, so the page swaps immediately to a skeleton while the matches
// segment and its data resolve — no lingering on the previous page. The top
// actions row needs no data, so it's rendered for real (matching the actual
// page, which also renders it unconditionally) instead of as a placeholder.
export default function MatchesLoading() {
  return (
    <AttendeeShellSkeleton title="Want to Meet">
      <main className="attendee-page matches-page">
        <div className="matches-top-actions" aria-label="Recommendation actions">
          <Link className="matches-browse-top" href="/directory">
            <DirectoryListIcon />
            <span>Browse directory</span>
          </Link>
          <button className="matches-refresh" type="button" disabled aria-label="Refreshing attendees">
            <RefreshIcon />
            <span>Refresh</span>
          </button>
        </div>
        <MatchesSkeleton />
      </main>
    </AttendeeShellSkeleton>
  );
}

function DirectoryListIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="7" r="2" /><circle cx="7" cy="17" r="2" /><path d="M12 7h8M12 17h8" /></svg>;
}
function RefreshIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M18.3 12A6.5 6.5 0 0 0 7 7.5L4 12M5.7 12A6.5 6.5 0 0 0 17 16.5l3-4.5" /></svg>;
}
