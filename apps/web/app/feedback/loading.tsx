import { AttendeeShellSkeleton } from "../components/AttendeeShellSkeleton";
import { ContentSkeleton } from "../components/ContentSkeleton";

// Route-level loading boundary for the Give Feedback drawer destination.
export default function FeedbackLoading() {
  return (
    <AttendeeShellSkeleton title="Feedback">
      <main className="attendee-page feedback-page">
        <ContentSkeleton cards={2} />
      </main>
    </AttendeeShellSkeleton>
  );
}
