import Link from "next/link";
import { DirectoryAvatar } from "./DirectoryAvatar";
import type { LeaderboardEntry } from "../lib/leaderboardCache";

export function LeaderboardRows({ entries, currentId, publicDisplay = false }: { entries: LeaderboardEntry[]; currentId?: string; publicDisplay?: boolean }) {
  return <div className={`leaderboard-list${publicDisplay ? " venue" : ""}`} role="list">
    {entries.map((entry) => {
      const row = <><span className="leaderboard-rank">{entry.rank <= 3 ? <span aria-label={`Rank ${entry.rank}`}>{medal(entry.rank)}</span> : `#${entry.rank}`}</span><DirectoryAvatar name={entry.name} photoUrl={entry.photoUrl} /><span className="leaderboard-person"><strong>{entry.name}{entry.id === currentId ? " (you)" : ""}</strong>{entry.businessName && <small>{entry.businessName}</small>}</span><span className="leaderboard-count"><strong>{entry.metCount}</strong><small>met</small></span></>;
      return publicDisplay ? <div className={`leaderboard-row${entry.rank <= 3 ? " top" : ""}`} role="listitem" key={entry.id}>{row}</div> : <Link className={`leaderboard-row${entry.rank <= 3 ? " top" : ""}${entry.id === currentId ? " me" : ""}`} role="listitem" href={`/attendees/${entry.id}`} key={entry.id}>{row}</Link>;
    })}
  </div>;
}

function medal(rank: number) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"; }
