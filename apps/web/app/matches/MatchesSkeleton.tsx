// Shared skeleton for the "Bookmark" (matches) route — used both by the
// route-level loading boundary (loading.tsx, shown instantly on navigation)
// and by the page's own first-load data state. matches/page.tsx already
// renders the real .matches-top-actions row unconditionally (it needs no
// data), so this only needs to cover the section heading + row list below it.
export function MatchesSkeleton() {
  return (
    <>
      <section className="matches-section" aria-label="Loading recommendations" aria-busy="true">
        <div className="matches-section-head">
          <span className="skeleton-block matches-skeleton-heading" />
          <span className="skeleton-block matches-skeleton-count" />
        </div>
        <ul className="wtm-list">
          {[0, 1, 2].map((item) => (
            <li className="wtm-row" key={item}>
              <div className="wtm-row-top">
                <div className="wtm-row-main">
                  <span className="skeleton-block wtm-skeleton-avatar" />
                  <span className="wtm-row-text">
                    <span className="skeleton-block wtm-skeleton-name" />
                    <span className="skeleton-block wtm-skeleton-sub" />
                  </span>
                </div>
                <span className="skeleton-block wtm-skeleton-bookmark" />
              </div>
            </li>
          ))}
        </ul>
        <span className="sr-only">Loading recommendations...</span>
      </section>
    </>
  );
}
