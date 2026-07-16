// F2.1 — Smart Attendee Matching engine.
//
// Deliberately decoupled from the Prisma/profile schema (PRD US2.3): the engine
// only knows about this small MatchProfile shape, never a database row. Phase 2
// can swap the algorithm (AI/semantic) without touching the profile schema, and
// the pure functions here run identically on the server or client-side offline.

export interface MatchProfile {
  id: string;
  /** Raw profile tags — the engine never sees pre-computed scores. */
  businessCategory: string | null;
  lookingFor: string[];
  offering: string[];
  /** Chapter display name (e.g. "RMB Surat"), or null for non-RMBians. */
  chapterName: string | null;
}

export type ChapterRelation = "same" | "cross" | "none";

export interface MatchResult {
  /** Relevance score for ranking (F2.1/F2.3). Higher = stronger match. */
  score: number;
  /** Ordered, human-readable reason clauses — viewer-facing ("you"/"they"). */
  reasons: string[];
  /** One-line summary for Screen 2.3; null when there is no meaningful match. */
  headline: string | null;
  /** Chapter relationship between viewer and candidate. */
  chapterRelation: ChapterRelation;
}
