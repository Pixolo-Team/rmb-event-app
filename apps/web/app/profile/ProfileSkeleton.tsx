// Shared skeleton for the "Profile" (your own card) route — used both by the
// route-level loading boundary (loading.tsx, shown instantly on navigation) and
// by the page's own first-load data state. Mirrors the QR business-card block
// and the detail sections below it.
export function ProfileSkeleton() {
  return (
    <div className="profile-skeleton" role="status" aria-label="Loading your profile" aria-busy="true">
      <section className="qr-card profile-skeleton-qr">
        <span className="skeleton-block profile-skeleton-qr-frame" />
        <span className="skeleton-block profile-skeleton-title" />
        <span className="skeleton-block profile-skeleton-line short" />
      </section>
      <div className="profile-details-grid">
        {[0, 1].map((item) => (
          <section className="profile-section" key={item}>
            <span className="skeleton-block profile-skeleton-heading" />
            <span className="skeleton-block profile-skeleton-line" />
            <span className="skeleton-block profile-skeleton-line short" />
          </section>
        ))}
      </div>
    </div>
  );
}
