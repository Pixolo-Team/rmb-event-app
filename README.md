# Evento

MSME event networking PWA. See [`docs/`](./docs) for the full PRD, screen specs, feature breakdown, design system, and development plan.

**Current build status:** see `docs/FEATURES.md`'s Feature Index for the authoritative per-feature status. Done so far: PF1 (PWA shell), PF2 (email magic-link auth), PF4 (offline sync engine), PF8 (dropdown reference data), F1.1 (admin CSV import), F1.2 (profile setup form), F1.3 (PWA install prompt), F1.4 (thanks screen), F2.1 (matching engine), F2.4 (attendee directory), F2.5 (individual profile + match reason), F3.1–F3.5 (venue settings, check-in, staff QR scan, badge printing — including offline queuing), and F4.1–F4.3 (own QR, QR exchange, confirmed meetings and My Connections). Everything else (admin login gate, pre-event matches screen, bookmarks, leaderboard, feed, analytics) is still spec-only.

## Stack

- `apps/web` — Next.js (App Router), the attendee PWA shell: `/login`, `/login/verify`, `/onboarding`, `/home`, `/admin/import`, `/admin/event`, `/admin/checkin`, `/admin/badges`.
- `apps/api` — NestJS + Prisma + PostgreSQL: `auth`, `attendees`, `admin-import`, `event`, `checkin`, `session`, `mail`, `whatsapp` modules.

## Setup

```bash
corepack enable
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

You need a local Postgres. Either:

```bash
docker compose up -d   # if Docker Desktop is running
```

or, if Docker isn't available:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb evento
```

If you use the Homebrew path, update `apps/api/.env`'s `DATABASE_URL` to `postgresql://$(whoami)@localhost:5432/evento?schema=public` (no password — Homebrew's default cluster trusts local connections for your OS user).

```bash
pnpm --filter api prisma migrate dev   # applies migrations/, creates the schema
pnpm --filter api prisma db seed       # creates a test attendee: radha@example.com
```

## Run

```bash
pnpm dev:api     # http://localhost:4000
pnpm dev:web     # http://localhost:3000
```

**Login:** open http://localhost:3000/login, enter `radha@example.com`. No email provider is wired up yet — the magic link is logged to the `apps/api` terminal output and also returned in the API response (dev only), shown directly on the "Check your email" screen so you can click through without checking an inbox.

**Import & onboarding:** open http://localhost:3000/admin/import and upload a CSV. Columns are auto-detected by header keyword (works with both the real Google-Form-style export and a plain `name,email,phone,business,chapter` CSV). Each successfully imported attendee gets a WhatsApp onboarding invite logged to the `apps/api` terminal (same dev-stub pattern as email) — copy the `/onboarding?token=...` link from there to walk through the profile setup → install → thanks flow.

See `apps/api/src/mail/mail.service.ts` and `apps/api/src/whatsapp/whatsapp.service.ts` for the swap points when real providers (Postmark/Resend, a WhatsApp Business API vendor — per `docs/DEVELOPMENT_PLAN.md`) are ready.

**Check-in:** after onboarding, `/home` requests geolocation and checks you in automatically if within the configured venue radius (set one at `/admin/event` first — otherwise you'll always land on the manual "Check In Manually" fallback). Staff can check attendees in by scanning their badge QR at `/admin/checkin` (camera-based), and print physical QR badges at `/admin/badges`.

## What's real vs. stubbed

| Piece | Status |
|---|---|
| Email format validation, rate limiting, enumeration-safe responses, single-use signed tokens (login + onboarding) | Real |
| Session issuance (JWT in an httpOnly cookie), shared across login and onboarding | Real |
| Postgres schema (`Attendee`, `Chapter`, `MagicLinkToken`, `OnboardingToken`, `ImportBatch`, `ImportRow`, `Event`, `CheckIn`) | Real |
| CSV import: column-mapping, dedup by phone+email, per-row status reporting, mismatched-email-column flagging | Real |
| Profile setup form (business category/looking-for/offering/goals/bio), server-validated against a fixed taxonomy | Real |
| PWA installability (manifest, icon, service worker, `beforeinstallprompt` wiring) | Real, but the service worker only caches `manifest.json`/`icon.svg` — no route/asset pre-caching for a cold start while offline |
| Home dashboard + geolocation auto check-in, manual check-in fallback (`/home`) | Real, including offline (see below) |
| Admin venue settings (`/admin/event`), live check-in dashboard + camera QR scan (`/admin/checkin`), badge printing (`/admin/badges`) | Real |
| Offline write-queue (check-ins/scans work with no connectivity, sync on reconnect) | Real — Dexie/IndexedDB queue (`apps/web/app/lib/offlineQueue.ts`), drains on the `online` event / every 15s / next load. Covers "already open, connectivity drops mid-session"; a fully offline cold start still needs the service worker pre-caching noted above |
| Actual email delivery | Stubbed — logs to console instead of calling Postmark/Resend |
| Actual WhatsApp delivery | Stubbed — logs to console instead of calling a WhatsApp Business API vendor |
| Payment verification | Explicitly out of scope — see `docs/PRD_v1.md`'s Open Questions |
| Attendee directory + individual profile (`/directory`, `/attendees/[id]`) with search/filter/sort and offline cache | Real |
| Smart matching — decoupled engine (`apps/api/src/matching/`) computing looking-for/offering overlap, shared category, same/cross-chapter reasoning; surfaced as the "Why you're a match" reason on a profile | Real (F2.1 engine + F2.5 display). The pre-event "People to meet" list (F2.3) and day-3 pre-compute cache (F2.2) still consume this engine but aren't built |
| Settings/Profile screen (`/profile`) with the attendee's own business-card QR — offline-rendered from their signed token, tap-to-enlarge with brightness boost | Real (F4.1) |
| QR scan → card exchange + confirmed meeting (`/scan`) — one scan logs a `Meeting` (canonical unordered pair, duplicate-pair protected), self-scan/unknown-code guards, offline-queued via PF4 | Real (F4.2) |
| My Connections (`/connections`) — cached Already Met list, sorting, Call/WhatsApp, per-attendee private notes and non-destructive removal | Real (F4.3). Want to Meet/bookmarks are F5; native Save to Contacts is F10 |
| Admin auth (Screen 3.1) | Not built — `/admin/import`, `/admin/event`, `/admin/checkin`, `/admin/badges` have no login gate yet |
| Everything past connections (bookmarks, leaderboard, feed, analytics) | Not built yet |
