import { AttendeeShellSkeleton } from "../components/AttendeeShellSkeleton";
import { ContentSkeleton } from "../components/ContentSkeleton";

// Route-level loading boundary for the Leaderboard drawer destination.
export default function LeaderboardLoading() {
  return (
    <AttendeeShellSkeleton title="Leaderboard">
      <main className="attendee-page leaderboard-page">
        <ContentSkeleton cards={4} />
      </main>
    </AttendeeShellSkeleton>
  );
}
