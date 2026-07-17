import { Injectable } from "@nestjs/common";
import { ChapterRelation, MatchProfile, MatchResult } from "./matching.types";

// Scoring weights. Tag overlap is the strongest signal (the PRD's primary rule:
// "overlap between my 'looking for' tags and their 'offering' tags"), shared
// business category next, same-chapter a light nudge. Cross-chapter is neutral —
// the PRD surfaces cross-chapter matches deliberately, it neither boosts nor
// penalises relevance.
const WEIGHT_TAG_OVERLAP = 2;
const WEIGHT_SHARED_CATEGORY = 3;
const WEIGHT_SAME_CHAPTER = 1;

@Injectable()
export class MatchingService {
  /**
   * Score a single candidate from the viewer's perspective and explain why.
   * Pure and side-effect-free so it can run server-side or be lifted into the
   * client for offline matching.
   */
  computeMatch(viewer: MatchProfile, candidate: MatchProfile): MatchResult {
    const empty: MatchResult = { score: 0, reasons: [], headline: null, chapterRelation: "none" };
    if (viewer.id === candidate.id) return empty;

    const wantsFromThem = intersect(viewer.lookingFor, candidate.offering);
    const offersToThem = intersect(viewer.offering, candidate.lookingFor);
    const sharedCategory =
      Boolean(viewer.businessCategory) && viewer.businessCategory === candidate.businessCategory;
    const chapterRelation = relateChapters(viewer.chapterName, candidate.chapterName);

    // Ordered by priority — the first non-chapter clause becomes the headline lead.
    const primaryClauses: string[] = [];
    if (wantsFromThem.length) {
      primaryClauses.push(`They offer ${humanList(wantsFromThem)}, which you're looking for`);
    }
    if (offersToThem.length) {
      primaryClauses.push(`You offer ${humanList(offersToThem)}, which they're looking for`);
    }
    if (sharedCategory) {
      primaryClauses.push(`You're both in ${viewer.businessCategory}`);
    }

    // Chapter clause: same-chapter always meaningful; cross-chapter only names
    // where they're from when there is already another reason to meet (per PRD,
    // it's a modifier on a category/tag match, never a match reason on its own).
    let chapterClause: string | null = null;
    if (chapterRelation === "same") {
      chapterClause = `You're both in the ${viewer.chapterName} chapter`;
    } else if (chapterRelation === "cross" && primaryClauses.length > 0) {
      chapterClause = `They're in the ${candidate.chapterName} chapter`;
    }

    const reasons = [...primaryClauses];
    if (chapterClause) reasons.push(chapterClause);

    const score =
      (wantsFromThem.length + offersToThem.length) * WEIGHT_TAG_OVERLAP +
      (sharedCategory ? WEIGHT_SHARED_CATEGORY : 0) +
      (chapterRelation === "same" ? WEIGHT_SAME_CHAPTER : 0);

    return { score, reasons, headline: buildHeadline(primaryClauses[0], chapterClause), chapterRelation };
  }

  /**
   * Rank candidates for a viewer, strongest first, dropping non-matches.
   * Foundation for F2.3's "People to meet" list; F2.5 uses computeMatch directly.
   */
  rankMatches(
    viewer: MatchProfile,
    candidates: MatchProfile[],
  ): Array<{ candidate: MatchProfile; match: MatchResult }> {
    return candidates
      .map((candidate) => ({ candidate, match: this.computeMatch(viewer, candidate) }))
      .filter(({ match }) => match.score > 0)
      .sort((a, b) => b.match.score - a.match.score);
  }
}

function relateChapters(viewerChapter: string | null, candidateChapter: string | null): ChapterRelation {
  if (!viewerChapter || !candidateChapter) return "none";
  return viewerChapter === candidateChapter ? "same" : "cross";
}

function buildHeadline(primary: string | undefined, chapterClause: string | null): string | null {
  if (primary && chapterClause) return `${primary} — ${lowerFirst(chapterClause)}`;
  if (primary) return primary;
  // Same-chapter with no other signal still stands alone as a reason.
  if (chapterClause) return chapterClause;
  return null;
}

function intersect(a: string[], b: string[]): string[] {
  const other = new Set(b);
  return a.filter((value) => other.has(value));
}

// "Textiles" · "Textiles and IT Services" · "Textiles, IT Services and 2 more"
function humanList(values: string[]): string {
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, 2).join(", ")} and ${values.length - 2} more`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
