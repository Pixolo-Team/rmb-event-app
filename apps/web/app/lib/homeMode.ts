// F3.6 — which of Home's four modes to render (PRD US3.5, SCREENS 2.1).
//
// Kept out of the component and free of React/fetch so the rules are readable in
// one place and testable without a DOM: every branch here is a decision about
// *time*, and time is the thing that's awkward to reproduce by hand in a browser.
export type HomeMode = "pre_event" | "arrival" | "dashboard" | "ended";

export type EventWindow = {
  startAt?: string | null;
  endAt?: string | null;
};

function parse(value?: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Chosen from cached data so it still resolves offline — deciding this
 * server-side would strand the attendee on a spinner exactly when connectivity
 * is worst (PRD US3.5).
 *
 * When the organizer hasn't configured start/end times we deliberately fall
 * through to the arrival flow rather than guess: a countdown to an unknown date
 * is worse than the check-in screen that shipped today.
 */
export function resolveHomeMode(event: EventWindow | null, checkedIn: boolean, now: number): HomeMode {
  const startAt = parse(event?.startAt);
  const endAt = parse(event?.endAt);

  // Ended wins over everything, including a still-unchecked-in attendee: once the
  // event is over, offering a check-in button is a dead end.
  if (endAt !== null && now >= endAt) return "ended";

  // Only claim "pre-event" when we actually know the start time. Without it the
  // old behaviour (locate → check in) is the safer default.
  if (startAt !== null && now < startAt) return "pre_event";

  return checkedIn ? "dashboard" : "arrival";
}
