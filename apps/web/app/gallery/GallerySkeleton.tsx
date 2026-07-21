// Shared skeleton for the Gallery photo grid — used by the page's own first-load
// state and by the route-level loading boundary (loading.tsx).
export function GallerySkeleton() {
  return (
    <div className="gallery-grid" role="status" aria-label="Loading the gallery" aria-busy="true">
      {Array.from({ length: 9 }).map((_, index) => (
        <span key={index} className="skeleton-block gallery-skeleton-tile" />
      ))}
    </div>
  );
}
