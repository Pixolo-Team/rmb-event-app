# EVENTO — Feature Breakdown

A build-oriented breakdown of the platform derived from [`PRD_v1.md`](./PRD_v1.md). Where the PRD describes user stories and acceptance criteria, this document answers a different question: **what are the discrete features, how do they group into modules, what depends on what, and what order should they get built in** given the pilot's under-1-month timeline.

Priority labels (P0/P1/P2) are a build-sequencing judgment call layered on top of the PRD — every feature below is in scope for the pilot MVP per the PRD's Summary of Scope. P0 marks the core loop the event cannot run without; P1 is important but the pilot survives in a degraded form without it; P2 enhances the experience and is safe to cut first under time pressure.

Cross-references to `SCREENS.md` use its module numbers (Module 1: Pre-Event Onboarding, Module 2: Attendee App, Module 3: Admin Dashboard, Module 4: Error/Edge States, Module 5: Notifications).

---

## Platform Map

Evento is three surfaces sharing one backend:

| Surface | Users | Core job |
|---|---|---|
| **Attendee PWA** | Radha (attendee) | Get checked in, find the right people, log meetings, leave with a usable contact list |
| **Admin Dashboard** | Harish (organizer) | Import attendees, watch the event happen live, clean up the feed, export results |
| **Staff Console** (subset of Admin, tablet) | Priya (event staff) | Manual check-in / QR fallback when an attendee's phone can't do the job |

---

## Feature Map

| # | Feature | Module | Priority | Works Offline | Depends On |
|---|---|---|---|---|---|
| F1 | Attendee Import & Onboarding | Admin + Pre-event web form | P0 | No (needs connectivity to import/send/submit) | — |
| F2 | Smart Attendee Matching | Attendee App | P1 | Yes (pre-computed, cached) | F1 |
| F3 | Attendance & Check-In | Attendee App + Admin + Staff | P0 | Partial (check-in recorded locally, synced later) | F1 |
| F4 | Digital Business Card Exchange & Met Detection | Attendee App | P0 | Yes (scan queued, synced later) | F1, F3 |
| F5 | Bookmark & Interactions | Attendee App | P1 | Yes (synced later) | F2 |
| F6 | Gamification — Leaderboard | Attendee App + Admin (venue screen) | P1 | Read: yes (cached) · Write: no (needs server aggregation) | F4 |
| F7 | Event Photo Feed | Attendee App + Admin (moderation) | P2 | Read: yes (cached) · Write: no | F3 |
| F8 | Feedback & Review | Attendee App + Admin | P1 | No (non-blocking submit) | F3 |
| F9 | Event Summary & Post-Event Follow-Up | Attendee App | P1 | Partial (summary cached; follow-up nudge is a manual admin group post) | F4, F6 |
| F10 | Save as Contact (vCard) | Attendee App | P2 | Yes (fully client-side) | F4 |
| F11 | Analytics (Attendee + Admin) | Attendee App + Admin | P1 | Attendee: cached stats · Admin: no (live dashboard) | F3, F4, F6, F8 |
| — | **Platform Foundations** (PWA/offline, security, magic-link auth) | Cross-cutting | P0 | — | — |

---

## Platform Foundations (Cross-Cutting)

Not a user-facing "feature," but the substrate every feature above is built on. Underestimating this is the single biggest risk to the 1-month timeline.

- **PWA shell** — installable, offline-first service worker, <500KB initial bundle, works on older/budget Android browsers with an "Add to home screen" fallback where native install isn't supported.
- **Offline sync engine** — local write queue (IndexedDB) for check-ins, scans, bookmarks, feedback, photo uploads; automatic silent sync on reconnect; server-side idempotency so replayed syncs never double-count.
- **No WhatsApp messaging integration** — there is no WhatsApp Business API / vendor for the pilot. The onboarding invite (Day -5), reminder (Day -1), and post-event follow-up (Day +1) are **manual admin posts of a generic app link in the attendee WhatsApp group**. Attendee-initiated WhatsApp actions in-app (message a connection, share summary) use plain `wa.me` deep links, which need no vendor. No in-app chat.
- **Auth & session** — no passwords, anywhere for attendees. The **email magic link is the single login mechanism for both first-time sign-up and returning re-entry**: attendee opens the (generic, tokenless) group link, enters their email → single-use, 30-minute signed token emailed to the address on file → tapping it establishes the session; first-timers are routed to profile setup, returners to Home. Same neutral "if that's on the list, we sent it" response and rate limiting apply. Security property: the link only ever reaches the email *on file*, never whatever was typed into the form, so entering someone else's email cannot grant access to their account — it just sends them a link. There is no WhatsApp-delivered login link; the only fallback for an attendee with no working email access is staff-assisted lookup (Check-In Management, `SCREENS.md` Screen 3.4). See `SCREENS.md` Screen 2.0 for the full flow. Admin login stays separate: password-protected with a 30-minute idle timeout.
- **QR signing** — every personal QR is a signed, opaque, non-sequential token; scanning verifies the signature server-side before any exchange or meeting-log write happens.
- **Rate limiting, CORS, input validation, CSRF** — standard API hardening per the PRD's Security & Privacy section.

