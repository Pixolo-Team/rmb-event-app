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
| PF2 | Auth — email magic link (request + verify, session cookie) | Screen 2.0 | P0 | No | — | ✅ Done |
| PF3 | Admin login (password + session, 30-min idle timeout) | Screen 3.1 | P0 | No | — | ⬜ Not started |
| PF4 | Offline sync engine — IndexedDB write queue + background sync | — | P0 | Yes | PF1 | ⬜ Not started |
| PF5 | QR signing & verification (shared utility — signed opaque JWT payload, server-side verify) | — | P0 | — | — | ⬜ Not started |
| PF6 | API hardening — rate limiting, CORS, input validation, CSRF (currently only on auth endpoints) | — | P0 | — | — | 🟡 Partial |

**Known gap:** F1.1 (Admin CSV Import) is live at `/admin/import` with no login gate yet — PF3 needs to land and get wired in front of every `/admin/*` route before real attendee data goes through it.

---

### F1 — Attendee Onboarding & Import
*(PRD Feature 1. Depends on: Platform Foundations)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F1.1 | Admin CSV/Excel import + column-mapping UI, dedup by phone+email, per-row result report (success/duplicate/error/flagged), retry-on-failure | Screen 3.3 | P0 | No | PF3 (not yet wired) | ✅ Done |
| F1.2 | Profile Setup Form — business category (dropdown), city, looking-for/offering (multi-select dropdowns, shared taxonomy), goals, optional bio | Screen 1.1 | P0 | No | PF2 | ✅ Done |
| F1.3 | PWA install prompt (Install Now / Install Later / Skip) | Screen 1.2 | P0 | Yes | PF1, F1.2 | ✅ Done |
| F1.4 | Thanks & welcome screen | Screen 1.3 | P2 | Yes | F1.3 | ✅ Done |
| F1.5 | First-time tutorial (60s, skippable, re-accessible from Settings) | Screen 2.12 | P2 | Yes (cached) | F1.4 | ⬜ Not started |

**Feeds into:** every other epic — this is where attendee records, QR codes, and profile tags originate.

---

### F2 — Smart Attendee Matching
*(PRD Feature 2. Depends on: F1.2 — profile tags must exist)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F2.1 | Matching engine service — looking-for/offering overlap + shared business category + same/cross-chapter reasoning, decoupled module (`matching.service.ts`) | — | P1 | — | F1.2 | ⬜ Not started |
| F2.2 | Day-3 pre-computation job — runs F2.1 server-side, caches results per attendee for offline read | — | P1 | Yes (writes cache) | F2.1 | ⬜ Not started |
| F2.3 | Pre-event matches & directory (top-10 "People to meet" + fallback to full directory) | Screen 1.4 | P1 | Yes | F2.2 | ⬜ Not started |
| F2.4 | Directory / all attendees — filters (business category/company/chapter/city/checked-in), search, sort | Screen 2.2 | P1 | Yes | F1.1 | ⬜ Not started |
| F2.5 | Individual attendee profile — full detail + match-reason display | Screen 2.3 | P1 | Yes | F2.1, F2.4 | ⬜ Not started |

**Design note:** matching logic must live in its own service module (F2.1) — a stated non-functional requirement, not just tidiness, because Phase 2 swaps the algorithm without rewriting the profile schema.

---

