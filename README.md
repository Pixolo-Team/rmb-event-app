# Evento

MSME event networking PWA. See [`docs/`](./docs) for the full PRD, screen specs, feature breakdown, design system, and development plan.

**Current build status:** see `docs/FEATURES.md`'s Feature Index for the authoritative per-feature status. Smart Matching F2.1–F2.5, bookmarks F5, leaderboard F6, photo feed F7 and contact hand-off F10 are implemented alongside the core onboarding, check-in and exchange flows.

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

## Deployment

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the full env-var reference, release
commands, and runtime constraints (writable working dir, QR key stability, ephemeral
uploads). Quick summary below.

### `apps/web`

`API_ORIGIN` is the only variable the frontend reads. Set it to the deployed API's origin (e.g. `https://api.example.com`, no trailing slash):

| Variable | Required | Notes |
|---|---|---|
| `API_ORIGIN` | Yes | Origin of the deployed `apps/api`. Defaults to `http://localhost:4000` if unset — in production that fails silently rather than loudly, so set it explicitly. |

It has no `NEXT_PUBLIC_` prefix, so it never reaches the browser bundle. `next.config.js` reads it when the config is evaluated, which means it must exist in the Next server's own build/runtime environment — it can't be injected client-side afterwards.

**Don't bypass the rewrite by pointing the browser straight at the API.** Every page fetches relative paths (`/api/...`) and `next.config.js` proxies `/api/*` and `/uploads/*` through to `API_ORIGIN`, so the browser only ever sees the web origin. The session cookies (`session.service.ts`, `admin-session.service.ts`) are host-only with `sameSite: "lax"` — a cross-origin call from the browser to the API would silently drop them and every authed request would 401.

`NODE_ENV` is set to `production` by `next build`/`next start` automatically. It gates the `?preview=1` mock-data mode and the planned-but-unbuilt menu entries, which correctly disappear in production without any configuration.

### `apps/api`

See `apps/api/.env.example` for the annotated list. Beyond the local-dev values, production needs:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled connection (Supabase: port 6543 + `pgbouncer=true`). |
| `DIRECT_URL` | Yes | Unpooled; used only by `prisma migrate`. |
| `SESSION_JWT_SECRET` | Yes | Long random string. The default is a placeholder — change it. |
| `ADMIN_PASSWORD` | Yes | Admin login refuses to work in production if unset (no dev fallback). |
| `WEB_ORIGIN` | Yes | Origin of the deployed `apps/web`, for CORS. |
| `NODE_ENV` | Yes | Must be `production` — this is what flips session cookies to `secure` (HTTPS-only). |
| `PORT` | Host-dependent | Many hosts inject this themselves. |
| `SMTP_*`, `MAIL_FROM` | No | Unset → magic links are logged instead of emailed. Required for real logins by anyone without terminal access. |

Two things to check against your host before the first deploy: uploads are written to `<cwd>/uploads` on local disk and served via `useStaticAssets`, so a host with an ephemeral filesystem will lose attendee photos and avatars on restart; and WhatsApp delivery is still a console stub (see the table below), so onboarding invites won't actually reach attendees yet.

## What's real vs. stubbed

| Piece | Status |
|---|---|
| Email format validation, rate limiting, explicit unknown-email recovery, single-use signed tokens (login + onboarding) | Real — the invite-only pilot intentionally reports unregistered emails so attendees can correct the address or contact the organizer; see `docs/SCREENS.md` Screen 2.0 |
| Session issuance (JWT in an httpOnly cookie), shared across login and onboarding | Real |
| Postgres schema (`Attendee`, `Chapter`, `BusinessCategoryOption`, `OfferingOption`, `CityOption`, `MagicLinkToken`, `OnboardingToken`, `ImportBatch`, `ImportRow`, `Event`, `CheckIn`) | Real |
| CSV import: column-mapping, dedup by phone+email, per-row status reporting, mismatched-email-column flagging | Real |
| Required three-step profile setup (DB City → category/dependent offerings → networking goals), with searchable custom controls and per-step validation | Real |
| PWA installability (responsive install modal, installed-mode detection, native prompt, Add to Home Screen and browser fallbacks) | Real, but the service worker only caches `manifest.json`/`icon.svg` — no route/asset pre-caching for a cold start while offline |
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
| My Connections (`/connections`) — cached Already Met + Want to Meet lists, sorting, Call/WhatsApp, private notes, bookmarks and non-destructive removal | Real (F4.3 + F5) |
| Save to phone contacts — local `.vcf` generation from attendee profiles and connection cards, handed to the native Contacts flow | Real (F10.1), works offline |
| Admin auth (Screen 3.1) | Real (PF3) — shared organizer login (`ADMIN_USERNAME`/`ADMIN_PASSWORD`), separate `evento_admin_session` cookie with a 30-min sliding idle timeout; every `/admin/*` API route is behind `AdminGuard` and the web admin pages behind `AdminGate` (`/admin/login`) |
| Bookmarks (F5), leaderboard (F6), event photo feed (F7), feedback (F8), event summary/export (F9) | Real |
| Attendee personal stats (`/profile` → "Your stats": people met, rank, bookmarks, photos, live time at event) | Real (F11.1) — `GET /attendees/me/stats`, cache-first and offline-tolerant |
| Admin analytics dashboard + export (F11.2/F11.3) | Not built yet |
