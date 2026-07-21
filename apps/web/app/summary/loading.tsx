import { AttendeeShellSkeleton } from "../components/AttendeeShellSkeleton";
import { ContentSkeleton } from "../components/ContentSkeleton";

// Route-level loading boundary for the Event Summary drawer destination.
export default function SummaryLoading() {
  return (
    <AttendeeShellSkeleton title="Event Summary">
      <main className="attendee-page summary-page">
        <ContentSkeleton cards={3} />
      </main>
    </AttendeeShellSkeleton>
  );
}