### F3 — Attendance & Check-In
*(PRD Feature 3. Depends on: F1.1 — attendee + QR must exist. The gating event of event day.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F3.1 | Admin event settings — venue lat/lng/radius config, validated (lat ±90, long ±180, radius 100–5000m) | Screen 3.2A | P0 | No | PF3 | ⬜ Not started |
| F3.2 | Home/Dashboard — silent geolocation auto-check-in (5s timeout, configured radius) | Screen 2.1 | P0 | Partial (queued, synced later) | F3.1, F1.1, PF4 | ⬜ Not started |
| F3.3 | Manual check-in fallback button + retry on network error | Screen 2.1A | P0 | Partial | F3.2 | ⬜ Not started |
| F3.4 | Admin check-in management — staff-assisted QR scan at desk + live dashboard (counter, method breakdown, straggler list) | Screen 3.4 | P0 | Partial (staff scan works offline, syncs later) | F3.1, PF5 | ⬜ Not started |
| F3.5 | Print badges (QR codes) — the fallback-of-the-fallback for dead/lost phones | Screen 3.7 | P0 | — | PF5 | ⬜ Not started |

**Feeds into:** F4 (meetings only make sense for present attendees), F6/F11 (analytics baseline).

---

### F4 — Digital Business Card Exchange & "Met" Detection
*(PRD Feature 4. Depends on: F1.1 (QR codes), F3 (conceptually — you scan people who are at the event). The product's core loop.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F4.1 | Settings/Profile screen + own-QR display (top of screen, offline-rendered, tap-to-enlarge with brightness boost) | Screen 2.11 | P0 | Yes | PF5, F1.2 | ⬜ Not started |
| F4.2 | QR scanner & unified exchange — one scan swaps contact details and logs a confirmed meeting, duplicate-pair protection | Screen 2.4 | P0 | Yes (queued, synced) | F4.1, F3.2, PF4 | ⬜ Not started |
| F4.3 | My Connections — Already Met tab (name/company/phone/bio/table, Call/WhatsApp/Save/Remove actions, private note) | Screen 2.6 (partial) | P0 | Yes | F4.2 | ⬜ Not started |

**Feeds into:** F5 (bookmarks share this view), F6 (each meeting = 1 leaderboard point), F9 (summary data), F10 (vCard source).

---

### F5 — Bookmark & Interactions
*(PRD Feature 5. Depends on: F2 — bookmarking mainly happens off the match/directory list.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F5.1 | One-tap bookmark/unbookmark from any directory or match card | Directory/Match cards | P1 | Yes (synced later) | F2.3, F2.4 | ⬜ Not started |
| F5.2 | My Connections — Want to Meet tab (completes the two-tab screen alongside F4.3) | Screen 2.6 (complete) | P1 | Yes | F5.1, F4.3 | ⬜ Not started |

---

### F6 — Gamification: Met Counter & Leaderboard
*(PRD Feature 6. Depends on: F4 — leaderboard is a read-aggregate over meeting records.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F6.1 | Leaderboard aggregate endpoint + polling (top 20 + own rank, 5–10s refresh, no per-scan flicker) | — | P1 | Read: yes | F4.2 | ⬜ Not started |
| F6.2 | Mobile leaderboard screen (personal stat, tap to expand, own row highlighted) | Screen 2.5 | P1 | Read: yes | F6.1 | ⬜ Not started |
| F6.3 | Venue display leaderboard view (public screen, no login) | — | P1 | Read: yes | F6.1 | ⬜ Not started |

**Feeds into:** F9 (rank in summary), F11 (admin analytics). No tiered badges/sponsor prizes in this pilot (Phase 2).

---

### F7 — Event Photo Feed
*(PRD Feature 7. Depends on: F3 — posting implies you're at the event. Secondary engagement — first to trim under time pressure.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F7.1 | Post photo — camera/library, basic edit (crop/brightness/filter), caption (200 chars, emoji) | Screen 2.7 | P2 | No | F3.2 | ⬜ Not started |
| F7.2 | Event photo feed — chronological view, like, flat comments, self-serve delete | Screen 2.8 | P2 | Read: yes | F7.1 | ⬜ Not started |
| F7.3 | Admin feed moderation — view-all, instant delete, deleted-post history log | Screen 3.5 | P2 | No | F7.2 | ⬜ Not started |

---

### F8 — Feedback & Review
*(PRD Feature 8. Depends on: F3 — needs attendees to have actually attended.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F8.1 | Feedback form — 5-star + optional comment (500 chars), skippable, non-blocking submit | Screen 2.9 | P1 | No | F3.2 | ⬜ Not started |
| F8.2 | Admin feedback analytics — avg rating, distribution, searchable comments, CSV export | Screen 3.6 | P1 | No | F8.1 | ⬜ Not started |

**Feeds into:** F11 (rolls into admin analytics).

---

### F9 — Event Summary & Post-Event Follow-Up
*(PRD Feature 9. Depends on: F4 (connections data), F6 (rank). The "leave with something" promise.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F9.1 | Event summary screen — people met, cards collected, rank, top 5 connections | Screen 2.10 | P1 | Partial (cached) | F4.3, F6.1 | ⬜ Not started |
| F9.2 | Connections export (CSV/vCard) + WhatsApp share (`wa.me` deep link, no vendor) | Screen 2.10 (actions) | P1 | No | F9.1 | ⬜ Not started |

**Note:** no Day+1 follow-up scheduler to build — the follow-up nudge is a manual admin WhatsApp post per the runbook, not an app feature.

---

### F10 — Save as Contact (vCard)
*(PRD Feature 10. Depends on: F4 — needs a connection record to export. Small, self-contained.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F10.1 | One-tap vCard (.vcf) generation + native contact hand-off, "contact exists — update?" handling | Action on Screen 2.3/2.6 | P2 | Yes | F4.3 | ⬜ Not started |

---

### F11 — Analytics (Attendee-Facing & Admin-Facing)
*(PRD Feature 11. Depends on: F3, F4, F6, F8 — this epic has no data of its own, it's a view over everything else.)*

| ID | Feature | Screen(s) | Priority | Offline | Depends on | Status |
|---|---|---|---|---|---|---|
| F11.1 | Attendee personal stats (people met, rank, bookmarks, photos, time at event) | Part of Home/Settings | P1 | Yes (cached) | F4.3, F6.1 | ⬜ Not started |
| F11.2 | Admin analytics overview dashboard (check-ins, meetings, avg/attendee, engagement %, time-series) | Screen 3.2 | P1 | No | F3.4, F4.2, F6.1, F8.1 | ⬜ Not started |
| F11.3 | Admin analytics export (CSV/PDF for stakeholder/sponsor reporting) | Part of Screen 3.2 | P1 | No | F11.2 | ⬜ Not started |

---

## Cross-Cutting UI States (not separate build units)

`SCREENS.md` Module 4 (network error/offline banner, sync-status/queue, loading skeletons) and Module 5 (toasts) aren't independently shippable features — they're acceptance criteria baked into whichever feature above renders them. Don't schedule them as their own row; do check for them in each feature's review before marking it Done.

---

## Suggested Build Sequence

Ordered by dependency chain, not by epic number — this is the order to pick features up in for the fastest path to a demoable pilot. Each row is sized to be buildable and shippable on its own; compress or parallelize across people if more than one engineer is available.

1. **Platform Foundations** — PF1 → PF2 → PF5 → PF4 → PF6 (PF3 Admin Login can slot in alongside F1.1)
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
