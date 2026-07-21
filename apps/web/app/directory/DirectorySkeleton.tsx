// Shared skeleton for the "People" (directory) route — used both by the
// route-level loading boundary (loading.tsx, shown instantly on navigation)
// and by the page's own first-load data state.
export function DirectorySkeleton() {
  return (
    <div className="directory-grid" aria-label="Loading directory" aria-busy="true">
      {[1, 2, 3, 4].map((item) => (
        <div className="directory-card skeleton-card" key={item}><span /><div><span /><span /></div></div>
      ))}
    </div>
  );
}