Build this before, or in lockstep with, F1 — every other feature assumes it exists.

---

## F1 — Attendee Import & Onboarding
**Priority: P0** · Module 1 (Pre-Event Onboarding) + Module 3 (Admin)

The entry point. Nothing else in the platform has data to work with until this runs.

**Sub-features**
- CSV/Excel bulk import from the organizer's registration form (name, email, phone, business/profession name all required; RMB chapter and photo optional) with column-mapping from the raw Google Form-style headers, plus dedup by phone *and* email
- Payment (₹4,000 registration fee, screenshot + amount) is captured by the organizer's registration form but is **explicitly out of scope for Evento** — the import assumes every row is already a confirmed, paid attendee; Evento's schema has no payment fields and performs no verification
- Auto-generated unique signed QR per attendee at import time
- Import result reporting (success count, duplicates skipped, row-level errors, rows flagged for manual review e.g. mismatched email columns) with retry-on-failure
- Sign-up distribution is manual: admin posts one generic app link in the attendee WhatsApp group (Day -5); attendees enter via email magic link — no personalized invite links, no system sends
- Mobile web profile form (no install required): name/email/phone/business/chapter/photo pre-filled read-only from registration; attendee fills business category, city, looking-for (multi-select dropdown), offering (multi-select dropdown, shared business-type taxonomy with looking-for), goals, optional bio — target completion time under a minute (city/category are pre-filled instead if the import file carried them)
- PWA install prompt with Install Now / Install Later / Skip, profile persists regardless of choice
- First-open 60-second skippable tutorial, re-accessible from settings later
- Day -1 reminder is a manual admin group post; pre-computed match cache push (see F2)

**Depends on:** Platform Foundations (email magic-link auth)
**Feeds into:** every other feature — this is where attendee records, QR codes, and profile tags originate

---

## F2 — Smart Attendee Matching
**Priority: P1** · Module 2 (Attendee App)

Rule-based relevance ranking so Radha isn't scrolling 200 names to find the 10 worth her time.

**Sub-features**
- Match scoring: overlap between "looking for" tags and others' "offering" tags, plus shared business category
- RMB chapter as a matching signal, not a relevance filter: cross-chapter matches are surfaced deliberately (same-chapter members mostly know each other already; the event's value is expanding beyond one's own chapter), and the match reason line states the chapter relationship either way — "You're both Manufacturers — she's from the Surat chapter" (cross-chapter) vs. "You're both in the Ahmedabad chapter" (same-chapter). Non-RMBians (no chapter) match on business category/tags only.
- Ranked "People to Meet" list (top 10 surfaced, full list scrollable) with a one-line human-readable match reason per card
- Fallback state when no strong matches exist → route to full directory
- Full directory browse: filter by business category/city/company/chapter (including a "no chapter" bucket)/checked-in status, search by name/company, sort by match score / alphabetical / random
- Client-side matching engine, decoupled from the profile schema, so it can be swapped for semantic/AI matching in Phase 2 without touching profile data
- Pre-computation on Day -3 server-side, cached to device for offline access at the venue

**Depends on:** F1 (profile tags must exist)
**Design note:** matching logic must live in its own service module — this is a stated non-functional requirement (`matching.service.ts`), not just an implementation detail, because Phase 2 swaps the algorithm without rewriting the profile schema.

---

## F3 — Attendance & Check-In
**Priority: P0** · Module 2 (Attendee App) + Module 3 (Admin) — the gating event of event day

