# rmb-app — Product Requirements Document

**Status:** Draft v1 — for a single event, build window ~2-3 days
**Last updated:** 2026-07-15

---

## 1. Overview

rmb-app is a mobile-first web app (PWA) built for the attendees of **one specific business/marketing event**. It solves a simple, real problem: after registering for the event, attendees currently have no way to see who else is there, exchange contact details, or track who's actually networking. rmb-app gives every attendee:

- A digital business card / profile
- A way to instantly exchange contact details with people they meet (via QR scan)
- A personal, growing list of everyone they've connected with
- A leaderboard showing who has connected with the most people at the event

This is **not** a general event-management platform. It is scoped to one event, with the option to generalize later if it proves useful.

---

## 2. Goals & Non-Goals

### Goals (v1, must ship in the build window)
- Attendees can register for the event and get into the app with minimal friction.
- Attendees can build a basic profile (name, company, title, email, phone).
- Attendees can connect with another attendee in person via QR scan, instantly exchanging profile details.
- Attendees can see their own list of connections, which starts at 0 and grows during the event.
- A leaderboard ranks attendees by total number of connections made.
- The organizer has a basic admin view: who's registered, and the leaderboard.

### Non-Goals (explicitly out of scope for v1)
- Business card image scanning / OCR auto-fill (deferred — manual entry only in v1)
- Exporting contacts (vCard/CSV) or in-app chat/messaging
- Turning this into a reusable multi-event platform (this build is single-event only)
- Push notifications
- Real-time/live-updating leaderboard (fetched on view, not pushed)
- True offline support

These were raised during scoping and deliberately deferred — see §9.

---

## 3. Users & Roles

| Role | Description |
|---|---|
| **Attendee** | Registers for the event, builds a profile, connects with others, views their connections and the leaderboard. |
| **Organizer/Admin** | Runs the event. Views the registration list and the leaderboard. Single shared view — no multi-admin permission system needed for v1. |

