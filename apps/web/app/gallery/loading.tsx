import { AttendeeShellSkeleton } from "../components/AttendeeShellSkeleton";
import { GallerySkeleton } from "./GallerySkeleton";

// Route-level loading boundary for the Gallery drawer destination — swaps to a
// skeleton immediately on navigation instead of waiting on a frozen screen while
// the route compiles/loads for the first time.
export default function GalleryLoading() {
  return (
    <AttendeeShellSkeleton title="Gallery">
      <div className="attendee-page gallery-page">
        <section className="gallery-copy-block">
          <span className="skeleton-block gallery-copy-skeleton" />
        </section>
        <GallerySkeleton />
      </div>
    </AttendeeShellSkeleton>
  );
}
