# EVENTO — Feature Breakdown

A build-oriented breakdown of the platform derived from [`PRD_v1.md`](./PRD_v1.md). Where the PRD describes user stories and acceptance criteria, this document answers a different question: **what are the discrete, independently-shippable features, how do they group and depend on each other, and what order should they get built in** given the pilot's under-1-month timeline.

**Granularity rule:** every row in the Feature Index below is sized to be *one* build unit — roughly one screen (or one backend job with no screen) plus the endpoint(s) it needs. Nothing bundles unrelated screens together the way the old `F1`/`F3`/etc. epics used to (e.g. Login used to be buried inside "Attendee Import & Onboarding" alongside CSV import and the PWA prompt — it's now its own line). The goal: picking up one row should mean a fast, complete, demoable unit of output, not a multi-day slice of a bigger epic.

The original `F1`–`F11` epic numbers from the PRD are kept as **group headers** for traceability back to `PRD_v1.md`'s "Feature 1" .. "Feature 11" sections — each epic is now broken into `F<epic>.<n>` sub-features.

Priority labels (P0/P1/P2) are a build-sequencing judgment call — every feature below is in scope for the pilot MVP per the PRD's Summary of Scope. P0 marks the core loop the event cannot run without; P1 is important but the pilot survives in a degraded form without it; P2 enhances the experience and is safe to cut first under time pressure.

Cross-references to `SCREENS.md` use its module/screen numbers (Module 1: Pre-Event Onboarding, Module 2: Attendee App, Module 3: Admin Dashboard, Module 4: Error/Edge States, Module 5: Notifications).

**Status** reflects the actual repo, not the plan — see [`README.md`](../README.md)'s "What's real vs. stubbed" table for the authoritative source; this doc is updated to match it.

---

## Platform Map

Evento is three surfaces sharing one backend:

| Surface | Users | Core job |
|---|---|---|
| **Attendee PWA** | Radha (attendee) | Get checked in, find the right people, log meetings, leave with a usable contact list |
| **Admin Dashboard** | Harish (organizer) | Import attendees, watch the event happen live, clean up the feed, export results |
| **Staff Console** (subset of Admin, tablet) | Priya (event staff) | Manual check-in / QR fallback when an attendee's phone can't do the job |

---

## Feature Index

Every buildable unit, in dependency order within each group. **Status:** ✅ Done · 🟡 Partial · ⬜ Not started.

### Platform Foundations (cross-cutting — build before, or in lockstep with, F1)

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| PF1 | PWA shell & installability (manifest, icon, service worker, install-prompt wiring) | — | P0 | Yes (shell) | — | ✅ Done |
| PF2 | Auth — email magic link, explicit unknown-email recovery, cache-first/server-authoritative Login routing, request/verify and session cookie | Screen 2.0 | P0 | No | — | ✅ Done |
| PF3 | Admin login (password + session, 30-min idle timeout) | Screen 3.1 | P0 | No | — | ✅ Done |
| PF4 | Offline sync engine — IndexedDB write queue + background sync | — | P0 | Yes | PF1 | ✅ Done |
| PF5 | QR signing & verification (shared utility — signed opaque JWT payload, server-side verify) | — | P0 | — | — | ⬜ Not started |
| PF6 | API hardening — rate limiting, CORS, input validation, CSRF (currently only on auth endpoints) | — | P0 | — | — | ✅ Done |
| PF7 | Authenticated attendee navigation shell — **bottom tab bar (primary) + side-menu drawer (secondary)**, identity header, active state, auth/onboarding visibility gate, accessible close/back behavior, shared route inventory | All attendee screens | P0 | Yes (shell) | PF1, PF2 | 🟡 Partial |
| PF8 | Database-backed reference data — business categories, category-dependent offerings, nationwide Indian cities with state/UT labels, active/sort controls, and Chapter options | Screen 1.1, Directory filters | P0 | Cacheable | F1.2 | ✅ Done |

**PF3 build notes:**
- A single shared organizer credential (`ADMIN_USERNAME` / `ADMIN_PASSWORD` from env; dev falls back to `admin` / `evento-admin`, and production refuses to start the login flow without an explicit `ADMIN_PASSWORD`). Password comparison is constant-time. This is intentionally a single login for the pilot's one organizer — not per-user admin accounts (Phase 2).
- Separate admin session from the attendee session: its own JWT cookie (`evento_admin_session`, httpOnly/sameSite-lax/secure-in-prod) signed with a **30-minute expiry**. `AdminGuard` re-issues a fresh 30-minute cookie on every authenticated admin request, so the window is a **sliding idle timeout** — 30 minutes of inactivity logs the organizer out, but active use never expires. `AdminAuthModule` is `@Global`, exporting `AdminGuard`/`AdminSessionService` so any admin controller can gate itself.
- Every `/admin/*` API route is now behind `AdminGuard`: `admin/import` (F1.1), `admin/attendees`, `admin/event` (F3.1), `admin/checkin/*` (F3.4 staff scan + dashboard), `admin/photos` (F7.3), `admin/feedback` (F8.2). The attendee-facing routes those features share are unaffected. `POST /admin/auth/login`, `POST /admin/auth/logout` and the guard-protected `GET /admin/auth/me` (used by the web gate) are the only ungated/self-gating admin endpoints.
- Failed logins are rate-limited per IP (reusing `RateLimiterService`): after too many failures the endpoint returns `429` and the screen shows "Too many failed attempts. Try again later.", matching Screen 3.1's Account-Locked state. A wrong password returns `401` "Invalid credentials. Try again."
- Web: a shared client `AdminGate` wraps both admin route groups (`app/admin/*` and `app/(admin)/admin/*`) via their layouts — it checks `GET /api/admin/auth/me`, redirects to `/admin/login` on `401`, and lets the login route through. `/admin/login` (Screen 3.1) has username/password fields, a masked password, Caps-Lock warning, offline handling, loading spinner, and skips straight to the hub if a session is already active. A new `/admin` hub is the post-login landing, linking the admin tools with a Sign out action.

**PF7 build notes:**
- Implemented on Home: authenticated-only drawer, attendee identity with initials fallback, flat finalized inventory, active Home state, focus trap, Escape/backdrop/browser-Back close, scroll lock and working Sign Out.
- Public login/magic-link pages and focused onboarding do not render the menu. Planned destinations appear disabled with a **Soon** label only in local development; production hides them until their owning feature ships.
- Attendee Directory is now a working production destination; `/attendees/[id]` preserves its active navigation state.
- Remaining before ✅: move the header/drawer into a shared authenticated route-group layout, register real routes as F2/F4/F6 ship, and complete 360/428/768px device verification.

> ### ⚠️ Navigation model reversed (UX revision — supersedes the drawer-only decision)
> **The pilot now uses a persistent bottom tab bar for primary destinations, plus the drawer for secondary ones.** This **reverses** the previously-recorded decision ("no persistent attendee bottom-tab bar in the pilot") documented in `PRD_v1.md` US12.1, `DEVELOPMENT_PLAN.md` → Attendee Navigation, `SCREENS.md` and the PF7 note above. Those documents are updated to match.
>
> **Why the reversal:** the original rationale was that two navigation systems duplicate destinations and cost vertical space. The revision accepts that cost: bottom tabs are the current convention for this app category, and the four primary destinations are used constantly during the event, where a two-tap drawer is friction at exactly the wrong moment. The drawer survives for lower-frequency destinations, so nothing is duplicated across both systems — **each destination lives in exactly one place.**
>
> - **Bottom tabs (primary, always visible when authenticated):** Home · People · Want to Meet · Profile
> - **Drawer (secondary):** Feed, Gallery, Leaderboard, Event Summary, Show My QR, Give Feedback, then separated Sign Out. Feedback is intentionally last.
> - **Header:** current route title is centered dynamically; page bodies do not repeat screen titles. Active drawer rows cover exact, nested and declared query routes.
> - **Scan QR:** proposed as a **center FAB in the tab bar** — it is the product's core loop (F4.2) and deserves to be one tap away. *This one is my recommendation, not yet confirmed — it was left open in review.*
> - Tabs never render on login/magic-link/onboarding, mirroring the drawer's existing visibility gate.
> - **Home is not being replaced by Posts.** Home remains a dashboard of important, at-a-glance data (see F3.6) — the Event Photo feed (F7) is deprioritized and may not ship.

**PF8 build notes:**
- Added normalized, active/sortable database reference tables for business categories and cities; Chapter received the same active/sort controls.
- Seeded a broad Indian city catalogue spanning states and union territories. The profile city field provides searchable browser suggestions labelled `City, State/UT`.
- Profile options are read from the database and profile writes validate the submitted category and city against active records. Existing unambiguous city values are normalized during migration; unmatched imported values remain valid legacy options.
- Added `OfferingOption` with category ownership, active/sort controls and uniqueness within a category. The Technology seed contains 14 offerings; the onboarding API groups active offerings by category.
- Directory filter facets for business category, city, and chapter are sourced directly from the same active reference tables, independent of how many attendee cards are returned. Company remains attendee-derived.

**PF4 build notes:**
- Implemented client-side only, per the architecture note in `DEVELOPMENT_PLAN.md` ("offline-first is a client concern, not a backend one"): a small Dexie (IndexedDB) write queue (`apps/web/app/lib/offlineQueue.ts`) that queues a POST when it can't reach the server, and replays it on the `online` event / every 15s while online / on next page load. No Background Sync API (spotty cross-browser support, notably Safari) — deliberate, matches the PRD's iOS Safari testing requirement.
- Endpoints are safe to queue because they're already idempotent (F3's check-in endpoints dedupe on `attendeeId`).
- The attendee client also caches the venue's lat/lng/radius (`GET /event`, a new public — non-admin — endpoint) so it can decide "am I in radius" client-side when offline, since the server-side distance check in F3.2 can't be reached without a network round-trip.
- This resolves the offline gap flagged on F3.2/F3.3/F3.4 — see their updated status below.
- Not built: full app-shell/route pre-caching for a cold start while offline (that's a PF1 follow-up, not PF4) — this covers the PRD's actual test scenario ("force airplane mode mid-session"), where the page is already loaded before connectivity drops.

---

### F1 — Attendee Onboarding & Import
*(PRD Feature 1. Depends on: Platform Foundations)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F1.1 | Admin CSV/Excel import + column-mapping UI, dedup by phone+email, per-row result report (success/duplicate/error/flagged), retry-on-failure | Screen 3.3 | P0 | No | PF3 (now wired) | ✅ Done |
| F1.2 | Required three-step Profile Setup — About You/DB City → Business Category/dependent Offering → searchable Looking For/Goals + optional Bio; responsive shell and per-step validation | Screen 1.1 | P0 | No | PF2, PF8 | ✅ Done |
| F1.3 | Responsive PWA install modal — native prompt, Add to Home Screen fallback, Continue without installing, installed-mode detection | Screen 1.2 | P0 | Yes | PF1, F1.2 | ✅ Done |
| F1.4 | Profile-complete screen — animated success tick and adaptive Open App / Install / Continue in browser actions | Screen 1.3 | P2 | Yes | F1.3 | ✅ Done |
| F1.5 | First-time tutorial — removed from the current app pending UX replanning | Screen 2.12 | Deferred | — | F1.4 | ⏸ Replan |

**Install-banner note:** the authenticated shell (`AttendeePageShell`) renders a persistent `InstallBanner` ("Install Evento for quick, full-screen access") for attendees who are on a supported browser, haven't installed, and haven't dismissed it. Because onboarding already offers install (F1.3/F1.4's "Install"/"thanks" steps), completing onboarding pre-sets the banner's dismissed flag (`PWA_BANNER_DISMISSED_KEY`) so the shell banner doesn't immediately repeat the same prompt.

**Feeds into:** every other epic — this is where attendee records, QR codes, and profile tags originate.

---

### F2 — Smart Attendee Matching
*(PRD Feature 2. Depends on: F1.2 — profile tags must exist)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F2.1 | Matching engine service — looking-for/offering overlap + shared business category + same/cross-chapter reasoning, decoupled module (`matching.service.ts`) | — | P1 | — | F1.2 | ✅ Done |
| F2.2 | Day-3 pre-computation job — runs F2.1 server-side, caches results per attendee for offline read | — | P1 | Yes (writes cache) | F2.1 | ✅ Done |
| F2.3 | Pre-event matches & directory (top-10 "People to meet" + fallback to full directory) | Screen 1.4 | P1 | Yes | F2.2 | ✅ Done |
| F2.4 | Directory / all attendees — filters (business category/company/chapter/city/checked-in), search | Screen 2.2 | P1 | Yes | F1.1 | ✅ Done |
| F2.5 | Individual attendee profile — full detail + match-reason display | Screen 2.3 | P1 | Yes | F2.1, F2.4 | ✅ Done |

**Design note:** matching logic must live in its own service module (F2.1) — a stated non-functional requirement, not just tidiness, because Phase 2 swaps the algorithm without rewriting the profile schema.

**F2.4/F2.5 implementation boundary:**
- Routes: authenticated `/directory` and `/attendees/[id]`; API reads: authenticated `GET /attendees` and `GET /attendees/:id`.
- Directory ships with name/company search, business category/company/chapter/city/check-in filters, result count, initials fallback, responsive cards and last-successful-response caching for offline reads. Results are listed alphabetically by name (the earlier user-facing name/company sort control was removed).
- Individual profile ships with registered/profile details, looking-for/offering/goals/bio, check-in state, table number when assigned, Call/WhatsApp actions and offline cache. The signed QR token is never exposed.
- Bookmark controls remain hidden until F5.1 supplies bookmark state/actions. F5-owned bookmark/note actions are deliberately not counted against F2.5 completion.

**F2.1 build notes:**
- The engine is a standalone Nest module (`apps/api/src/matching/`) with no Prisma dependency — `MatchingService.computeMatch(viewer, candidate)` and `rankMatches(viewer, candidates)` take a schema-independent `MatchProfile` and return `{ score, reasons, headline, chapterRelation }`. This satisfies US2.3's decoupling requirement (Phase 2 can swap the algorithm without touching the profile schema) and keeps the functions pure so they can later run client-side for offline matching.
- Rules: looking-for↔offering overlap (both directions), shared business category, and same/cross-chapter reasoning. Cross-chapter is surfaced deliberately (neutral score, names the other chapter); a chapter difference alone is never a match reason. Non-RMBians (no chapter) match on category/tags only, with no chapter clause — per PRD US2.1.
- Reason phrasing uses "they" rather than inferring gendered pronouns from names (the PRD's illustrative "she's from…" becomes "they're in the … chapter").
- F2.2 persists directional top-ten results in `MatchCache`. Authenticated `GET /matches` reads the cache and automatically recomputes it when empty or older than 24 hours; `POST /matches/recompute` and `GET /matches?refresh=1` provide explicit refresh paths.
- F2.3 ships at `/matches`: ranked cards, match explanation, check-in/table context, bookmarks, profile navigation, refresh, empty/error/loading states, directory fallback and last-successful-response caching for offline reads.

**F2.4/F2.5 build notes:**
- F2.4 is complete: protected directory API, self-exclusion, filter facets, responsive cards, search, filter sheet, empty/error/loading/offline states, initials fallback and cached last-successful response (default alphabetical-by-name order; no user-facing sort control). The production menu now enables Attendee Directory.
- F2.5 is complete: protected detail API without `qrToken`, registered/profile fields, check-in/table state, Call/WhatsApp/native Share, tag sections, offline cache and Directory active-state preservation on nested routes — **plus the personalized "Why you're a match" reason** from the F2.1 engine (`GET /attendees/:id` now computes the viewer↔target match server-side and returns `match`, cached per-profile for offline reads; hidden when there's no meaningful match or when viewing your own profile).
- **Action row polish:** the Want-to-meet / Call / WhatsApp / Share buttons are a single cohesive set — icon + label, consistent height/radius, theme-aware (no hardcoded light-mode colours). Want-to-meet is an outlined→brand-filled toggle, Call is the solid brand primary, WhatsApp uses its recognizable green, Share spans full width. Responsive: three-up on wide, stacked on narrow.

---

### F3 — Attendance & Check-In
*(PRD Feature 3. Depends on: F1.1 — attendee + QR must exist. The gating event of event day.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F3.1 | Admin event settings — venue lat/lng/radius config, validated (lat ±90, long ±180, radius 100–5000m) | Screen 3.2A | P0 | No | PF3 | ✅ Done |
| F3.2 | Home/Dashboard — silent geolocation auto-check-in (5s timeout, configured radius) | Screen 2.1 | P0 | Yes (queued via PF4, synced later) | F3.1, F1.1, PF4 | ✅ Done |
| F3.3 | Manual check-in fallback button + retry on network error | Screen 2.1A | P0 | Yes (queued via PF4) | F3.2 | ✅ Done |
| F3.4 | Admin check-in management — staff-assisted QR scan at desk + live dashboard (counter, method breakdown, straggler list) | Screen 3.4 | P0 | Yes (staff scan queued via PF4, syncs later) | F3.1, PF5 | ✅ Done |
| F3.5 | Print badges (QR codes) — the fallback-of-the-fallback for dead/lost phones | Screen 3.7 | P0 | — | PF5 | ✅ Done |

**Feeds into:** F4 (meetings only make sense for present attendees), F6/F11 (analytics baseline).

**Build notes:**
- F3.1–F3.5 are built and working, including offline queuing now that PF4 exists. QR verification (PF5) was folded directly into F3.4/F3.5 rather than built as a separate JWT-signing layer — staff scan and badge printing both use the existing opaque `qrToken` (DB lookup), consistent with how this codebase already handles magic-link/onboarding tokens, so PF5 is effectively covered in practice.
- Admin routes added (`/admin/event`, `/admin/checkin`, `/admin/badges`, `GET /admin/attendees`) are **now gated by PF3** (Admin Login) — every `/admin/*` API route sits behind `AdminGuard`, and the web admin pages behind `AdminGate`.
- **F3.2/F3.3 revised after design feedback:** `/home` is a full-page layout (no floating card — see `globals.css` `.full-page*` classes), responsive from phone to iPad. Geolocation now only *detects* arrival; the attendee taps "Check in" to actually confirm (was silent auto-checkin in the original PRD draft) — see `PRD_v1.md` US3.1's updated acceptance criteria and `SCREENS.md` Screen 2.1 for the reasoning. The confirmed "Checked in" screen is deliberately plain (name, time, method) with no QR code — it's what the attendee shows at the registration counter, not a scannable credential (that's F4's own-QR display, a different screen). Screen 2.1A (manual fallback) is folded into the same full-page flow as a state, not a separate modal/route.

---

### F4 — Digital Business Card Exchange & "Met" Detection
*(PRD Feature 4. Depends on: F1.1 (QR codes), F3 (conceptually — you scan people who are at the event). The product's core loop.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F4.1 | Settings/Profile screen + own-QR display (top of screen, offline-rendered, tap-to-enlarge with brightness boost) | Screen 2.11 | P0 | Yes | PF5, F1.2 | ✅ Done |
| F4.2 | QR scanner & unified exchange — one scan swaps contact details and logs a confirmed meeting, duplicate-pair protection | Screen 2.4 | P0 | Yes (queued, synced) | F4.1, F3.2, PF4 | ✅ Done |
| F4.3 | My Connections — Already Met tab (name/company/phone/bio/table, Call/WhatsApp/Remove actions, private note) | Screen 2.6 (partial) | P0 | Yes | F4.2 | ✅ Done |

**Feeds into:** F5 (bookmarks share this view), F6 (each meeting = 1 leaderboard point), F9 (summary data), F10 (vCard source).

**F4.1 build notes:**
- New `/profile` route (Screen 2.11): the attendee's own QR is the first thing on screen, rendered client-side from their signed `qrToken` via the `qrcode` lib (same lib as F3.5 badges) — no network call, so it works offline. Name + company sit directly below; tapping the code opens a full-screen white view (maximises perceived brightness — web has no screen-brightness API) with the enlarged QR and name. `?qr=1` deep-links straight to the enlarged view (the "Show My QR" menu item).
- `GET /attendees/me` now returns the caller's own `qrToken` (plus lookingFor/offering/goals/bio/tableNumber). This is self-only — `getDirectoryProfile` still strips `qrToken`, so it is never exposed for other attendees.
- Offline: the me-response (incl. token) is cached in localStorage (`apps/web/app/lib/profileCache.ts`). **`AttendeePageShell` was made offline-tolerant** as part of this: an unreachable API (thrown fetch or 5xx via the Next proxy) now falls back to the cached profile instead of redirecting to `/login`; only a real 401/403 signs the attendee out. Verified by stopping the API and reloading `/profile` — the screen and QR still render.
- Profile fields render read-only (registered details); inline editing, notification toggles and the tutorial re-launch (Screen 2.11's other elements) are deferred — F1.5 owns the tutorial, and edit/notifications aren't pilot-critical. Menu now enables **My Profile** and **Show My QR**.
- Not built here: the exchange/scan itself (F4.2) and My Connections (F4.3). This was built incrementally, F4.1 first.

**F4.2 build notes:**
- New `Meeting` model (migration `add_meeting`): a confirmed meeting stored as a **canonical unordered attendee pair** (the service sorts the two ids before writing). The `@@unique([attendeeAId, attendeeBId])` constraint *is* the duplicate-pair protection — a second scan in **either** direction hits the constraint and returns `already_met` instead of creating a second row. `scannedById` is kept for audit/analytics.
- `POST /meetings/scan { qrToken }` ([meetings.service.ts](../apps/api/src/meetings/meetings.service.ts)) resolves the target by `qrToken`, guards self-scan (`self`) and unknown codes (`not_found`), and upserts the pair — returning `met` / `already_met` with the target's card (name + company). It's idempotent, so it's safe to replay from the PF4 offline queue (new `meeting-scan` queue kind).
- `/scan` screen (Screen 2.4): live `html5-qrcode` camera scanner (same lib as the F3.4 staff scanner), with result cards for met / already-met / self / not-found / camera-unavailable / saved-offline, and View profile / Scan next actions. Entry points: a **Scan a Code** menu item and a **Scan to connect** button on the checked-in Home screen.
- **Verified:** all four API outcomes + bidirectional dedupe (curl + DB row count stays 1); the offline path end-to-end (queued a `meeting-scan`, fired `online`, the meeting was created and the queue drained to 0); page render + graceful camera-unavailable state (the preview browser can't grant a camera, so the camera-driven success card was verified at the API layer, not on-screen).
- The "exchange" is realised by the `Meeting` link — both parties surface in each other's F4.3 connections. Optional scanner extras (torch, flip camera, upload-QR-from-gallery fallback) are not included.

**F4.3 build notes:**
- New authenticated `GET /attendees/me/connections` read and `/connections` screen show confirmed meetings newest-first or alphabetically, with name, company, phone actions, business category, bio, table number and meeting time.
- Connections are cached locally for offline reads. Private notes are stored per side of the meeting; hiding a connection is also per-attendee, preserving the confirmed meeting and leaderboard/analytics history.
- Call, WhatsApp, private-note and Remove actions ship here. Native Save to Contacts remains F10.1, while bookmarks and the enabled Want to Meet tab remain F5.

---

### F5 — Bookmark & Interactions
*(PRD Feature 5. Depends on: F2 — bookmarking mainly happens off the match/directory list.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F5.1 | One-tap bookmark/unbookmark from any directory or match card | Directory/Match cards | P1 | Yes (synced later) | F2.3, F2.4 | ✅ Done |
| F5.2 | My Connections — Want to Meet tab (completes the two-tab screen alongside F4.3) | Screen 2.6 (complete) | P1 | Yes | F5.1, F4.3 | ✅ Done |

**F5 build notes:**
- Directory cards and attendee profiles expose the same optimistic bookmark control, backed by explicit idempotent add/remove endpoints. Network failures queue the intended final state for safe replay.
- My Connections now has functional Already Met and Want to Meet tabs. Saved attendees retain direct Call/WhatsApp actions and can be removed in place; the last successful combined result remains available offline.

---

### F6 — Gamification: Met Counter & Leaderboard
*(PRD Feature 6. Depends on: F4 — leaderboard is a read-aggregate over meeting records.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F6.1 | Leaderboard aggregate endpoint + polling (top 20 + own rank, 5–10s refresh, no per-scan flicker) | — | P1 | Read: yes | F4.2 | ✅ Done |
| F6.2 | Mobile leaderboard screen (personal stat, tap to expand, own row highlighted) | Screen 2.5 | P1 | Read: yes | F6.1 | ✅ Done |
| F6.3 | Venue display leaderboard view (public screen, no login) | — | P1 | Read: yes | F6.1 | ✅ Done |

**Feeds into:** F9 (rank in summary), F11 (admin analytics). No tiered badges/sponsor prizes in this pilot (Phase 2).

**F6 build notes:**
- `GET /leaderboard` returns the authenticated attendee's rank plus the top 20; `GET /leaderboard/venue` is a deliberately public, contact-free display endpoint. Both aggregate confirmed `Meeting` pairs over checked-in attendees and share a five-second server cache.
- Ties share a rank and are ordered alphabetically. The mobile `/leaderboard` screen highlights the caller, caches the last successful response for offline viewing, refreshes every 10 seconds and provides a manual refresh action.
- `/leaderboard/venue` is a responsive large-display surface with the top 20, check-in count and 10-second polling. Design-system marigold is reserved for the podium/gamification treatment; ordinary rows and the attendee's own row retain the brand-blue language.

---

### F7 — Event Photo Feed
*(PRD Feature 7. Depends on: F3 — posting implies you're at the event. Secondary engagement — first to trim under time pressure.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F7.1 | Carousel post — library multi-select (up to 6), preview grid, aggregate upload progress, one shared caption (200 chars) | Screen 2.7 | P2 | No | F3.2 | ✅ Done |
| F7.2 | Event photo feed — chronological view, like, flat comments, self-serve delete | Screen 2.8 | P2 | Read: yes | F7.1 | ✅ Done |
| F7.3 | Admin feed moderation — view-all, instant delete, deleted-post history log | Screen 3.5 | P2 | No | F7.2 | ✅ Done |

**F7 build notes:**
- `/feed` is an authenticated attendee route linked from the shared navigation. It loads newest-first with pagination, likes, flat comments, full-screen viewing and owner-only deletion.
- The `/tutorial` route and tutorial entry points are removed from the current app pending UX replanning. After onboarding, attendees proceed directly to Home; Feed/posting is introduced contextually on `/feed`.
- Feed begins with a persistent LinkedIn-style composer (identity, **Start a post**, and **Photo**) followed by posts or the empty-state message. Both entry controls open the photo/caption modal. Uploads include the shared CSRF token.
- `/gallery` is the browse-only visual grid; creation remains centralized in Feed. Development-only `?preview=1` data uses bundled event images and never writes to Supabase.
- The composer accepts up to six library images and a 200-character shared caption. The API stores them atomically as one post with ordered media URLs; existing one-image records remain compatible. Feed renders a carousel, one-line caption with Read more, compact Like/Comment icon actions, collapsed comments, and an icon-only comment send action.
- `/admin/feed` provides organizer-wide moderation and the API records deleted-post history.

---

### F8 — Feedback & Review
*(PRD Feature 8. Depends on: F3 — needs attendees to have actually attended.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F8.1 | Feedback form — 5-star + optional comment (500 chars), skippable, non-blocking submit | Screen 2.9 | P1 | No | F3.2 | ✅ Done |
| F8.2 | Admin feedback analytics — avg rating, distribution, searchable comments, CSV export | Screen 3.6 | P1 | No | F8.1 | ✅ Done |

**F8 build notes:**
- Authenticated `POST /feedback` validates a required 1–5 rating and optional 500-character comment; repeat submissions are retained as separate responses. `/feedback` provides keyboard-accessible rating controls, skip, retry and confirmation flows.
- `/admin/feedback` shows average, response count, five-to-one distribution, searchable comments and rating filtering. `GET /admin/feedback/export` produces the full CSV server-side. This admin route must be placed behind PF3 when admin authentication lands.

**Feeds into:** F11 (rolls into admin analytics).

---

### F9 — Event Summary & Post-Event Follow-Up
*(PRD Feature 9. Depends on: F4 (connections data), F6 (rank). The "leave with something" promise.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F9.1 | Event summary screen — people met, cards collected, rank, top 5 connections | Screen 2.10 | P1 | Partial (cached) | F4.3, F6.1 | ✅ Done |
| F9.2 | Connections export API (CSV/vCard); intentionally not surfaced in the streamlined Summary UI | API capability | P1 | No | F9.1 | ✅ Done |

**F9 build notes:**
- Authenticated `GET /attendees/me/summary` aggregates confirmed meetings, visible collected cards, leaderboard rank, event metadata and the attendee's five most recent connections. `/summary` caches the last successful response for offline reading.
- Authenticated `GET /attendees/me/connections/export?format=csv|vcf` remains available server-side, but the former “Take your connections with you / Download and share” section was removed from Summary. The current screen ends after Top Connections.

**Note:** no Day+1 follow-up scheduler to build — the follow-up nudge is a manual admin WhatsApp post per the runbook, not an app feature.

---

### F10 — Save as Contact (vCard)
*(PRD Feature 10. Depends on: F4 — needs a connection record to export. Small, self-contained.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F10.1 | One-tap vCard (.vcf) generation + native contact hand-off, "contact exists — update?" handling | Action on Screen 2.3/2.6 | P2 | Yes | F4.3 | ✅ Done |

**F10.1 build notes:**
- Attendee profiles and Already Met connection cards generate a standards-compatible vCard locally with name, mobile number, email, company and an Evento note. No network request is required, so the action works offline.
- The `.vcf` is handed to the device through the browser download/open flow. iOS/Android Contacts owns the final create-versus-update prompt; web apps cannot inspect the address book to pre-detect an existing contact.
- The action uses the design system's outlined contact icon and a separate full-width utility row, preserving the two-button Call/WhatsApp communication layout.

---

### F11 — Analytics (Attendee-Facing & Admin-Facing)
*(PRD Feature 11. Depends on: F3, F4, F6, F8 — this epic has no data of its own, it's a view over everything else.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F11.1 | Attendee personal stats (people met, rank, bookmarks, photos, time at event) | Part of Home/Settings | P1 | Yes (cached) | F4.3, F6.1 | ✅ Done |
| F11.2 | Admin analytics overview dashboard (check-ins, meetings, avg/attendee, engagement %, time-series) | Screen 3.2 | P1 | No | F3.4, F4.2, F6.1, F8.1 | ✅ Done |
| F11.3 | Admin analytics export (CSV/PDF for stakeholder/sponsor reporting) | Part of Screen 3.2 | P1 | No | F11.2 | ✅ Done |

**F11.1 build notes:**
- Authenticated `GET /attendees/me/stats` ([stats.service.ts](../apps/api/src/stats/stats.service.ts)) aggregates the five personal figures in one round-trip: **people met** (confirmed `Meeting` pairs the attendee is part of, counted identically to the leaderboard so the two never disagree), **rank** + **totalRanked** (delegated to `LeaderboardService.getForAttendee` — reuses its tie-aware ranking and 5-second cache rather than re-deriving it), **bookmarks** (`Bookmark` count), **photos** (live `Photo` count for the attendee — hard deletes drop out, so it always matches what the feed shows), and the **check-in timestamp/method + event end** used to render *time at event*.
- Rather than freezing a duration server-side, the endpoint returns `checkedInAt`, `checkInMethod` and `eventEndAt`; the client computes *time at event* as `min(now, eventEndAt) − checkedInAt` and ticks it live once a minute, so a cached response keeps counting correctly while offline. Not-yet-checked-in attendees get a `null` `checkedInAt` and the tile reads "Not checked in yet"; rank for a not-checked-in attendee falls through to `totalRanked + 1` via the leaderboard service.
- Surfaced on the Settings surface (Screen 2.11, `/profile`) as a "Your stats" section — the profile page already owns the authenticated cache-first/offline-tolerant pattern, so stats reuse it. A new `apps/web/app/lib/statsCache.ts` caches the last successful response in `localStorage`; the section renders from cache instantly, refreshes from the network when reachable, and stays visible (with the live timer running) when the API is unreachable. `LeaderboardService` is now exported from `LeaderboardModule` for this reuse.
- Not built here: F11.2/F11.3 (organizer-facing analytics) — attendee-facing stats only.

**F11.2 build notes:**
- `GET /admin/analytics` (same [stats.service.ts](../apps/api/src/stats/stats.service.ts) module, behind `AdminGuard`) aggregates the organizer dashboard in one response: attendance totals + method breakdown, confirmed meeting count, average meetings per checked-in attendee, networking engagement percentage (checked-in attendees who have logged at least one meeting), photo/like totals, feedback average/response count, top connectors from the existing leaderboard snapshot, and an hourly check-in/meeting time series for the last 8 hours.
- `/admin` is now the live Screen 3.2 overview rather than just a link hub. It auto-refreshes every 30 seconds, caches the most recent successful payload in `localStorage`, and shows that cached snapshot with an "Offline cache" badge if the organizer loses connectivity. Existing admin tools remain available lower on the page, so drill-down routes like Check-In and Feedback stay one tap away.
- Assumption used for this first build: the spec's singular "engagement %" is the clearest currently-supported organizer metric when defined as **checked-in attendees with at least one confirmed meeting / checked-in attendees**. F11.3 export can reuse the same server aggregate later.

**F11.3 build notes:**
- `GET /admin/analytics/export?format=csv|pdf` now reuses the exact F11.2 organizer aggregate so the on-screen dashboard and exported report never drift. CSV includes the event snapshot, key metrics, check-in method breakdown, top connectors, and the same 8-hour time-series rows that power the dashboard.
- The PDF export is generated server-side as a lightweight single-file report for stakeholder/sponsor sharing, with the same metrics laid out as a readable summary rather than requiring the organizer to print the browser view.
- `/admin` now exposes both export actions directly in the header, keeping F11.3 inside Screen 3.2 as scoped in the PRD.

---

### UX Revision (v1.1) — post-review scope

*Added after a pilot UX review. These reshape screens that already shipped, so each row is a change to an existing feature rather than a greenfield one. Nothing here is built yet.*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| PF7.1 | Bottom tab bar (Home · People · Want to Meet · Profile) + drawer demoted to secondary destinations. **No center FAB** — Scan stays Home's CTA (decided 2026-07-17, see F3.6 notes) | All attendee screens | P0 | Yes (shell) | PF7 | ⬜ Not started |
| F3.6 | Home as a **lifecycle-aware dashboard** — four modes (pre-event · arrival · checked-in dashboard · event ended) rather than the check-in-only screen shipped today. Checked-in mode carries a compact check-in strip (expandable to the desk view), table number, Scan CTA, three stats (people met / rank / time at event) and a People-to-meet preview. Restores `SCREENS.md` 2.1's "central hub" intent, which the F3.2 full-page revision stripped to check-in only. Surfaces F11.1's stats here, not just on Profile. Also fixes the false pre-event "Not checked in" warning | Screen 2.1 | P0 | Yes (cached) | F3.2, F11.1, F2.3 | ✅ Done |

**F3.6 performance note:** Home persists a compact synchronous snapshot of attendee header data, event lifecycle configuration and check-in state. Repeat visits paint from local storage immediately while live identity, check-in and event reads refresh in the background; stats and matches retain their existing independent cache-first refreshes. Logout, authentication rejection and magic-link account switching clear identity-sensitive Home data.

| F3.7 | **Venue-QR self check-in + one constant Home.** Home is now a single constant dashboard: the top block swaps between pre-event countdown / check-in card / checked-in strip / ended banner while the body (progress + People-to-meet) stays put. Tapping **Check in** tries geolocation, then falls back to scanning a printable **venue attendance QR** (new `VENUE_QR` method, `POST /checkin/venue-qr`); admins generate/download/regenerate that QR on the check-in desk (`GET`/`POST /admin/event/venue-qr`). The QR encodes `/checkin?venue=<token>` so a native-camera scan deep-links and self-checks-in too. | Screen 2.1, 3.4 | P0 | Yes (queued via PF4) | F3.6, F3.4, PF5 | ✅ Done |

**F3.7 build notes:**
- **Removed the 30s mode-polling** (`setInterval` in `home/page.tsx`): the mode resolves once on load and after a check-in, per the "constant Home" direction. The pre-event countdown keeps its own display-only 1s tick, scoped to the ≤3-day window (further out shows a calm "Coming soon" + date).
- **Full-page arrival/desk-view takeovers are gone** — check-in runs inline in a card (locating → scan states), and the post-check-in receipt is a compact strip (no separate desk screen).
- **Manual self-mark (old F3.3) is superseded** by the venue-QR scan; staff-scan-badge (F3.4) remains the ultimate fallback.
- **People-to-meet no longer blanks silently** — it shows a skeleton then a "No strong matches yet" empty state, fixing the intermittent-list report.
- Adds `Event.venueCheckinToken` + `VENUE_QR` to `CheckInMethod` (migration `20260721140000_add_venue_checkin_token`) and surfaces the new method in the admin check-in/analytics breakdowns.
| F4.4 | **Attendee Card** on Profile — a designed identity card (photo/initials, name, company, category, city, chapter, tags, LinkedIn, website), *not* a list of `dt`/`dd` detail rows. QR stays pinned above it | Screen 2.11 | P1 | Yes | F4.1 | ⬜ Not started |
| F4.5 | **Edit Profile** — dedicated form page reached from Profile. Editable = current onboarding fields (business category, city, looking-for, dependent offering, goals, bio) plus photo (F4.6); LinkedIn/website arrive separately with F4.7. Registered details (name, phone, email) stay read-only per the PRD's "Contact organizer to change this" rule | Screen 2.11a (new) | P1 | No | F1.2, F4.4 | ⬜ Not started |
| F4.6 | **Profile photo upload** — capture/choose, crop, replace; feeds the Attendee Card and every avatar. Reuses F7.1's client-side crop/resize pipeline | Screen 2.11a | P1 | No | F4.5 | ⬜ Not started |
| F4.7 | **LinkedIn & website URL fields** — new nullable attendee fields, optional import mapping and edit-form inputs with URL validation/normalization; surfaced as tap actions on cards/profiles and added to exports. Deferred from the current onboarding form to keep its required path short | Screen 2.3, 2.11, 2.11a | P2 | Yes | F4.5 | ⬜ Not started |
| F4.8 | **Logout on Profile** — sign-out action on the Profile screen itself (today it lives only in the drawer). Already anticipated by `SCREENS.md` 2.11 ("Tap Sign out") | Screen 2.11 | P2 | No | PF2 | ⬜ Not started |
| F2.6 | **"Met" indicator on cards** — attendee/match/directory cards show when you've already met the person. Data already exists (`Meeting`, F4.2); this is the missing card affordance | Screens 2.2, 2.3, 1.4 | P1 | Yes | F4.2, F2.4 | ⬜ Not started |
| F2.7 | **Icon action row on People / Want-to-Meet cards** — bookmark, call, LinkedIn/website and share as icon buttons, consistent with the polished F2.5 profile action row; link icons are omitted (never disabled) when the attendee has no link; cards open the full profile | Screens 2.2, 2.6 | P1 | Partial | F2.4, F4.7 | ⬜ Not started |
| F7.4 | **LinkedIn-grade feed UI** — rebuild like/comment/post affordances to the social-network standard already named as the reference in `DESIGN_SYSTEM.md` ("LinkedIn / Facebook-familiar patterns"). Deprioritized with F7 overall | Screens 2.7, 2.8 | P2 | Read: yes | F7.2 | ⬜ Not started |
| F2.8 | **"Want to Meet" = saved list; smart matches become suggestions into it** — the tab's top section is **Your list** (bookmarks); a distinct **Suggested for you** section below lists the full ranked matches (✦ reason + bookmark-to-add, first 5 then "Show more"), and bookmarking a suggestion moves it into Your list. Removes the duplicate saved list from My Connections (Screen 2.6 → *Already met* only). Tab keeps the name. See `SCREENS.md` 1.4/2.6 revision v1.3 | Screens 1.4, 2.6 | P1 | Yes (cached) | F2.3, F5.1 | ✅ Done |

**F3.6 scope notes (decided 2026-07-17 — owner: Jyoti):**
- **The diagnosis isn't "Home lacks stats", it's that Home is a check-in receipt forever.** All four of today's states are about check-in; once checked in, the screen shows the desk receipt and a Scan button for the remaining ~7 hours of the event. Check-in owns 100% of the screen for a job that's done 90 seconds after arrival. F3.6 makes Home **lifecycle-aware** instead of bolting tiles onto the receipt.
- **Four modes**, driven by event time + check-in state:

  | Mode | Trigger | Home is | Check-in |
  |---|---|---|---|
  | **Pre-event** | `now < startAt` | Countdown, event name/venue, "browse who's coming" → Directory, matches preview | Not attempted |
  | **Arrival** | event day, not checked in | Today's full-page band flow, unchanged (locating / arrived / need-manual) | The whole screen |
  | **Checked in** | checked in, `startAt ≤ now < endAt` | **The dashboard** (below) | Compact strip, tap to expand |
  | **Ended** | `now ≥ endAt` | Wrap-up + "View your summary" → F9.1 | Gone |

- **Fixes a live bug:** Home has no `startAt` guard, so it runs geolocation immediately and renders the orange **"Not checked in · Outside venue area"** warning. Attendees onboard ~5 days early (US1.2's group link), so today *every attendee sees an alarming warning for the 5 days before the event*. The pre-event mode is the fix, not a nice-to-have.
- **Checked-in dashboard contents (decided):** compact check-in strip · **table number** (the "where do I physically go" fact, prominent while it matters) · **Scan to connect** as the dominant CTA · three stat tiles — **people met · rank · time at event** · **People-to-meet preview** (2–3 faces from F2.1's engine → `/matches`) · the "No meetings yet. Start scanning!" empty state Screen 2.1 already specifies.
- **Deliberately dropped from the earlier F3.6 wording: bookmarks count and photos-posted.** Both are vanity numbers that don't drive a next action; photos is dead weight with F7 deprioritized; and **bookmarks duplicates the Want-to-Meet bottom tab** (PF7.1), violating "each destination lives in exactly one place". This row previously listed bookmarks — that is now an intentional removal, not an oversight.
- **The desk receipt must survive.** "Show this screen at the registration counter" is a real job — shrinking it to a strip is only safe because **tapping the strip expands it back** to the full-page desk view.
- **Home becomes a dashboard of *data*, not a launcher of *destinations*.** Screen 2.1's original quick-action grid (Directory / Connections / Feed) is obsolete once PF7.1's tab bar ships — People and Want-to-Meet *become tabs*. Home's only nav affordances are Scan (its CTA) and contextual links (matches preview, summary), never a duplicate of a tab.
- **Scan placement (closes a v1.1 open question):** **Home keeps its dominant "Scan to connect" CTA; PF7.1 ships without the center FAB for now.** Revisit once both are on a real phone. This unblocks Hussain — PF7.1 no longer waits on the FAB decision.
- **API gap this needs:** `GET /event` returns only `venueLat`/`venueLng`/`checkinRadiusM` — **no `startAt`, `endAt` or `name`**, so Home can't currently tell pre-event from during from ended. F3.6 adds them to that public endpoint (non-sensitive; already cached client-side by PF4).
- **Stretch, not committed:** *"2 people on your Want-to-Meet list just checked in"* — the same bookmark data turned into an action instead of a count. Needs a new aggregate joining `Bookmark` with `CheckIn`. Best UX idea on the table; deferred to keep a P0 from growing a backend.
- **Conflict boundary with PF7.1 (Hussain):** Hussain owns the chrome — `AttendeePageShell.tsx`, `AttendeeMenu.tsx`, the new tab bar, and the route-group layout. Jyoti owns Home's body — `home/page.tsx`. Shared surface is `PersonalStats.tsx` (F3.6 reuses it on Home; F4.4 touches it on Profile) — coordinate before either refactors it.

**F3.6 build notes:**
- Mode selection lives in [`homeMode.ts`](../apps/web/app/lib/homeMode.ts) — pure, no React or fetch — because every branch is a decision about *time*, which is the awkward thing to reproduce by hand in a browser. `resolveHomeMode(event, checkedIn, now)`. Ended beats pre-event beats dashboard/arrival; **when `startAt`/`endAt` are unset it deliberately falls through to the arrival flow** rather than guess (they are `null` in the pilot DB today, so this is the live path until the organizer sets event times in Screen 3.2A).
- `GET /event` now returns `name`/`startAt`/`endAt`; `cacheVenueConfig` carries them so the mode resolves offline. The new fields are optional in the cached type — a PWA installed before F3.6 has a cache without them, and `undefined` must not read as "event ended".
- Home renders its three stat tiles inline rather than importing `PersonalStats`: that component renders all five tiles plus its own heading, and it is the **shared surface with Hussain's F4.4** — leaving it untouched keeps the agreed boundary.
- **Verified in-browser across all four modes** (event times temporarily set, then restored to `null`): pre-event countdown, arrival→manual check-in→desk view, dashboard, ended. Also dark mode and 360px. The check-in strip ⇄ desk-view round trip works both ways.
- **Two bugs found and fixed while building, both beyond the original scope:**
  - Home redirected to `/login` on *any* fetch failure — so a 5xx or a timeout silently signed the attendee out. Now only 401/403 signs out; server errors get a retryable error state.
  - Home could hang on "Loading…" forever when the API stalled. It now has a 12s deadline and a "Can't load Home / Try again" state. **`/profile` still has this exact bug** ([profile/page.tsx:60](../apps/web/app/profile/page.tsx:60)) — no cache plus a failed fetch leaves it spinning indefinitely. Not fixed here; it belongs to F4.4/F4.5's owner.
- **Deferred, still worth doing:** the "2 people on your Want-to-Meet list just checked in" signal (needs a `Bookmark`×`CheckIn` aggregate), and pull-to-refresh from Screen 2.1.

**F4.7 scope notes (decided 2026-07-17):**
- **Two fields, one build unit.** LinkedIn and website are the same shape — nullable column, optional import mapping, optional form input, URL validation, tap action — so they ship together rather than as two rows. PRD **US1.6** is the traceability anchor; before this, F4.7 had no PRD story at all.
- **Optional everywhere, and that has teeth:** a blank link is a complete profile. Nothing gates on either field, no reminder nags for them, and an empty link renders **no control at all** rather than a disabled one — the same rule F2.5 already follows for a missing phone number.
- **Validation:** syntactically valid http/https; a bare host is normalized to `https://` rather than rejected; LinkedIn additionally enforces a `linkedin.com` host. No resolution check, no LinkedIn API, no scraping, no unfurling — the pilot stores and links out.
- **F4.7 reaches into three features that are already ✅ Done** — it is not self-contained:
  - **F1.1** (import) — two new optional columns in the mapping UI.
  - **F9.2** (connections CSV) — two new columns.
  - **F10.1** (vCard) — LinkedIn/website as `URL` properties, omitted when absent.
  Each needs a regression pass; the exports have shipped shapes that consumers may already depend on.
- **Onboarding cost accepted:** Screen 1.1 gains two fields, which brushes against US1.3's "under a minute" criterion. Mitigated by grouping both last under an "Add your links (optional)" heading, so the required path is unchanged in length; US1.3's field-count wording is updated to match rather than left contradicting the screen.
- **F4.7 now blocks F2.7 and half of F4.4/F4.5's field list**, despite being P2 to their P1 — worth sequencing it before them rather than after, or accepting that those two ship without link affordances and get a follow-up.

**F4.7 build notes (`websiteUrl` server wiring — 2026-07-21):**
- The DB column `Attendee.websiteUrl` was already applied (migration `20260721123000_add_attendee_website_url`) but was **missing from `schema.prisma`**, so the generated client couldn't read/write it — the same gap `linkedInUrl` hit earlier. Added the field to the schema and regenerated the client. ⚠️ That migration file is **absent from the local repo** (recorded applied in the DB only) — pull it from git history; do not hand-recreate it (checksum mismatch would break `migrate deploy`).
- `websiteUrl` is now returned everywhere the web renders it: `GET /attendees/me`, `GET /attendees/:id` (directory profile — `linkedInUrl` was also missing from that select and is now included), the directory list, and the public share card (`/attendees/public/:id`). It is persisted by the onboarding full-profile update.
- Added **`PATCH /attendees/me/links`** (`UpdateLinksDto`, `updateLinks`) — a partial edit for the optional link fields so the `/profile` website editor doesn't have to re-send/re-validate the whole onboarding profile. The web `/profile` save now targets this endpoint. Matches/connections/bookmarks were intentionally left out (the web doesn't surface website there).

**Open questions to close before building:**
- ~~**Scan placement** — center FAB vs contextual button vs its own tab.~~ **Closed 2026-07-17:** Scan remains Home's primary CTA; PF7.1 ships without a center FAB. Revisit after both are seen on a real device. See F3.6 scope notes.
- **Photo storage** — F4.6 (and F7.1 today) write uploads to local disk `/uploads`, which does **not** survive a hosted/containerized deploy. Supabase Storage (or equivalent) is needed before either ships for real. This is a deployment blocker, not a UI detail.
- **Drawer overlap** — with F7 deprioritized, the drawer holds Leaderboard, Summary, Feedback, Show My QR and Sign Out. If that thins out further, consider folding it into Profile and dropping the drawer entirely.

---

## Cross-Cutting UI States (not separate build units)

`SCREENS.md` Module 4 (network error/offline banner, sync-status/queue, loading skeletons) and Module 5 (toasts) aren't independently shippable features — they're acceptance criteria baked into whichever feature above renders them. Don't schedule them as their own row; do check for them in each feature's review before marking it Done.

---

## Suggested Build Sequence

Ordered by dependency chain, not by epic number — this is the order to pick features up in for the fastest path to a demoable pilot. Each row is sized to be buildable and shippable on its own; compress or parallelize across people if more than one engineer is available.

1. **Platform Foundations** — PF1 → PF2 → PF5 → PF4 → PF6 → PF7 (PF3 Admin Login can slot in alongside F1.1)
2. **F1** — F1.1 → PF3 (wire the gate onto it) → F1.2 → F1.3 → F1.4 → F1.5
3. **F3** — F3.1 → F3.2 → F3.3 → F3.4 → F3.5 (first real on-device offline flow — validates PF4 early)
4. **F4** — F4.1 → F4.2 → F4.3 (the core loop — get this rock-solid before layering gamification on top)
5. **F6** — F6.1 → F6.2 → F6.3 (thin layer over F4's data, high visible payoff for a pilot demo)
6. **F2** + **F5** in parallel — F2.1 → F2.2 → F2.3 → F2.4 → F2.5, and F5.1 → F5.2 (both only need F1's profile data and F4's card UI)
7. **F11** + **F8** — F8.1 → F8.2, then F11.1 → F11.2 → F11.3 (organizer-facing instrumentation, needed before event day)
8. **F9** + **F10** — F9.1 → F9.2, then F10.1 (post-event value, lowest risk to slip)
9. **F7** (cut first if the timeline slips) — F7.1 → F7.2 → F7.3

See `DEVELOPMENT_PLAN.md`'s [Build Sequence & Pacing](./DEVELOPMENT_PLAN.md#build-sequence--pacing) for this same list mapped onto calendar days.

---

## Explicitly Out of Scope (Phase 2)

Deferred per the PRD, listed here only so they aren't accidentally scoped into a pilot feature: multi-tenant/multi-event platform, in-app chat, AI/semantic matching, NFC/proximity auto-detection, tiered badges & sponsor prizes, AI-generated conversation starters, multi-language UI, native iOS/Android apps, interactive venue maps, real-time session scheduling, live polling & Q&A.

---

**Source:** [`PRD_v1.md`](./PRD_v1.md) · **Screen-level detail:** [`SCREENS.md`](./SCREENS.md) · **Visual system:** [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) · **Build plan:** [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md)
