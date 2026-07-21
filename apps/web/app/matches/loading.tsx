import { AttendeeShellSkeleton } from "../components/AttendeeShellSkeleton";
import { MatchesSkeleton } from "./MatchesSkeleton";

// Route-level loading boundary: Next renders this the instant the "Want to Meet"
// tab is tapped, so the page swaps immediately to a skeleton while the matches
// segment and its data resolve — no lingering on the previous page.
export default function MatchesLoading() {
  return (
    <AttendeeShellSkeleton title="Want to Meet">
      <main className="attendee-page matches-page">
        <p className="page-intro">Recommendations based on what you need and what others offer.</p>
        <MatchesSkeleton />
      </main>
    </AttendeeShellSkeleton>
  );
}
