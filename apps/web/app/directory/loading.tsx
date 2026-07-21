import { AttendeeShellSkeleton } from "../components/AttendeeShellSkeleton";
import { PageIntro } from "../components/PageIntro";
import { DirectorySkeleton } from "./DirectorySkeleton";
import { DirectoryToolbar } from "./DirectoryToolbar";

// Route-level loading boundary for the "People" tab — swaps to a skeleton
// immediately on navigation instead of lingering on the previous screen.
export default function DirectoryLoading() {
  return (
    <AttendeeShellSkeleton title="People">
      <main className="attendee-page directory-page">
        <PageIntro>Find the right people before and during the event.</PageIntro>
        <DirectoryToolbar query="" activeFilterCount={0} disabled />
        <DirectorySkeleton />
      </main>
    </AttendeeShellSkeleton>
  );
}