No other roles (no "approved organizer" workflow — this build is hardcoded to one event, so there's no event-creation flow at all).

---

## 4. Timeline Reality Check

The full original ambition (QR-code login + ticketing, OCR business-card scanning, a searchable attendee directory, live leaderboard, admin dashboard) is a multi-week scope. Given a **2-3 day** build window, the following cuts were made deliberately, in order of what got cut first:

1. **OCR business card scanning → cut.** Manual profile entry only. This was the single highest-effort, highest-risk item (third-party API integration, error handling for failed extraction, review/edit UI) for a feature that isn't required to prove the core value (connecting + leaderboard).
2. **QR-code login/ticketing → replaced with email magic link.** Generating, emailing, and scanning a *login* QR is meaningfully more work than a standard magic-link auth flow, for the same outcome (frictionless login). The QR code is kept only for the **connect** mechanic, which is the actual core feature.
3. **Searchable attendee directory → stretch goal, ship only if time remains.** The core loop (scan QR → connect → see it in your list → check leaderboard) works with zero directory. Directory browsing is additive, not required to prove the concept.
4. **Real-time/live leaderboard → simplified to fetch-on-view.** A live-updating leaderboard needs WebSocket infra; a leaderboard that refreshes when you open the tab delivers the same information with a fraction of the engineering.

If the timeline turns out to be wrong (event is actually further out), items 1 and 3 are the first candidates to bring back in — see §10.

---

## 5. User Flows

### 5.1 Registration (pre-event, two steps)

**Step 1 — Sign up for the event**
1. Attendee gets a link to a simple registration form (shared however the event is being promoted — not part of this app's scope).
2. Form fields: **name, email, phone**.
3. On submit, an account is created and a **magic login link** is emailed to them.

**Step 2 — Complete profile (first time opening the app)**
1. Attendee clicks the magic link → logs in (session persists on that device from then on).
2. Prompted to complete their profile: **company, job title** (name/email/phone carried over from step 1, editable).
3. Once saved, the app generates their personal **connect QR code** (encodes a unique, permanent token tied to their profile).
4. Attendee lands on the home screen: their QR code, a "My Connections" list (empty), and a leaderboard link.

### 5.2 Connecting with someone (core loop, in person)

1. Attendee A opens their QR code screen; Attendee B opens the scanner (or vice versa).
2. B scans A's QR code.
3. App validates the token, and **instantly, mutually** connects them — no accept/reject step.
4. Both A and B now see each other's full profile (name, company, title, email, phone) in their respective "My Connections" lists.
5. Both connection counts increment by 1 (used for the leaderboard).
6. Re-scanning someone you've already connected with is a no-op (idempotent — no duplicate entries, no double-counting).
7. Scanning your own QR code is blocked with a friendly error.

### 5.3 Viewing connections & leaderboard

- **My Connections**: a simple list of everyone connected so far this event, each showing name, company, title, email, phone.
- **Leaderboard**: all attendees ranked by total connection count, refreshed when the screen is opened/pulled-to-refresh. No live push updates in v1.

### 5.4 Admin view

- Simple authenticated page (shared password/link is sufficient for v1 — no need for a full admin auth system for one event).
- Shows: full registration list (name, email, phone, company, title, registered-at), and the same leaderboard attendees see.

### 5.5 After the event

- The app and all data stay live — attendees keep access to their connections list after the event ends (per decision in §9). No auto-deletion or export-then-purge flow in v1.

---

## 6. Feature Spec

| Feature | Priority | Notes |
|---|---|---|
| Registration form (name, email, phone) | **Must** | External-facing, minimal validation (valid email format, dedupe by email) |
| Magic-link email + session login | **Must** | See §8 for provider options |
| Profile completion (company, title) | **Must** | Editable after the fact |
| Personal QR code generation | **Must** | One QR per attendee, generated once, static for the event |
| QR scanner (camera) | **Must** | Needs camera permission; manual fallback if denied (see §8 edge cases) |
| Instant mutual connect on scan | **Must** | Idempotent, blocks self-scan |
| My Connections list | **Must** | |
| Leaderboard (count-based, all attendees visible) | **Must** | Fetch-on-view, not live-pushed |
| Admin: registration list + leaderboard | **Must** | Simple shared-credential access |
| Searchable attendee directory | **Stretch** | Only if time allows after Must items are done and tested |
| Business card OCR scan-to-fill | **Out of scope (v1)** | Manual entry only |
| Contact export (vCard/CSV) | **Out of scope (v1)** | |
| In-app chat | **Out of scope (v1)** | |
| Push notifications | **Out of scope (v1)** | |

---

## 7. Data Model (proposed)

```
Attendee
  id            uuid, pk
  name          string
  email         string, unique
  phone         string
  company       string, nullable (filled in step 2)
  jobTitle      string, nullable (filled in step 2)
  qrToken       string, unique (random, generated on profile completion)
  authToken     string, nullable (current magic-link/session token)
  connectionCount int, default 0   -- denormalized for fast leaderboard reads
  registeredAt  timestamp
  profileCompletedAt timestamp, nullable

Connection
  id            uuid, pk
  attendeeAId   uuid, fk -> Attendee
  attendeeBId   uuid, fk -> Attendee
  connectedAt   timestamp
  unique constraint on (least(attendeeAId, attendeeBId), greatest(attendeeAId, attendeeBId))
    -- prevents duplicate connection rows regardless of scan direction
```

Leaderboard query: `Attendee` ordered by `connectionCount desc`. Denormalized counter avoids a `count(*)` join on every leaderboard fetch at 100-500 attendees; updated transactionally whenever a `Connection` row is inserted (both sides +1).

---

## 8. Technical Notes & Open Decisions

Building on the existing scaffold: **Next.js (frontend, PWA-installable) + NestJS (backend) + TypeScript**, per the current repo.

- **Database**: PostgreSQL recommended (relational data, small-medium scale, works well with NestJS + Prisma or TypeORM). *Not yet decided which ORM — recommend Prisma for speed of iteration in a 2-3 day build.*
- **Email delivery (magic link)**: needs a transactional email provider — recommend **Resend** (fast setup, generous free tier, good DX with Node) or SendGrid if already in use elsewhere. **Open decision — needs to be picked before build starts**, since registration is blocked without it.
- **QR generation**: `qrcode` npm package (server or client-side) to render each attendee's `qrToken` as a scannable code.
- **QR scanning**: a browser camera-based scanner library (e.g. `html5-qrcode`) — works in mobile browsers without a native app. Requires HTTPS and camera permission.
- **Auth/session**: magic link issues a short-lived one-time token; on first successful click, exchange it for a longer-lived session (cookie or JWT) so attendees don't need to re-click the email link every time they open the app during the event.
- **Admin auth**: a single shared password or a signed admin link is sufficient for v1 — not worth building a full admin user system for one event.
- **PWA**: add a web manifest + icons so it's installable to the home screen; full offline service-worker caching is **not** in scope for v1 (adds complexity, not needed for the core loop to work on venue wifi/cellular).
- **Scale**: 100-500 attendees is well within a single small Postgres instance and a couple of NestJS instances — no special infra planning needed.

---

## 9. Deferred / Explicitly Out of Scope

These were discussed and intentionally left out of v1 — not forgotten, just not worth the risk in a 2-3 day window:

- **Business card OCR auto-fill** — highest-effort item cut; manual entry covers the same end state (a filled-in profile), just with one extra minute of typing per attendee.
- **Contact export (vCard/CSV) and in-app chat** — additive on top of "My Connections," not required for the core loop.
- **Reusable multi-event platform** — this build is single-event, hardcoded. Revisit only if this event is a success and there's a real need for repeat events.

If any of these turn out to matter, they're additive to the data model above (no rework needed) — e.g. OCR just becomes an alternate way to fill in the same `Attendee` fields.

---

## 10. Open Questions Before Build Starts

1. **Email provider** — pick one (Resend suggested) and get an API key before Step 1 (registration → magic link) can be built.
2. **Registration form hosting** — is the pre-registration form part of this same Next.js app, or an external form (Google Form / Typeform) that just needs to feed into the `Attendee` table? Assumed to be part of this app unless told otherwise.
3. **Admin credential** — who holds the shared admin password/link, and how is it distributed?
4. **Branding** — any existing logo/colors for "RMB" to apply, or default to a clean neutral style for now?
5. **Exact event date** — confirms whether the 2-3 day scope cuts in §4 are final, or whether there's slightly more room than stated.

---

## 11. Edge Cases

- **Self-scan**: blocked with a clear message ("That's your own code!").
- **Re-scanning an existing connection**: no-op, no duplicate row, no double count — show "Already connected" instead of an error.
- **Duplicate registration (same email twice)**: reject with "You're already registered — check your email for your login link" and optionally resend the link.
- **Lost/expired magic link**: attendee can re-enter their email on a "resend link" screen.
- **Camera permission denied**: fall back to manually entering the other person's short code (a few characters derived from their `qrToken`) to connect instead of scanning.
- **Attendee never completes step 2 (profile)**: they can still log in via magic link but are prompted to finish their profile before they can generate/see their QR code or connect with anyone.
