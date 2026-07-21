// Generic card-shaped loading skeleton for content routes (feed, leaderboard,
// summary, feedback). Mirrors an intro line plus a few stacked cards so a
// route-level loading boundary can paint instantly on navigation.
export function ContentSkeleton({ cards = 3, intro = true }: { cards?: number; intro?: boolean }) {
  return (
    <div className="content-skeleton" role="status" aria-label="Loading" aria-busy="true">
      {intro ? <span className="skeleton-block content-skeleton-intro" /> : null}
      {Array.from({ length: cards }).map((_, index) => (
        <section className="content-skeleton-card" key={index}>
          <span className="skeleton-block content-skeleton-heading" />
          <span className="skeleton-block content-skeleton-line" />
          <span className="skeleton-block content-skeleton-line short" />
        </section>
      ))}
    </div>
  );
}
