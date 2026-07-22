import { AttendeeShellSkeleton } from "../components/AttendeeShellSkeleton";
import { ProfileSkeleton } from "./ProfileSkeleton";

// Route-level loading boundary for the "Profile" tab - swaps to a skeleton
// immediately on navigation instead of lingering on the previous screen.
export default function ProfileLoading() {
  return (
    <AttendeeShellSkeleton title="Profile">
      <main className="attendee-page profile-page">
        <ProfileSkeleton />
      </main>
    </AttendeeShellSkeleton>
  );
}
