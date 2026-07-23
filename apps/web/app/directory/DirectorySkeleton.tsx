// Shared skeleton for the "People" (directory) route — used both by the
// route-level loading boundary (loading.tsx, shown instantly on navigation)
// and by the page's own first-load data state. Mirrors the real card: avatar
// + name/meta, plus the actions row (bookmark, call, share, LinkedIn, website).
export function DirectorySkeleton() {
  return (
    <>
      <span className="result-count skeleton-block directory-skeleton-count" aria-hidden="true" />
      <div className="directory-grid" aria-label="Loading directory" aria-busy="true" role="status">
        {[0, 1, 2, 3].map((item) => (
          <article className="directory-card-wrap" key={item}>
            <div className="directory-card">
              <span className="skeleton-block connection-skeleton-avatar" />
              <div className="connection-skeleton-copy">
                <span className="skeleton-block connection-skeleton-name" />
                <span className="skeleton-block connection-skeleton-line short" />
              </div>
            </div>
            <div className="directory-card-actions directory-skeleton-actions">
              <span className="skeleton-block pill" />
              <span className="skeleton-block pill" />
              <span className="skeleton-block circle" />
              <span className="skeleton-block circle" />
            </div>
          </article>
        ))}
        <span className="sr-only">Loading directory...</span>
      </div>
    </>
  );
}
