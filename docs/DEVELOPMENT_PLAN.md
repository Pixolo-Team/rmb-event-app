# EVENTO — Development Plan

Turns [`PRD_v1.md`](./PRD_v1.md), [`FEATURES.md`](./FEATURES.md), [`SCREENS.md`](./SCREENS.md) and [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) into an executable build plan: architecture, data model, API surface, a granular build sequence against the PRD's under-1-month window, and the pre-event/event-day/post-event runbook.

`FEATURES.md`'s Feature Index is the source of truth for what's actually built vs. not — see its ✅/🟡/⬜ status per feature (currently: Platform Foundations PF1/PF2/PF4 and F1.1–F1.4, F3.1–F3.5 are done — including offline queuing now that PF4 exists; everything else is spec-only). This plan's job is to sequence and pace what's left, not to re-describe scope already captured there.

---

## Table of Contents

1. [Decisions Needed Before Week 1](#decisions-needed-before-week-1)
2. [Architecture](#architecture)
3. [Attendee Navigation & Side Menu](#attendee-navigation--side-menu)
4. [Repository Structure](#repository-structure)
5. [Data Model](#data-model)
6. [API Surface](#api-surface)
7. [Build Sequence & Pacing](#build-sequence--pacing)
8. [Testing & QA Plan](#testing--qa-plan)
9. [Environments & Deployment](#environments--deployment)
10. [Pre-Event, Event-Day & Post-Event Runbook](#pre-event-event-day--post-event-runbook)
11. [Risk Tracking](#risk-tracking)

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
- **Unknown attendee emails are reported explicitly (decision 2026-07-20).** In this closed, invite-only pilot, preventing a legitimate attendee from getting stuck after using the wrong address outweighs strict account-enumeration resistance. The API returns `not_registered`, the login screen directs the attendee to retry or contact the organizer, and existing per-email/per-IP rate limits remain the abuse control.
- **Onboarding is required and progressive (decision 2026-07-20).** Login checks the current session before rendering; completed attendees go to Home and incomplete attendees go to the required three-step onboarding flow. Profile save offers installation in a modal, but PWA installation remains optional and always has an in-browser fallback.
- **Login routing is cache-first, server-authoritative.** The cached self-profile provides an immediate `profileCompletedAt` routing hint so returning attendees do not wait on Supabase before leaving Login. Cookie authentication is still verified by protected destinations; confirmed `401/403` responses and explicit logout clear the profile cache to prevent stale redirect loops.
- **Home bootstrap is cache-first.** A compact local snapshot of attendee header data, event lifecycle configuration and check-in status renders Home synchronously. Live `/attendees/me`, `/checkin/me` and `/event` reads refresh it in the background; authentication rejection clears both profile and Home caches, while transient network failures leave the last usable Home visible.

---

## Attendee Navigation & Side Menu

The attendee PWA uses a **persistent bottom tab bar** for its four primary destinations (Home, People, Want to Meet, Profile), plus an **authenticated side-menu drawer** for lower-frequency destinations (Leaderboard, Event Summary, Give Feedback, Event Photos, Show My QR, Sign Out).

> **Revised (UX revision v1.1).** This section previously read: *"There is no persistent bottom-tab bar in the pilot: duplicating the same destinations in two navigation systems adds choice and consumes valuable vertical space on small phones."* That call is **reversed**. The vertical-space cost is accepted — bottom tabs are the current convention for this app category, and the primary destinations are used constantly during the event, where a two-tap drawer is friction at the wrong moment. The duplication objection still stands and is answered structurally: **each destination lives in exactly one navigation system, never both.** Scan QR is proposed as a center FAB in the tab bar (OPEN — pending confirmation); until that is settled it remains a prominent contextual action on Home. See PF7.1 in `FEATURES.md` and US12.1 in `PRD_v1.md`.

### Side-menu information architecture

The drawer opens from the attendee avatar/menu button in the app header. It uses **one flat list with no main/submenu hierarchy and no section headings**. Only destinations central to the attendee's networking journey belong in this drawer. Attendee photo or initials, name, company and chapter remain as non-navigation identity context at the top; Sign Out remains visually separated at the bottom.

### Final menu inventory and rollout state

The approved drawer inventory is fixed as follows. This is the display order; secondary and lifecycle-specific features such as Feed, Feedback, Summary, Tutorial, Install, About and Terms belong on Home, Profile or their contextual prompts—not in the primary drawer.

| Order | Menu item | Destination / owner | Initial state |
|---|---|---|---|
| 1 | Feed | Event Photo Feed (2.8, F7.2) | Available |
| 2 | Gallery | Photo gallery (F7.2) | Available |
| 3 | Leaderboard | Leaderboard (2.5, F6.2) | Available |
| 4 | Event Summary | Summary (2.10, F9.1) | Available |
| 5 | Show My QR | Own-QR state (2.11, F4.1) | Available |
| 6 | Give Feedback | Feedback (2.9, F8.1) | Available; deliberately last |
| Footer | Sign Out | `POST /auth/logout` | Available |

**Development preview rule:** in local development, render the complete approved inventory so its hierarchy, labels, density and scrolling can be reviewed before the dependent screens ship. Items without a working route are non-interactive, carry a compact **Soon** label and expose `aria-disabled="true"`; they must not navigate to placeholder pages. In production, omit those planned items entirely until their owning feature is enabled. Lifecycle gates still apply after a feature ships.

### Visibility and interaction rules

- **Authenticated-only:** the attendee header and side menu render only after a valid attendee session has been established. They must never render on `/`, `/login`, `/login/verify`, expired-link/error states or any other public route. A client-side loading state must not briefly flash authenticated navigation before session verification completes.
- **Focused onboarding:** `/onboarding` may have a valid attendee session, but deliberately omits the menu until the attendee completes or exits the required onboarding flow. Successful onboarding then enters the authenticated shell at Home.
- **Session expiry:** if an API response establishes that the attendee session has expired, close the drawer, clear attendee navigation state and return to Login without leaving profile information visible in the shell.
- **Context-aware outside the drawer:** the flat drawer inventory stays stable; Home and Profile surface pre-event install, event-day scan, feedback and post-event summary actions at the appropriate time.
- **Capability-aware:** production shows a destination only when its feature and route are usable. Local development may show the finalized planned inventory in the documented disabled preview state.
- **Offline-aware:** cached destinations remain tappable offline. Network-only actions explain that connectivity is required before navigation or submission.
- **Accessible:** the drawer is a modal navigation region with an accessible name, focus trap, Escape/back-button close, focus returned to its trigger, 44px minimum targets and no background scrolling while open.
- **One-handed:** it slides from the left, occupies at most 88% of a phone width, keeps Sign Out separated from ordinary destinations, and closes after navigation.
- **Responsive:** phones and tablets use the drawer. The attendee PWA may render it as a compact persistent rail only at desktop widths; the organizer dashboard continues to use its own unrelated admin sidebar.
- **State-preserving:** opening or closing the menu must not restart geolocation, clear scanner state, discard unsaved profile edits or trigger a page reload.
- **Route-active:** exact routes, registered nested prefixes and declared query parameters drive the active row, which exposes `aria-current="page"` and the design-system selected treatment.
- **Header titles:** the shared header derives a centered title from the current attendee route. Page bodies omit duplicate screen titles while retaining meaningful content headings.

### Navigation shell implementation

Implement one shared authenticated attendee shell in `apps/web` containing the app header, side-menu drawer, offline/sync banner slot and main-content region. The shell is mounted only inside an authenticated attendee route group/layout; public auth pages and focused onboarding use separate layouts. Routes provide menu metadata (label, icon, availability and lifecycle visibility) from one typed configuration so every authenticated screen uses the same inventory.

The shell initially wraps the existing Home route. F4.1 then supplies the real attendee identity/profile and own-QR content; subsequent features register their destinations as they ship. No new backend endpoint exists solely for the menu — it consumes attendee, event, feedback and sync state already required by the destination screens.

**Acceptance criteria**
- Menu opens and closes with touch, keyboard, Escape and Android/browser Back without navigating away.
- Menu is absent before login, during session verification and throughout focused onboarding; it becomes available on Home only after successful authentication/onboarding routing.
- Current destination is visibly and programmatically marked.
- Only implemented, authorized and currently relevant items are shown.
- Attendee identity has an initials fallback when the photo is unavailable.
- Menu renders from cached attendee/event data and remains usable during a mid-session connection loss.
- All drawer destinations are driven by one typed route configuration.
- Layout is verified at 360px, 428px and 768px widths, including long attendee and company names.

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
`id, name, email (unique), phone (unique), businessName, businessCategory (nullable), city (nullable), chapterId (nullable), tableNumber (nullable), photoUrl (nullable), linkedinUrl (nullable), qrToken (signed, unique), createdAt`
— no separate `industry` column: `businessCategory` is the only categorization field, avoiding two overlapping fields on the same form.
— `linkedinUrl` exists as a nullable optional profile field. `websiteUrl` and the complete edit/import/export contract remain planned under F4.7; neither is part of current onboarding.
— `city` and `businessCategory` are collected in profile setup (Screen 1.1) since the registration form doesn't capture them; the import maps them if a future file has City/Category columns.
— dropdown option records are normalized reference data, while the pilot continues storing the selected canonical display value on `Attendee` to avoid a disruptive attendee-data migration. Profile writes validate both selections against active database options.

**Profile** *(or merged into Attendee — separate only if profile completion needs its own timestamp/status)*
`attendeeId, lookingFor[], offering[], goals[], bio, profileCompletedAt` — `profileCompletedAt` is the routing boundary: null means required onboarding; non-null means Login and `/onboarding` redirect to Home.

**Chapter**
`id, name, active, sortOrder` — seeded from the distinct values seen in the import; not user-creatable in the pilot admin.

**BusinessCategoryOption**
`id, name (unique), active, sortOrder` — database-backed source for the searchable single-select in onboarding and directory filters. Imported legacy values are preserved as options during the taxonomy transition.

**OfferingOption**
`id, categoryId, name, active, sortOrder, unique(categoryId, name)` — database-backed offerings owned by one business category. Onboarding queries active offerings for the selected category and renders them as a searchable multi-checkbox list. Category deletion cascades to its reference offerings; deactivation is preferred once production data refers to an option. Selected values remain in `Attendee.offering[]` for backward compatibility until the onboarding/API work migrates selections to stable IDs.

**Initial dependent taxonomy (decision 2026-07-20):** `Technology` is the first category, with Web Development, Mobile App Development, Custom Software Development, UI/UX Design, E-commerce Development, Digital Marketing / SEO, IT Consulting, Cloud Services / Hosting, Cybersecurity, Data Analytics, AI/ML Solutions, CRM/ERP Implementation, IT Support & Managed Services, and Fractional CTO / Tech Advisory. Additional categories and offerings can be loaded as curated data without schema changes.

**CityOption**
`id, name, stateOrUt, active, sortOrder, unique(name, stateOrUt)` — a curated nationwide catalogue of major Indian cities across every state and union territory. The UI displays `City, State/UT` in the dropdown; legacy attendee city values are backfilled rather than discarded.

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

Planned for F4.7: `PATCH /attendees/me/profile` will accept `linkedinUrl` and `websiteUrl` as optional nullable-to-clear values with server-side validation and normalization. Directory/profile reads and optional import mappings will be expanded when that feature is implemented.

For F2.4/F2.5, both directory endpoints require an attendee session. `GET /attendees` returns public directory-card fields plus check-in state and filter facets. Business category, city, and chapter facets come from their active database reference tables and therefore remain populated even when the attendee result set is empty; company and “No chapter” availability remain attendee-derived. `GET /attendees/:id` returns the detailed attendee profile but never `qrToken`. The client caches the last successful list and per-profile responses for mid-session offline access. Bookmark state is added by F5; match reasons are added only by the decoupled F2.1 service.

**matching** — *F2.1, F2.2, F2.3*
`GET /attendees/me/matches` (top-10 + reasons, cacheable/offline)

**checkin** — *F3.2, F3.3, F3.4*
`POST /checkin/geolocation` · `POST /checkin/manual` · `POST /admin/checkin/qr-scan` (staff) · `GET /admin/checkin/status` (live counter + breakdown)

**meetings** — *F4.2, F4.3*
`POST /meetings/scan` (the unified QR exchange — idempotent on the attendee pair) · `GET /attendees/me/connections` (met + bookmarked)

**bookmarks** — *F5.1, F5.2*
`GET /bookmarks` · `POST /bookmarks` (legacy toggle) · `PUT /bookmarks/:attendeeId` · `DELETE /bookmarks/:attendeeId`

**leaderboard** — *F6.1, F6.2, F6.3*
`GET /leaderboard` (top 20 + requester's own rank; polled every 5–10s)

**feed** — *F7.1, F7.2, F7.3*
`POST /photos` (multipart photo upload) · `GET /photos` · `DELETE /photos/:id` (self) · `POST /photos/:id/like` · `POST /photos/:id/comments` · admin moderation under `/admin/photos`

**feedback** — *F8.1, F8.2*
`POST /feedback` · `GET /admin/feedback` (analytics + CSV export)

**summary** — *F9.1, F9.2, F10.1*
`GET /attendees/me/summary` (post-event stats) · `GET /attendees/me/connections/export` (CSV/vCard)

**admin analytics** — *F11.2, F11.3*
`GET /admin/analytics/overview` (check-ins, meetings, avg/attendee, engagement %) · `GET /admin/analytics/export` (CSV/PDF)

**admin — event settings** — *F3.1, F3.5*
`PATCH /admin/event` (venue lat/lng/radius, start/end times) · `GET /admin/badges` (PDF generation)

**event (public)** — *PF4, F3.6*
`GET /event` — today returns `venueLat`/`venueLng`/`checkinRadiusM` only. **F3.6 extends it with `startAt`, `endAt` and `name`**: Home can't distinguish pre-event from live from ended without them, and that gap is why Home currently shows a false "Not checked in" warning for the ~5 days attendees are onboarding. None of the three are sensitive (the venue coordinates already aren't), and the client caches the response per PF4 — so Home picks its mode offline. This is the only API change F3.6 needs; its stats come from the existing `GET /attendees/me/stats`.

---

## Build Sequence & Pacing

Mirrors `FEATURES.md`'s [Suggested Build Sequence](./FEATURES.md#suggested-build-sequence) — same IDs, same dependency order — mapped onto calendar days. Assumes a ~4.5 week build window ending with a pre-event buffer, per the PRD's "under 1 month" constraint. Each ID is one build unit, roughly 0.5–1.5 days for one engineer; compress or parallelize across people if more than one is available. **✅ marks IDs already done in this repo** — pick up wherever the ✅s stop.

### Day 0–2: Kickoff + Platform Foundations
- Vendor decisions locked (see table above); email domain verification submitted **immediately** (email is the only attendee entry channel)
- Repo scaffolded, CI running lint/typecheck/build on every push
- Postgres provisioned, Prisma schema drafted from the Data Model section, first migration committed
- Design tokens ported from `DESIGN_SYSTEM.md` into a Tailwind config — unblocks every screen after
- **PF1** ✅ · **PF2** ✅ · **PF5** · **PF4** ✅ · **PF6** (partial — extend rate limiting/CORS/validation past the auth endpoints)
- **Exit criteria:** an empty Next.js page and an empty NestJS `/health` endpoint both deployed to staging

### Days 3–6: F1 (Attendee Onboarding & Import) + PF3
- **F1.1** ✅ · **PF3** (build this and wire it in front of `/admin/*` — F1.1 currently has no login gate) · **F1.2** ✅ · **F1.3** ✅ · **F1.4** ✅ · **F1.5**
- **Exit criteria:** a test attendee can be imported (behind admin login), open the generic app link, request a magic link by email, complete a profile, and install the PWA

### Days 7–11: F3 (Attendance & Check-In)
- **F3.1** ✅ · **F3.2** ✅ · **F3.3** ✅ · **F3.4** ✅ · **F3.5** ✅ — all five done, including offline queuing via PF4
- **Exit criteria:** two test attendees can check in (one via geolocation, one manually), staff can QR-scan a badge at the desk, the live dashboard shows a correct counter/method breakdown, and all three still work with connectivity dropped mid-session (queued, synced on reconnect) — ✅ met

### Days 12–16: F4 (QR Exchange & Met Detection — the core loop)
- Build the shared authenticated attendee navigation shell first (header, side menu and sync-banner slot), initially wrapping the existing Home route
- **F4.1** · **F4.2** · **F4.3** — wire Profile/My QR, Scan and My Connections into the shared route configuration as each becomes usable
- **Exit criteria:** the side menu is keyboard/touch accessible and lifecycle/capability-aware; two test attendees can scan each other's QR, see the exchange confirmation, and a repeat scan is correctly rejected as a duplicate

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
- **F7.1** ✅ · **F7.2** ✅ · **F7.3** ✅ — per the PRD's own framing of this as secondary engagement

### UX Revision v1.1 (post-review — reshapes shipped screens, not greenfield)
Added after the pilot UX review; see `FEATURES.md` → [UX Revision (v1.1)](./FEATURES.md#ux-revision-v11--post-review-scope). These were never sequenced onto calendar days, which is why they're a block of their own rather than a day range — slot them against whatever build window remains before the event. Dependency order within the block:

- **F4.7** (LinkedIn + website URL fields, PRD US1.6) — do this **first in the block despite its P2 label**: F2.7's icon row and part of F4.4/F4.5's field list depend on it, and it carries the schema migration the rest of the block builds on. Its blast radius reaches three shipped features (F1.1 import mapping, F9.2 CSV, F10.1 vCard), so budget a regression pass on the exports, not just the new form fields.
- **PF7.1** (bottom tab bar — *Hussain*) · **F3.6** (Home as a lifecycle-aware dashboard — *Jyoti*) — the two P0s, built in parallel against an agreed file boundary:
  - **Hussain owns the chrome:** `components/AttendeePageShell.tsx`, `components/AttendeeMenu.tsx`, the new tab-bar component, and the authenticated route-group layout.
  - **Jyoti owns Home's body:** `app/home/page.tsx`, plus `GET /event` gaining `startAt`/`endAt`/`name`.
  - **Shared surface:** `components/PersonalStats.tsx` — F3.6 reuses it on Home, F4.4 touches it on Profile. Neither refactors it without a word to the other.
  - **Settled between them:** Scan stays Home's CTA, so **PF7.1 ships with no center FAB** and is no longer blocked on that open question. Home shows *data*, never a button that duplicates a tab — People and Want-to-Meet are tabs now, so Screen 2.1's old quick-action grid is struck.
- **F4.4** (Attendee Card) → **F4.5** (Edit Profile) → **F4.6** (photo upload — ⚠️ **blocked on durable object storage**; local-disk `/uploads` does not survive a hosted deploy, so Supabase Storage must land first)
- **F2.6** (Met indicator) · **F2.7** (card icon row — needs F4.7) · **F4.8** (logout on Profile)
- **F7.4** (feed UI) — deprioritized with F7 overall; cut first
- **Exit criteria:** an attendee can add, edit and clear both links; a profile with neither renders no link controls anywhere (card, directory, profile); the CSV and vCard exports carry both when present and omit them when absent; and the existing export consumers still parse.

### Final buffer: Hardening & Pre-Event Validation
See the [Runbook](#pre-event-event-day--post-event-runbook) below — this stretch is QA, device testing, and the venue dry run, not new features. Verify the final side-menu inventory against the features actually enabled in production so no hidden, disabled or unfinished destination reaches attendees.

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