**Sub-features**
- Silent geolocation auto-check-in on app open (5s timeout, organizer-configured venue radius, default 500m)
- Manual "Check In" fallback button when auto-check-in fails or is skipped, with retry on network error
- Staff-assisted check-in via QR scan at the desk (works offline, syncs later) — the fallback for phones that can't self-check-in
- Printed badge QR as the fallback-of-the-fallback for dead/lost/incompatible phones — badge carries the attendee's name in large type alongside the QR
- Duplicate-checkin protection (server ignores a second check-in same day)
- Admin venue configuration: lat/long + radius, with validation (lat ±90, long ±180, radius 100–5000m)
- Admin live check-in dashboard: running counter ("142 of 200"), breakdown by method (geolocation / manual / staff QR), checked-in vs. not-yet list, copyable straggler list so the admin can nudge them manually in the WhatsApp group

**Depends on:** F1 (attendee + QR must exist)
**Feeds into:** F4 (meetings only make sense for present attendees), F6/F11 (analytics baseline)

---

## F4 — Digital Business Card Exchange & "Met" Detection
**Priority: P0** · Module 2 (Attendee App) — this is the product's core loop

**Sub-features**
- Own-QR display: the attendee's personal QR sits at the **top of their Profile screen** (first thing visible), rendered offline from cache, with their name below it; tap to enlarge full-screen with boosted brightness — this is the "scan me" half of the exchange
- Unified QR scan: one scan simultaneously (a) exchanges profile/contact details both ways and (b) logs a confirmed, timestamped meeting
- Success confirmation with the other attendee's name/company and a "View profile" deep link
- Duplicate-pair protection — rescanning the same two people doesn't double-log the meeting or the leaderboard point, with a clear "You've already met X" message
- Graceful QR-decode failure state, with a printed-badge fallback path
- "My Connections" view: everyone met or bookmarked, sortable by met-date/bookmark, each card showing name/company/phone/bio/table, action row (Call, WhatsApp, Save to contacts, Remove), plus a private note field per connection
- Fully offline-capable: scans queue locally and sync silently on reconnect

**Depends on:** F1 (QR codes), F3 (conceptually — you scan people who are at the event)
**Feeds into:** F5 (bookmarks live alongside "met" in the same view), F6 (each confirmed meeting = 1 leaderboard point), F9 (summary is built from this data), F10 (vCard export source)

---

## F5 — Bookmark & Interactions
**Priority: P1** · Module 2 (Attendee App)

A lightweight planning layer on top of the directory — "I haven't met them yet, but I want to."

**Sub-features**
- One-tap bookmark/unbookmark from any directory or match card
- "My Connections" split into two clear sections/tabs: **Want to meet** (bookmarked, unmet) and **Already met** (confirmed scans), each with a count badge
- Visual distinction between the two states on shared card components
- Offline bookmarking, synced when back online

**Depends on:** F2 (bookmarking mainly happens off the match/directory list)
**Shares UI with:** F4's "My Connections" view — these are two tabs of one screen, not two screens

---

## F6 — Gamification: Met Counter & Leaderboard
**Priority: P1** · Module 2 (Attendee App) + venue display + Module 3 (Admin)

