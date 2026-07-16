# Evento

MSME event networking PWA. See [`docs/`](./docs) for the full PRD, screen specs, feature breakdown, design system, and development plan.

**Current build status:** Login (Screen 2.0) and F1 — Attendee Import & Onboarding (Screens 1.1–1.3, 3.3) are implemented. Everything else in `docs/FEATURES.md` (matching, check-in, QR scan, leaderboard, feed, admin dashboard beyond import) is still spec-only.

## Stack

- `apps/web` — Next.js (App Router), the attendee PWA shell: `/login`, `/login/verify`, `/onboarding`, `/admin/import`.
- `apps/api` — NestJS + Prisma + PostgreSQL: `auth`, `attendees`, `admin-import`, `session`, `mail`, `whatsapp` modules.

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

## What's real vs. stubbed

| Piece | Status |
|---|---|
| Email format validation, rate limiting, enumeration-safe responses, single-use signed tokens (login + onboarding) | Real |
| Session issuance (JWT in an httpOnly cookie), shared across login and onboarding | Real |
| Postgres schema (`Attendee`, `Chapter`, `MagicLinkToken`, `OnboardingToken`, `ImportBatch`, `ImportRow`) | Real |
| CSV import: column-mapping, dedup by phone+email, per-row status reporting, mismatched-email-column flagging | Real |
| Profile setup form (business category/looking-for/offering/goals/bio), server-validated against a fixed taxonomy | Real |
| PWA installability (manifest, icon, service worker, `beforeinstallprompt` wiring) | Real, but the service worker only caches `manifest.json`/`icon.svg` — no offline write-queue yet |
| Actual email delivery | Stubbed — logs to console instead of calling Postmark/Resend |
| Actual WhatsApp delivery | Stubbed — logs to console instead of calling a WhatsApp Business API vendor |
| Payment verification | Explicitly out of scope — see `docs/PRD_v1.md`'s Open Questions |
| Admin auth (Screen 3.1) | Not built — `/admin/import` has no login gate yet |
| Everything past onboarding (directory, matching, check-in, QR scan, leaderboard, feed) | Not built yet |
