# EVENTO — Development Plan

Turns [`PRD_v1.md`](./PRD_v1.md), [`FEATURES.md`](./FEATURES.md), [`SCREENS.md`](./SCREENS.md) and [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) into an executable build plan: architecture, data model, API surface, a granular build sequence against the PRD's under-1-month window, and the pre-event/event-day/post-event runbook.

`FEATURES.md`'s Feature Index is the source of truth for what's actually built vs. not — see its ✅/🟡/⬜ status per feature (currently: Platform Foundations PF1/PF2 and F1.1–F1.4 are done; everything else is spec-only). This plan's job is to sequence and pace what's left, not to re-describe scope already captured there.

---

## Table of Contents

1. [Decisions Needed Before Week 1](#decisions-needed-before-week-1)
2. [Architecture](#architecture)
3. [Repository Structure](#repository-structure)
4. [Data Model](#data-model)
5. [API Surface](#api-surface)
6. [Build Sequence & Pacing](#build-sequence--pacing)
7. [Testing & QA Plan](#testing--qa-plan)
8. [Environments & Deployment](#environments--deployment)
9. [Pre-Event, Event-Day & Post-Event Runbook](#pre-event-event-day--post-event-runbook)
10. [Risk Tracking](#risk-tracking)

---

## Decisions Needed Before Week 1

The PRD names the frontend/backend stack (Next.js + NestJS) but leaves several vendor and infrastructure choices open. These block or slow down Week 1 if not settled first — email domain verification in particular has propagation lead time, so it should be actioned *today*, in parallel with anything else, not "when we get to it." (WhatsApp messaging vendor: explicitly not needed — see first row below.)

| Decision | Recommendation | Why | Lead time risk |
|---|---|---|---|
| ~~WhatsApp messaging provider~~ | **Not needed — decision made: no WhatsApp vendor for the pilot.** The admin manually posts the app link in the attendee WhatsApp group (Day -5 invite, Day -1 reminder, Day +1 follow-up). Attendee-initiated WhatsApp actions use `wa.me` deep links (vendor-free). | Removes the single biggest vendor lead-time risk from the plan. | None |
| **Transactional email provider** (magic-link login) | **Gmail SMTP (decided)** — MailService sends over SMTP (nodemailer) when `SMTP_USER`/`SMTP_PASS` are set; falls back to the on-screen dev link otherwise. Config is generic (`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`MAIL_FROM`, defaults tuned for Gmail + app password), so swapping to another SMTP provider later is an env change, not a code change. Pilot sender: `rmbthanecity@gmail.com`. | Login (Screen 2.0) is the **only** entry channel — both first-time sign-up and re-entry depend entirely on emailed links landing in the inbox. Gmail chosen because the organizer already owns the account — zero vendor onboarding. | **Medium** — Gmail caps sends at ~500/day per account (fine for ~200 attendees but leaves little headroom for resends; monitor on event day) and the from-address is the raw Gmail account, which is more spam-prone than a verified custom domain. If deliverability disappoints in testing, swap `SMTP_*` to a transactional provider. |
| **Database** | **PostgreSQL on Supabase (decided)** | Relational fits the data well (attendees, meetings, bookmarks are all relationship-shaped); mature ecosystem with NestJS via Prisma. Supabase gives managed Postgres with zero ops, a connection pooler (needed for serverless/spiky event-day load), plus Storage as a candidate for photo uploads later. We use it as plain Postgres — Prisma stays the ORM; no Supabase Auth (magic links stay in our NestJS auth module). | Low — project spins up in minutes. Prisma needs both the pooled URL (runtime, port 6543) and the direct URL (migrations, port 5432). |
| **ORM** | Prisma | Fastest schema-to-code loop for a 1-month build; generates types shared with the API layer. | Low |
| **File storage** (registration photos, feed photos, payment screenshots if ever needed) | S3-compatible object storage (Cloudflare R2 or AWS S3) | Direct-to-storage upload from the client keeps the API off the hot path for large files; R2 has no egress fees, relevant if photos get shared/exported. | Low |
| **Hosting — frontend** | Vercel | Native Next.js/PWA support, zero-config preview deployments per PR — useful for organizer review of admin screens mid-build. | Low |
| **Hosting — backend** | Render or Railway (Node service only — DB is on Supabase) | Spins up a Node service in minutes with none of the ops overhead a 1-month pilot can't absorb. Either is fine; pick based on existing account/billing relationships. | Low |
| **QR generation (server)** | `qrcode` (npm), payload = signed JWT (attendee ID + event ID + signature) | Matches the PRD's "signed, opaque, non-sequential" requirement directly. | — |
| **QR scanning (client)** | `html5-qrcode` (wraps the native `BarcodeDetector` API where available, falls back to a JS decoder) | Needs to work reliably on budget Android camera hardware in a noisy venue — this library has the widest device-compatibility track record of the common options. | — |
| **Offline storage (client)** | IndexedDB via Dexie.js, driven by a Workbox service worker | Dexie removes most of the IndexedDB boilerplate; Workbox is the standard PWA caching/offline layer and pairs natively with Next.js's PWA tooling. | — |

**Action for today:** start the email domain verification (SPF/DKIM/DMARC) in parallel with Week 1 engineering — it is pure lead-time risk, not effort risk, and email is now the only way attendees get in.

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
    ┌────────────┐  ┌──────────────┐  ┌─────────────────┐
    │ PostgreSQL  │  │ Object storage│  │ Email provider   │
    │ (Supabase,  │  │ (R2/S3 or     │  │ API (magic links)│
    │  via Prisma)│  │  Supabase     │  │                  │
    │             │  │  Storage)     │  │                  │
    └────────────┘  └──────────────┘  └─────────────────┘
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
`id, name, email (unique), phone (unique), businessName, businessCategory (nullable), city (nullable), chapterId (nullable), photoUrl (nullable), qrToken (signed, unique), importRowFlag (nullable — mismatched-email etc.), createdAt`
— no separate `industry` column: `businessCategory` is the only categorization field, avoiding two overlapping fields on the same form.
— `city` and `businessCategory` are collected in profile setup (Screen 1.1) since the registration form doesn't capture them; the import maps them if a future file has City/Category columns.

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
`id, attendeeId, tokenHash, expiresAt, usedAt (nullable)` — email-only (no channel column; there is no WhatsApp delivery), single-use, 30-minute expiry per Screen 2.0.

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

Grouped by NestJS module. All attendee-facing writes are idempotent (safe to retry from the offline queue). Each group is tagged with the `FEATURES.md` ID(s) it belongs to.

**auth** — *PF2, PF3*
`POST /auth/magic-link` (request a link — email or phone) · `POST /auth/magic-link/verify` (exchange token for session) · `POST /admin/auth/login` · `POST /admin/auth/logout`

**attendees / import** — *F1.1, F1.2, F2.4*
`POST /admin/import` (upload + column mapping) · `GET /admin/import/:batchId` (status/report) · `GET /attendees/me` · `PATCH /attendees/me/profile` · `GET /attendees` (directory, filterable by businessCategory/chapter/company/checkedIn) · `GET /attendees/:id`

**matching** — *F2.1, F2.2, F2.3*
`GET /attendees/me/matches` (top-10 + reasons, cacheable/offline)

**checkin** — *F3.2, F3.3, F3.4*
`POST /checkin/geolocation` · `POST /checkin/manual` · `POST /admin/checkin/qr-scan` (staff) · `GET /admin/checkin/status` (live counter + breakdown)

**meetings** — *F4.2, F4.3*
`POST /meetings/scan` (the unified QR exchange — idempotent on the attendee pair) · `GET /attendees/me/connections` (met + bookmarked)

**bookmarks** — *F5.1, F5.2*
`POST /bookmarks` · `DELETE /bookmarks/:id` · `PATCH /bookmarks/:id/note`

**leaderboard** — *F6.1, F6.2, F6.3*
`GET /leaderboard` (top 20 + requester's own rank; polled every 5–10s)

**feed** — *F7.1, F7.2, F7.3*
`POST /feed/posts` (multipart photo upload) · `GET /feed/posts` · `DELETE /feed/posts/:id` (self or admin) · `POST /feed/posts/:id/like` · `POST /feed/posts/:id/comments`

**feedback** — *F8.1, F8.2*
`POST /feedback` · `GET /admin/feedback` (analytics + CSV export)

**summary** — *F9.1, F9.2, F10.1*
`GET /attendees/me/summary` (post-event stats) · `GET /attendees/me/connections/export` (CSV/vCard)

**admin analytics** — *F11.2, F11.3*
`GET /admin/analytics/overview` (check-ins, meetings, avg/attendee, engagement %) · `GET /admin/analytics/export` (CSV/PDF)

**admin — event settings** — *F3.1, F3.5*
`PATCH /admin/event` (venue lat/lng/radius, start/end times) · `GET /admin/badges` (PDF generation)

---

## Build Sequence & Pacing

Mirrors `FEATURES.md`'s [Suggested Build Sequence](./FEATURES.md#suggested-build-sequence) — same IDs, same dependency order — mapped onto calendar days. Assumes a ~4.5 week build window ending with a pre-event buffer, per the PRD's "under 1 month" constraint. Each ID is one build unit, roughly 0.5–1.5 days for one engineer; compress or parallelize across people if more than one is available. **✅ marks IDs already done in this repo** — pick up wherever the ✅s stop.

### Day 0–2: Kickoff + Platform Foundations
- Vendor decisions locked (see table above); email domain verification submitted **immediately** (email is the only attendee entry channel)
- Repo scaffolded, CI running lint/typecheck/build on every push
- Postgres provisioned, Prisma schema drafted from the Data Model section, first migration committed
- Design tokens ported from `DESIGN_SYSTEM.md` into a Tailwind config — unblocks every screen after
- **PF1** ✅ · **PF2** ✅ · **PF5** · **PF4** · **PF6** (partial — extend rate limiting/CORS/validation past the auth endpoints)
- **Exit criteria:** an empty Next.js page and an empty NestJS `/health` endpoint both deployed to staging

### Days 3–6: F1 (Attendee Onboarding & Import) + PF3
- **F1.1** ✅ · **PF3** (build this and wire it in front of `/admin/*` — F1.1 currently has no login gate) · **F1.2** ✅ · **F1.3** ✅ · **F1.4** ✅ · **F1.5**
- **Exit criteria:** a test attendee can be imported (behind admin login), open the generic app link, request a magic link by email, complete a profile, and install the PWA

### Days 7–11: F3 (Attendance & Check-In)
- **F3.1** · **F3.2** · **F3.3** · **F3.4** · **F3.5**
- **Exit criteria:** two test attendees can check in (one via geolocation, one manually), staff can QR-scan a badge at the desk, and the live dashboard shows a correct counter/method breakdown

### Days 12–16: F4 (QR Exchange & Met Detection — the core loop)
- **F4.1** · **F4.2** · **F4.3**
- **Exit criteria:** two test attendees scan each other's QR, see the exchange confirmation, and a repeat scan is correctly rejected as a duplicate

### Days 17–19: F6 (Leaderboard)
- **F6.1** · **F6.2** · **F6.3**
- **Exit criteria:** the leaderboard updates within 10s of a new scan; venue display and mobile screens both read correctly

### Days 20–24: F2 (Matching) + F5 (Bookmarks), in parallel
- **F2.1** · **F2.2** · **F2.3** · **F2.4** · **F2.5** — and separately **F5.1** · **F5.2**
- **Exit criteria:** a test attendee sees a ranked match list with correct same-/cross-chapter reasoning, can browse the full directory, and can bookmark someone from it

### Days 25–28: F8 (Feedback) + F11 (Analytics)
- **F8.1** · **F8.2** · **F11.1** · **F11.2** · **F11.3**
- **Exit criteria:** admin analytics overview reflects live check-in/meeting/feedback data, with CSV export

### Days 29–31: F9 (Summary & Follow-Up) + F10 (Save as Contact)
- **F9.1** · **F9.2** · **F10.1** — no Day+1 follow-up scheduler to build, the nudge is a manual admin group post per the Runbook
- **Exit criteria:** the full attendee journey (import → onboard → check in → scan → match → bookmark → feedback → summary) runs end-to-end against staging with no manual database intervention

### Days 32+ (cut first under schedule pressure): F7 (Photo Feed)
- **F7.1** · **F7.2** · **F7.3** — per the PRD's own framing of this as secondary engagement

### Final buffer: Hardening & Pre-Event Validation
See the [Runbook](#pre-event-event-day--post-event-runbook) below — this stretch is QA, device testing, and the venue dry run, not new features.

---

## Testing & QA Plan

**Automated**
- Unit tests on the matching engine (tag overlap, same/cross-chapter reasoning) and the duplicate-meeting-pair logic — these two are the easiest to get subtly wrong and hardest to notice wrong in a demo
- Integration tests on every idempotent write endpoint (checkin, meetings/scan, bookmarks, feedback) — assert a replayed request doesn't double-write
- E2E smoke test of the critical path (import → magic-link login → profile → install → check-in → scan → leaderboard) on CI before every deploy to staging

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

| Environment | Purpose | Data | Database |
|---|---|---|---|
| **Local** | Development | Seeded fake attendees, chapters, meetings | Docker Postgres (`docker-compose.yml`) or a personal Supabase project |
| **Staging** | Organizer review, QA, the venue dry run | A copy of the real (or realistic dummy) import file — this is where Harish should test the CSV import himself before trusting it on event day | Supabase project (separate from prod) |
| **Production** | Event day | Real attendee data, real magic-link email sends | Supabase project (dedicated) |

Deploy frontend (Vercel) and backend (Render/Railway) independently but keep them versioned together via the monorepo — a backend API change should never ship without the frontend that expects it, and vice versa. Given the pilot's scale, a manual "deploy both, then smoke-test staging" step before promoting to production is safer than an elaborate release pipeline that won't pay for itself in a month.

---

## Pre-Event, Event-Day & Post-Event Runbook

**T-7 to T-3 days**
- Real attendee import run on staging first, reviewed by the organizer, then promoted to production
- Admin posts the sign-up link in the attendee WhatsApp group (Day -5) — manual post, owned by the organizer, checklist item with a named owner
- Venue dry run (see Testing & QA above); venue lat/lng/radius configured in Admin Event Settings
- Printed QR badges generated as the offline/no-phone fallback

**T-1 day**
- Admin posts the Day -1 reminder in the attendee WhatsApp group (manual post: "install Evento before tomorrow" + link)
- Final device check: staff console tablets set up and QR-scanner-tested at the check-in desk
- Confirm the venue-display leaderboard screen is reachable and polling correctly

**Event day**
- On-call engineer monitoring the admin analytics dashboard and error logs throughout — this is the single most valuable NFR to actually honor live, since PRD explicitly calls out "admin alerts if check-in API is down or sync queue is growing"
- Staff briefed on the fallback chain: attendee self-check-in → manual check-in button → staff QR scan → printed badge — so nobody at the desk is guessing what to do when step one fails
- Feedback prompt triggered (scheduled or manual) near event end

**T+1 day**
- Admin posts the Day +1 follow-up in the attendee WhatsApp group (manual post: summary link + follow-up nudge)
- Admin exports full dataset (attendees, meetings, feedback, photos) for the organizer's own records

**T+3 to T+7 days**
- Retro: adoption rate and satisfaction score against the PRD's recommended targets (50–60% adoption, 3.8+/5.0 satisfaction)
- Grade what got cut under schedule pressure (most likely F7 Photo Feed) against actual attendee demand, to inform Phase 2 prioritization

---

## Risk Tracking

Carried from the PRD's own risk table, restated as build-phase actions rather than general mitigations:

| Risk | When it bites | Build-plan mitigation |
|---|---|---|
| Magic-link emails land in spam (email is now the only entry channel) | Days 0–6 (PF2/F1), felt hardest on event day | Verify SPF/DKIM/DMARC on Day 0; use a reputable transactional provider; test deliverability against Gmail (the dominant inbox for this audience) before the Day -5 group post |
| QR scanning unreliable in venue lighting/crowd noise | Days 7–16 (F3/F4), confirmed at the venue dry run | Test with the actual printed badge size (1-inch) under venue lighting before event day, not just on a laptop screen |
| Venue WiFi fails entirely | Event day | Offline-first (PF4) is architected in the first build phase, not bolted on later — this is why it's in the Days 0–2 exit criteria, not the final buffer |
| Matching quality feels weak to attendees | Days 20–24 (F2), felt on event day | Ship the "browse full directory" fallback (F2.4) in the same batch as matching, never matching alone |
| Timeline slips past 1 month | Any phase | The build sequence is ordered so that cutting from the *end* (F7 Photo Feed first, then F10, F9) still leaves a demoable, valuable pilot — never cut from the *start* (Foundations, F1, F3, F4) |

---

**Source docs:** [`PRD_v1.md`](./PRD_v1.md) · [`FEATURES.md`](./FEATURES.md) · [`SCREENS.md`](./SCREENS.md) · [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)