**Sub-features**
- +1 point per confirmed, non-duplicate meeting (see F4's duplicate protection — this is where it actually matters)
- Live top-20 leaderboard on a venue display screen, refreshed every 5–10s (not per-scan, to avoid flicker)
- Personal stat surfaced prominently ("You've met 5 people · Rank 12th"), tappable to open the full board, with the attendee's own row highlighted
- Mobile-optimized version of the same leaderboard, checkable from any attendee's phone
- Cached/offline read of last-known stats; live updates require connectivity
- Explicitly no tiered badges or sponsor prizes in this pilot (Phase 2)

**Depends on:** F4 (leaderboard is a read-aggregate over meeting records)
**Feeds into:** F9 (rank appears in the post-event summary), F11 (admin analytics)

---

## F7 — Event Photo Feed
**Priority: P2** · Module 2 (Attendee App) + Module 3 (Admin moderation)

Explicitly framed in the PRD as secondary engagement, not core to the networking loop — first to trim if the timeline tightens.

**Sub-features**
- Post flow: camera or library photo, basic edit (crop/brightness/filter), caption up to 200 chars with emoji support
- Chronological feed: name, company, photo, caption, timestamp, like count, tap-to-enlarge with full caption + comments
- Simple flat comments (name + message, no threads)
- Self-serve delete of own posts
- Admin moderation: view-all + instant delete, no formal review queue, deleted-post history log for the organizer's own reference
- Unmoderated by default for the pilot — no pre-publish approval step
- Cached feed for offline viewing; posting/new content requires connectivity

**Depends on:** F3 (posting implies you're at the event)

---

## F8 — Feedback & Review
**Priority: P1** · Module 2 (Attendee App) + Module 3 (Admin)

Directly answers the PRD's open "how do we know the pilot succeeded" question — this is the instrumentation for that decision.

**Sub-features**
- End-of-event prompt: 5-star rating + optional comment (500 char max), skippable, triggered at a scheduled time or manually by the organizer
- Non-blocking submit — a failed submission never hangs the app
- Admin feedback dashboard: average rating, ratings distribution, all comments (searchable/sortable), total response count, CSV export

**Depends on:** F3 (needs attendees to have actually attended)
**Feeds into:** F11 (rolls into admin analytics)

---

## F9 — Event Summary & Post-Event Follow-Up
**Priority: P1** · Module 2 (Attendee App) — the "leave with something" promise

**Sub-features**
- Post-event summary screen: people met, cards collected, leaderboard rank, top 5 connections with contact details
- "View all connections" and "Download connections" (CSV or vCard) actions, plus WhatsApp share of the summary
- Day+1 follow-up is a manual admin post in the WhatsApp group linking back to the app; each attendee sees their own summary after login — the summary screen persists in-app as the primary follow-up surface
- Explicitly no in-app chat or AI conversation starters in this pilot — follow-up happens over WhatsApp or in person

**Depends on:** F4 (connections data), F6 (rank)

---

## F10 — Save as Contact (vCard)
**Priority: P2** · Module 2 (Attendee App)

A small, self-contained utility feature layered on top of F4/F5's connection data.

**Sub-features**
- One-tap vCard (.vcf) generation per connection: name, company, phone, email if available
- Hand-off to the native contact picker / auto-import
- "Contact exists — update?" conflict handling
- Success confirmation naming the saved contact

**Depends on:** F4 (needs a connection record to export)

---

## F11 — Analytics (Attendee-Facing & Admin-Facing)
**Priority: P1** · Module 2 (Attendee App) + Module 3 (Admin) — the rollup layer over F3/F4/F6/F8

**Sub-features**
- Attendee personal stats: people met, leaderboard rank, bookmarks count, photos posted, time at event — live-updating, cached offline
- Admin event-health dashboard: check-ins vs. expected, total meetings logged, average meetings/attendee, top-20 leaderboard, feed activity, feedback scores, engagement rates (% opened app / % scanned / % posted)
- Time-series charts: check-ins over time, meetings over time
- CSV/PDF export for stakeholder/sponsor reporting
- Responsive enough to run on a laptop or tablet at the venue — this is explicitly *not* meant to be a full BI tool

**Depends on:** F3, F4, F6, F8 (this feature has no data of its own — it's a view over everything else)

---

## Suggested Build Sequence

Given the "under 1 month, tight MVP" constraint from the PRD, features gate each other more than the numbering suggests. A defensible build order:

1. **Platform Foundations** — PWA shell, offline sync engine, auth, QR signing (nothing else is testable without this)
2. **F1** Attendee Import & Onboarding (need attendees + QR codes to build anything downstream)
3. **F3** Attendance & Check-In (the first real on-device offline flow — validates the sync engine early)
4. **F4** Digital Business Card Exchange & Met Detection (the core loop — get this rock-solid before layering gamification on top)
5. **F6** Leaderboard (thin layer over F4's data, high visible payoff for a pilot demo)
6. **F2** Smart Matching + **F5** Bookmarks (can be built in parallel once F1's profile data and F4's card UI exist)
7. **F11** Analytics + **F8** Feedback (organizer-facing instrumentation — needed before event day, not on it)
8. **F9** Summary & Follow-Up + **F10** Save as Contact (post-event value, lowest risk to slip)
9. **F7** Photo Feed (cut first if the timeline slips — PRD itself frames this as secondary engagement)

---

## Explicitly Out of Scope (Phase 2)

Deferred per the PRD, listed here only so they aren't accidentally scoped into a pilot feature: multi-tenant/multi-event platform, in-app chat, AI/semantic matching, NFC/proximity auto-detection, tiered badges & sponsor prizes, AI-generated conversation starters, multi-language UI, native iOS/Android apps, interactive venue maps, real-time session scheduling, live polling & Q&A.

---

**Source:** [`PRD_v1.md`](./PRD_v1.md) · **Screen-level detail:** [`SCREENS.md`](./SCREENS.md) · **Visual system:** [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)
