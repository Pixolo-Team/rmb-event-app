// Shared skeleton for the "Want to Meet" (matches) route — used both by the
// route-level loading boundary (loading.tsx, shown instantly on navigation)
// and by the page's own first-load data state.
export function MatchesSkeleton() {
  return (
    <div className="matches-list" aria-label="Loading recommendations" aria-busy="true">
      {[1, 2, 3].map((item) => (
        <div className="match-card match-skeleton" key={item}><span /><div /><div /></div>
      ))}
    </div>
  );
}
