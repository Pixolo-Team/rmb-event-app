import { AttendeeShellSkeleton } from "../components/AttendeeShellSkeleton";
import { DirectorySkeleton } from "./DirectorySkeleton";

// Route-level loading boundary for the "People" tab — swaps to a skeleton
// immediately on navigation instead of lingering on the previous screen.
export default function DirectoryLoading() {
  return (
    <AttendeeShellSkeleton title="People">
      <main className="attendee-page directory-page">
        <p className="page-intro">Find the right people before and during the event.</p>
        <DirectorySkeleton />
      </main>
    </AttendeeShellSkeleton>
  );
}
