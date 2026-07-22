import { AttendeeShellSkeleton } from "../components/AttendeeShellSkeleton";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton";

// Route-level loading boundary for the Leaderboard drawer destination.
export default function LeaderboardLoading() {
  return (
    <AttendeeShellSkeleton title="Leaderboard">
      <main className="attendee-page leaderboard-page">
        <LeaderboardSkeleton />
      </main>
    </AttendeeShellSkeleton>
  );
}
