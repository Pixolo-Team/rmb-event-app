import { AttendeeShellSkeleton } from "../components/AttendeeShellSkeleton";
import { ContentSkeleton } from "../components/ContentSkeleton";

// Route-level loading boundary for the Feed drawer destination.
export default function FeedLoading() {
  return (
    <AttendeeShellSkeleton title="Feed">
      <div className="attendee-page feed-page">
        <ContentSkeleton cards={2} intro={false} />
      </div>
    </AttendeeShellSkeleton>
  );
}
