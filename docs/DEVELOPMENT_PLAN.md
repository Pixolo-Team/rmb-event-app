# EVENTO — Development Plan

Turns [`PRD_v1.md`](./PRD_v1.md), [`FEATURES.md`](./FEATURES.md), [`SCREENS.md`](./SCREENS.md) and [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) into an executable build plan: architecture, data model, API surface, a week-by-week schedule against the PRD's under-1-month window, and the pre-event/event-day/post-event runbook.

No code exists in this repo yet — this plan assumes a build starting from zero.

---

## Table of Contents

1. [Decisions Needed Before Week 1](#decisions-needed-before-week-1)
2. [Architecture](#architecture)
3. [Repository Structure](#repository-structure)
4. [Data Model](#data-model)
5. [API Surface](#api-surface)
6. [Week-by-Week Plan](#week-by-week-plan)
7. [Testing & QA Plan](#testing--qa-plan)
8. [Environments & Deployment](#environments--deployment)
9. [Pre-Event, Event-Day & Post-Event Runbook](#pre-event-event-day--post-event-runbook)
10. [Risk Tracking](#risk-tracking)

---

## Decisions Needed Before Week 1

The PRD names the frontend/backend stack (Next.js + NestJS) but leaves several vendor and infrastructure choices open. These block or slow down Week 1 if not settled first — some (WhatsApp Business API, in particular) have multi-day approval lead times, so they should be actioned *today*, in parallel with anything else, not "when we get to it."

| Decision | Recommendation | Why | Lead time risk |
|---|---|---|---|
| **WhatsApp messaging provider** | Meta Cloud API direct, or a wrapper (Gupshup / Interakt / WATI) if faster to stand up | Every invite, reminder, and follow-up in F1/F9 depends on this. Direct Meta API is cheaper at scale but requires Business verification; a wrapper trades a per-message fee for same-day setup. | **High** — Meta Business verification can take 3–5+ days. Start this first, today, regardless of what else is decided. |
| **Transactional email provider** (magic-link login) | Postmark or Resend | Login (Screen 2.0) depends entirely on emailed links landing in the inbox, not spam. Both have strong transactional deliverability reputations; Resend has the faster/simpler DX, Postmark the longer deliverability track record. | Medium — domain verification (SPF/DKIM/DMARC) takes a day or two to propagate. |
| **Database** | PostgreSQL | Relational fits the data well (attendees, meetings, bookmarks are all relationship-shaped); mature ecosystem with NestJS via Prisma. | Low |
| **ORM** | Prisma | Fastest schema-to-code loop for a 1-month build; generates types shared with the API layer. | Low |
| **File storage** (registration photos, feed photos, payment screenshots if ever needed) | S3-compatible object storage (Cloudflare R2 or AWS S3) | Direct-to-storage upload from the client keeps the API off the hot path for large files; R2 has no egress fees, relevant if photos get shared/exported. | Low |
| **Hosting — frontend** | Vercel | Native Next.js/PWA support, zero-config preview deployments per PR — useful for organizer review of admin screens mid-build. | Low |
| **Hosting — backend + DB** | Render or Railway | Both spin up a Postgres + Node service in minutes with none of the ops overhead a 1-month pilot can't absorb. Either is fine; pick based on existing account/billing relationships. | Low |
| **QR generation (server)** | `qrcode` (npm), payload = signed JWT (attendee ID + event ID + signature) | Matches the PRD's "signed, opaque, non-sequential" requirement directly. | — |
| **QR scanning (client)** | `html5-qrcode` (wraps the native `BarcodeDetector` API where available, falls back to a JS decoder) | Needs to work reliably on budget Android camera hardware in a noisy venue — this library has the widest device-compatibility track record of the common options. | — |
| **Offline storage (client)** | IndexedDB via Dexie.js, driven by a Workbox service worker | Dexie removes most of the IndexedDB boilerplate; Workbox is the standard PWA caching/offline layer and pairs natively with Next.js's PWA tooling. | — |

**Action for today:** start the WhatsApp Business provider application and the email domain verification in parallel with Week 1 engineering — both are pure lead-time risk, not effort risk.

---

## Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐
│   Attendee PWA (Next.js)│        │  Admin Dashboard          │
│   - installable, offline │        │  (same Next.js app,      │
│   - service worker cache │        │   /admin route group,     │
│   - IndexedDB write queue│        │   desktop-first)          │
└───────────┬──────────────┘        └────────────┬─────────────┘
            │  REST/JSON over HTTPS               │
            ▼                                      ▼
      ┌─────────────────────────────────────────────────┐
      │              NestJS API (single service)          │
      │  Modules: auth, attendees, matching, checkin,      │
      │  meetings, bookmarks, leaderboard, feed, feedback,  │
      │  analytics, admin, notifications                    │
      └───┬───────────────┬───────────────┬────────────────┘
          │               │               │
          ▼               ▼               ▼
    ┌───────────┐  ┌──────────────┐  ┌─────────────────┐
    │ PostgreSQL │  │ Object storage│  │ WhatsApp + Email │
    │ (Prisma)   │  │ (R2/S3)       │  │ provider APIs    │
    └───────────┘  └──────────────┘  └─────────────────┘
```

**Key architectural decisions carried over from the PRD/FEATURES docs:**
- **Single NestJS service, modular by feature** — not microservices. A 1-month, 200-attendee pilot doesn't justify the operational overhead; the matching logic still lives in its own decoupled module (`matching.service.ts`) per the PRD's explicit Phase-2-swap requirement, but that's a code-organization boundary, not a network one.
- **Offline-first is a client concern, not a backend one.** The API is a normal stateless REST service; all offline behavior (write queueing, cache-then-network reads, conflict-free sync) lives in the PWA's service worker + IndexedDB layer. The backend's only obligation is **idempotency** — every write the client might replay (check-in, meeting scan, bookmark, feedback) must be safe to submit twice.
- **No WebSockets for the pilot.** The leaderboard and admin dashboard poll every 5–10s per the PRD's explicit spec ("not every scan, to avoid flickering"). This is simpler to build and debug in a month than a realtime layer, and the PRD never asks for sub-5-second latency.
- **Auth has two independent tracks:** attendee (passwordless magic link, JWT session, see Screen 2.0) and admin (password + session cookie, 30-min idle timeout). They don't share a user table conceptually, even if implemented as one table with a `role` column.

---

## Repository Structure

Recommend a single monorepo (pnpm workspaces), since frontend and backend ship together for one pilot and share types (attendee shape, tag enums, API contracts):

```
rmb-event-app/
├── apps/
│   ├── web/                 # Next.js — attendee PWA + /admin route group
│   └── api/                 # NestJS
├── packages/
│   ├── shared-types/        # Attendee, Meeting, Profile, API DTOs — imported by both apps
│   └── design-tokens/       # Color/type/spacing tokens from DESIGN_SYSTEM.md, as a Tailwind config
├── docs/                    # (this folder — already exists)
└── pnpm-workspace.yaml
```

`packages/design-tokens` should be generated directly from the values already locked in `DESIGN_SYSTEM.md` — that document is the source of truth; don't let the two drift.

---

## Data Model

Entities, in build order (matches the dependency chain in `FEATURES.md`):

**Attendee**
`id, name, email (unique), phone (unique), businessName, industry, chapterId (nullable), photoUrl (nullable), qrToken (signed, unique), importRowFlag (nullable — mismatched-email etc.), createdAt`

**Profile** *(or merged into Attendee — separate only if profile completion needs its own timestamp/status)*
`attendeeId, lookingFor[], offering[], goals[], bio, profileCompletedAt`

**Chapter**
`id, name` — seeded from the distinct values seen in the import; not user-creatable in the pilot admin.

**Event**
`id, name, venueLat, venueLng, checkinRadiusM, startAt, endAt, feedbackPromptAt`

**CheckIn**
`id, attendeeId, method (geolocation | manual | staff_qr), timestamp` — unique constraint on `(attendeeId, eventId, date)` for duplicate protection.

**Meeting**
`id, attendeeAId, attendeeBId, timestamp, isDuplicate (bool)` — unique constraint on the *unordered pair* `(least(A,B), greatest(A,B))` is the mechanism behind duplicate-scan protection (US4.1/US6.3).

**Bookmark**
`id, attendeeId, targetAttendeeId, note (nullable), createdAt`

**Post** (photo feed) / **Comment** / **Like** — standard shape, `attendeeId, photoUrl, caption, createdAt`, with `deletedAt` for admin soft-delete (keeps the "deleted post history" the PRD asks for).

**Feedback**
`id, attendeeId, rating (1-5), comment (nullable), submittedAt`

**MagicLinkToken**
`id, attendeeId, tokenHash, channel (email | whatsapp), expiresAt, usedAt (nullable)` — single-use, 30-minute expiry per Screen 2.0.

**AdminUser**
`id, email, passwordHash, role`

**ImportBatch** / **ImportRow**
`ImportBatch: id, uploadedAt, fileName, successCount, duplicateCount, errorCount`
`ImportRow: importBatchId, rawData (jsonb), status (ok | duplicate | error | flagged_for_review), reason`
— this is what powers Screen 3.3's per-row reporting and the mismatched-email-column flag.

**Notes:**
- Leaderboard rank and met-count are **computed, not stored** — a query over `Meeting`, cached for 5–10s per the polling model above. Don't create a `LeaderboardEntry` table; it's a materialized view or a cached aggregate query, not a source of truth.
- Match suggestions are **computed client-side or pre-computed server-side into a cache**, never a persisted "Match" table — this is the PRD's explicit non-functional requirement (US2.3) to keep matching swappable in Phase 2.

---

## API Surface

Grouped by NestJS module. All attendee-facing writes are idempotent (safe to retry from the offline queue).

**auth**
`POST /auth/magic-link` (request a link — email or phone) · `POST /auth/magic-link/verify` (exchange token for session) · `POST /admin/auth/login` · `POST /admin/auth/logout`

**attendees / import**
`POST /admin/import` (upload + column mapping) · `GET /admin/import/:batchId` (status/report) · `GET /attendees/me` · `PATCH /attendees/me/profile` · `GET /attendees` (directory, filterable by industry/chapter/company/checkedIn) · `GET /attendees/:id`

**matching**
`GET /attendees/me/matches` (top-10 + reasons, cacheable/offline)

**checkin**
`POST /checkin/geolocation` · `POST /checkin/manual` · `POST /admin/checkin/qr-scan` (staff) · `GET /admin/checkin/status` (live counter + breakdown)

**meetings**
`POST /meetings/scan` (the unified QR exchange — idempotent on the attendee pair) · `GET /attendees/me/connections` (met + bookmarked)

**bookmarks**
`POST /bookmarks` · `DELETE /bookmarks/:id` · `PATCH /bookmarks/:id/note`

**leaderboard**
`GET /leaderboard` (top 20 + requester's own rank; polled every 5–10s)

**feed**
`POST /feed/posts` (multipart photo upload) · `GET /feed/posts` · `DELETE /feed/posts/:id` (self or admin) · `POST /feed/posts/:id/like` · `POST /feed/posts/:id/comments`

**feedback**
`POST /feedback` · `GET /admin/feedback` (analytics + CSV export)

**summary**
`GET /attendees/me/summary` (post-event stats) · `GET /attendees/me/connections/export` (CSV/vCard)

**admin analytics**
`GET /admin/analytics/overview` (check-ins, meetings, avg/attendee, engagement %) · `GET /admin/analytics/export` (CSV/PDF)

**admin — event settings**
`PATCH /admin/event` (venue lat/lng/radius, start/end times) · `GET /admin/badges` (PDF generation)

---

## Week-by-Week Plan

Mapped directly onto `FEATURES.md`'s suggested build sequence, turned into calendar weeks. Assumes a ~4.5 week build window ending with a pre-event buffer, per the PRD's "under 1 month" constraint. Compress or parallelize across people if more than one engineer is available — the dependency chain below is what actually gates ordering, not the week numbers.

### Week 0 (Day 0–2): Kickoff
- Vendor decisions locked (see table above); WhatsApp provider application and email domain verification submitted **immediately**
- Repo scaffolded (monorepo structure above), CI running lint/typecheck/build on every push
- Postgres provisioned, Prisma schema drafted from the Data Model section, first migration committed
- Design tokens ported from `DESIGN_SYSTEM.md` into a Tailwind config — this unblocks every screen after
- NestJS `auth` module skeleton (JWT issuing/verification, no providers wired yet)
- **Exit criteria:** an empty Next.js page and an empty NestJS `/health` endpoint both deployed to staging

### Week 1: Platform Foundations + F1 (Attendee Import & Onboarding)
- Service worker + Dexie.js offline write-queue scaffold (even if only one write type uses it yet)
- QR signing (`qrcode` + JWT payload) and verification
- Admin CSV import with column-mapping UI (Screen 3.3), dedup by phone+email, per-row error/flag reporting
- WhatsApp invite send (Day -5 template) wired to whichever provider was chosen in Week 0
- Profile Setup Form (Screen 1.1) — pre-filled read-only fields + industry/tags/goals/bio
- PWA install prompt (Screen 1.2), Thanks screen (1.3)
- Login / magic link (Screen 2.0) — email primary, WhatsApp fallback, rate limiting, neutral response
- **Exit criteria:** a test attendee can be imported, receive a WhatsApp invite, complete a profile, install the PWA, and log back in from a second device via email

### Week 2: F3 (Attendance & Check-In) + F4 (QR Exchange & Met Detection)
- Home/Dashboard (2.1) with geolocation auto-check-in + manual fallback (2.1A)
- Admin venue config (lat/lng/radius) and live check-in dashboard (3.4) with method breakdown
- Staff QR check-in scan flow
- QR Scanner screen (2.4), unified scan → exchange + meeting log, duplicate-pair protection
- My Connections base view (2.6) — Already Met tab only for now (Want to Meet lands with F5 next week)
- **Exit criteria:** two test attendees can check in (one via geolocation, one manually), scan each other's QR, see the exchange confirmation, and a repeat scan is correctly rejected as a duplicate

### Week 3: F6 (Leaderboard) + F2 (Matching, incl. chapter) + F5 (Bookmarks)
- Leaderboard aggregate query + polling endpoint, mobile leaderboard screen (2.5), venue display view
- Matching engine module (industry/tag overlap + same/cross-chapter reasoning), Day -3 pre-computation job
- Directory (2.2) with industry/company/chapter/checked-in filters, search
- Individual Profile screen (2.3) with match-reason display
- Bookmarks wired into My Connections' Want to Meet tab (2.6 complete)
- **Exit criteria:** a test attendee sees a ranked match list with correct same-/cross-chapter reasoning, can bookmark someone from the directory, and the leaderboard updates within 10s of a new scan

### Week 4: F11 (Analytics) + F8 (Feedback) + F9 (Summary/Follow-up) + F10 (Save as Contact)
- Admin analytics overview (3.2) — check-ins, meetings, avg/attendee, engagement %, CSV export
- Feedback prompt (2.9) + admin feedback analytics (3.6)
- Event Summary screen (2.10), CSV/vCard export, WhatsApp share
- Day+1 WhatsApp follow-up scheduler
- vCard "Save to Contacts" (2.3/2.6 action)
- **F7 Photo Feed if time allows** — cut first under schedule pressure, per the PRD's own framing of it as secondary engagement
- **Exit criteria:** the full attendee journey (import → onboard → check in → scan → match → bookmark → feedback → summary → follow-up) runs end-to-end against staging with no manual database intervention

### Week 4.5 (buffer): Hardening & Pre-Event Validation
See the [Runbook](#pre-event-event-day--post-event-runbook) below — this week is QA, device testing, and the venue dry run, not new features.

---

## Testing & QA Plan

**Automated**
- Unit tests on the matching engine (industry/tag overlap, same/cross-chapter reasoning) and the duplicate-meeting-pair logic — these two are the easiest to get subtly wrong and hardest to notice wrong in a demo
- Integration tests on every idempotent write endpoint (checkin, meetings/scan, bookmarks, feedback) — assert a replayed request doesn't double-write
- E2E smoke test of the critical path (import → invite → profile → install → check-in → scan → leaderboard) on CI before every deploy to staging

**Manual — device matrix**
Per the PRD's persona (budget Android, older devices): test on at minimum one low-end Android (Chrome), one mid-range Android, and iOS Safari (PWA install behaves differently there — no native install prompt, "Add to Home Screen" only). Confirm offline QR scanning and check-in on all three with WiFi disabled.

**Manual — offline/sync**
Force airplane mode mid-session, perform a check-in and two QR scans offline, restore connectivity, confirm all three synced exactly once (not zero, not duplicated).

**Load**
Simulate 200 concurrent users hitting `/leaderboard` and `/meetings/scan` — this is the PRD's own concurrency target (NFR: "handle 200 peak concurrent users").

**Venue-specific**
A physical dry run at the actual venue before event day: signal strength, geolocation accuracy against the configured radius, QR scan reliability under the venue's actual lighting.

---

## Environments & Deployment

| Environment | Purpose | Data |
|---|---|---|
| **Local** | Development | Seeded fake attendees, chapters, meetings |
| **Staging** | Organizer review, QA, the venue dry run | A copy of the real (or realistic dummy) import file — this is where Harish should test the CSV import himself before trusting it on event day |
| **Production** | Event day | Real attendee data, real WhatsApp/email sends |

Deploy frontend (Vercel) and backend (Render/Railway) independently but keep them versioned together via the monorepo — a backend API change should never ship without the frontend that expects it, and vice versa. Given the pilot's scale, a manual "deploy both, then smoke-test staging" step before promoting to production is safer than an elaborate release pipeline that won't pay for itself in a month.

---

## Pre-Event, Event-Day & Post-Event Runbook

**T-7 to T-3 days**
- Real attendee import run on staging first, reviewed by the organizer, then promoted to production
- WhatsApp Day -5 invite batch sent from production
- Venue dry run (see Testing & QA above); venue lat/lng/radius configured in Admin Event Settings
- Printed QR badges generated as the offline/no-phone fallback

**T-1 day**
- WhatsApp Day -1 reminder batch sent
- Final device check: staff console tablets set up and QR-scanner-tested at the check-in desk
- Confirm the venue-display leaderboard screen is reachable and polling correctly

**Event day**
- On-call engineer monitoring the admin analytics dashboard and error logs throughout — this is the single most valuable NFR to actually honor live, since PRD explicitly calls out "admin alerts if check-in API is down or sync queue is growing"
- Staff briefed on the fallback chain: attendee self-check-in → manual check-in button → staff QR scan → printed badge — so nobody at the desk is guessing what to do when step one fails
- Feedback prompt triggered (scheduled or manual) near event end

**T+1 day**
- WhatsApp follow-up batch sent (event summary + nudge)
- Admin exports full dataset (attendees, meetings, feedback, photos) for the organizer's own records

**T+3 to T+7 days**
- Retro: adoption rate and satisfaction score against the PRD's recommended targets (50–60% adoption, 3.8+/5.0 satisfaction)
- Grade what got cut under schedule pressure (most likely F7 Photo Feed) against actual attendee demand, to inform Phase 2 prioritization

---

## Risk Tracking

Carried from the PRD's own risk table, restated as build-phase actions rather than general mitigations:

| Risk | When it bites | Build-plan mitigation |
|---|---|---|
| WhatsApp Business verification delays invite send | Week 0–1 | Start the application on Day 0, not when Week 1's invite feature is due |
| QR scanning unreliable in venue lighting/crowd noise | Week 2, confirmed at the venue dry run | Test with the actual printed badge size (1-inch) under venue lighting before event day, not just on a laptop screen |
| Venue WiFi fails entirely | Event day | Offline-first is architected from Week 1 (service worker + IndexedDB), not bolted on later — this is why it's in the Week 1 exit criteria, not Week 4 |
| Matching quality feels weak to attendees | Week 3, felt on event day | Ship the "browse full directory" fallback in the same week as matching, never matching alone |
| Timeline slips past 1 month | Any week | The build sequence is ordered so that cutting from the *end* (F7 Photo Feed first, then F10, F9) still leaves a demoable, valuable pilot — never cut from the *start* (Foundations, F1, F3, F4) |

---

**Source docs:** [`PRD_v1.md`](./PRD_v1.md) · [`FEATURES.md`](./FEATURES.md) · [`SCREENS.md`](./SCREENS.md) · [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)
