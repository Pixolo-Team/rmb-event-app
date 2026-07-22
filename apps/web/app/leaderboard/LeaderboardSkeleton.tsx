export function LeaderboardSkeleton() {
  return (
    <>
      <section className="leaderboard-my-stat leaderboard-my-stat-skeleton" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index}>
            <span className="skeleton-block leaderboard-skeleton-label" />
            <span className="skeleton-block leaderboard-skeleton-value" />
          </div>
        ))}
      </section>

      <div className="leaderboard-label-row" aria-hidden="true">
        <span className="skeleton-block leaderboard-skeleton-heading" />
        <span className="skeleton-block leaderboard-skeleton-updated" />
      </div>

      <div className="leaderboard-list leaderboard-list-skeleton" role="status" aria-label="Loading leaderboard" aria-busy="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="leaderboard-row leaderboard-row-skeleton" key={index}>
            <span className="skeleton-block leaderboard-skeleton-rank" />
            <span className="skeleton-block leaderboard-skeleton-avatar" />
            <span className="leaderboard-person">
              <span className="skeleton-block leaderboard-skeleton-name" />
              <span className="skeleton-block leaderboard-skeleton-line" />
            </span>
            <span className="leaderboard-count">
              <span className="skeleton-block leaderboard-skeleton-count" />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
