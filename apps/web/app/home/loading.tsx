import { AttendeeBottomTabs } from "../components/AttendeeMenu";

// Route-level loading boundary for the "Home" tab. Home uses its own dashboard
// chrome (not the shared AttendeePageShell), so this mirrors HomeSkeleton with a
// static header — painted instantly on navigation while the segment resolves.
export default function HomeLoading() {
  return (
    <div className="home-dash attendee-tabbed-page" aria-busy="true" aria-label="Loading Home">
      <div className="full-page-header attendee-app-header">
        <button className="menu-trigger" type="button" aria-label="Open menu" aria-hidden="true" tabIndex={-1}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <h1 className="app-header-title">Home</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/rmb-fellowship-logo.png"
          alt="Rotary Means Business Fellowship"
          className="app-topbar-brand"
          width={50}
          height={50}
        />
      </div>
      <main className="home-dash-body home-skeleton">
        <div className="home-skeleton-line greeting" />
        <div className="home-skeleton-block status" />
        <div className="home-skeleton-block action" />

        <section className="profile-section">
          <div className="home-skeleton-line section-title" />
          <div className="home-skeleton-stats">
            <span />
            <span />
            <span />
          </div>
        </section>

        <section className="profile-section">
          <div className="home-skeleton-line section-title" />
          <div className="home-skeleton-person"><i /><span /></div>
          <div className="home-skeleton-person"><i /><span /></div>
        </section>
      </main>
      <AttendeeBottomTabs />
    </div>
  );
}
