/**
 * Maps the messy raw headers from the organizer's registration form (observed
 * as a Google Form export — see SCREENS.md Screen 3.3) onto Evento's fields.
 * Keyword-matched rather than exact-string-matched so it also tolerates a
 * simpler hand-authored CSV with plain headers like "Name"/"Email"/"Phone".
 */
export interface ColumnMapping {
  nameIdx: number;
  emailIdx: number;
  altEmailIdx: number | null; // present when the form had two Email Address columns
  phoneIdx: number;
  businessIdx: number;
  chapterIdx: number | null;
}

export class ColumnMappingError extends Error {}

function indicesWhere(headers: string[], predicate: (h: string) => boolean): number[] {
  return headers
    .map((h, i) => ({ h: h.toLowerCase(), i }))
    .filter(({ h }) => predicate(h))
    .map(({ i }) => i);
}

export function mapColumns(headers: string[]): ColumnMapping {
  const emailIdxs = indicesWhere(headers, (h) => h.includes("email"));
  const phoneIdxs = indicesWhere(headers, (h) => h.includes("phone"));
  const businessIdxs = indicesWhere(headers, (h) => h.includes("business") || h.includes("profession"));
  const chapterIdxs = indicesWhere(headers, (h) => h.includes("chapter"));
  const nameIdxs = indicesWhere(
    headers,
    (h) => h.includes("name") && !h.includes("business") && !h.includes("profession") && !h.includes("chapter"),
  );

  if (emailIdxs.length === 0) throw new ColumnMappingError("No email column found");
  if (phoneIdxs.length === 0) throw new ColumnMappingError("No phone column found");
  if (businessIdxs.length === 0) throw new ColumnMappingError("No business/profession column found");
  if (nameIdxs.length === 0) throw new ColumnMappingError("No name column found");

  // Google Forms puts the account-captured "Email Address" first and the
  // form-question one later — the later one is what the attendee actually
  // typed, so it's canonical (see SCREENS.md Screen 3.3 and PRD_v1.md US1.1).
  const emailIdx = emailIdxs[emailIdxs.length - 1];
  const altEmailIdx = emailIdxs.length > 1 ? emailIdxs[0] : null;

  return {
    nameIdx: nameIdxs[0],
    emailIdx,
    altEmailIdx,
    phoneIdx: phoneIdxs[0],
    businessIdx: businessIdxs[0],
    chapterIdx: chapterIdxs.length > 0 ? chapterIdxs[0] : null,
  };
}
