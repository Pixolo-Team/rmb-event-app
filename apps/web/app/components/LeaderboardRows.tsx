import Link from "next/link";
import { DirectoryAvatar } from "./DirectoryAvatar";
import type { LeaderboardEntry } from "../lib/leaderboardCache";

export function LeaderboardRows({ entries, currentId, publicDisplay = false }: { entries: LeaderboardEntry[]; currentId?: string; publicDisplay?: boolean }) {
  return <div className={`leaderboard-list${publicDisplay ? " venue" : ""}`} role="list">
    {entries.map((entry) => {
      const rank = entry.rank;
      const isTopRank = rank !== null && rank <= 3;
      const row = <><span className="leaderboard-rank">{isTopRank ? <span aria-label={`Rank ${rank}`}>{medal(rank)}</span> : formatRank(rank)}</span><DirectoryAvatar name={entry.name} photoUrl={entry.photoUrl} /><span className="leaderboard-person"><strong>{entry.name}{entry.id === currentId ? " (you)" : ""}</strong>{entry.businessName && <small>{entry.businessName}</small>}</span><span className="leaderboard-count"><strong>{entry.metCount}</strong><small>met</small></span></>;
      return publicDisplay ? <div className={`leaderboard-row${isTopRank ? " top" : ""}`} role="listitem" key={entry.id}>{row}</div> : <Link className={`leaderboard-row${isTopRank ? " top" : ""}${entry.id === currentId ? " me" : ""}`} role="listitem" href={`/attendees/${entry.id}`} key={entry.id}>{row}</Link>;
    })}
  </div>;
}

function medal(rank: number) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"; }
function formatRank(rank: number | null) { return rank ? `#${rank}` : "—"; }
