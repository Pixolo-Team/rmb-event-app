# EVENTO - Backend Architecture

Backend plan for the single-day Evento pilot described in [`PRD_v1.md`](./PRD_v1.md) and [`SCREENS.md`](./SCREENS.md). The goal is to support ~200 attendees, offline-first event flows, admin operations, reference-backed onboarding, QR-based meeting exchange, feedback, exports, and post-event summaries without adding infrastructure that slows the pilot build.

---

## Architecture

**Decision: modular monolith.**

Evento should ship as one NestJS API service organized into feature modules, backed by **Supabase as the managed backend platform**. Supabase will provide hosted PostgreSQL, file storage, backups, and dashboard operations; NestJS remains the custom business-logic API for auth rules, imports, matching, QR scans, admin analytics, and exports.

This is the right fit because:
- The pilot is a single event with ~200 attendees, not a multi-region or multi-tenant platform yet.
- Most data is relational and tightly connected: attendees, check-ins, meetings, bookmarks, feed posts, feedback, and analytics.
- The build window is under one month, so deployment, debugging, and data migrations need to stay simple.
- Event-day reliability matters more than theoretical independent scaling. A single API with clear module boundaries is easier to rehearse and recover.
- The PRD asks for a modular matching engine that can later be replaced with semantic/AI matching. That needs a code boundary, not a separate service yet.
- Directory, onboarding, and filters now depend on active database reference records for business categories, business tags/goals, chapters, and a nationwide `City, State/UT` catalogue. Those belong in the same API/database boundary as attendee profile data.

**Not microservices for v1.** There is no service that needs independent ownership, independent scaling, or separate deployment in the pilot. Splitting auth, matching, feed, and analytics into separate deployables would add network failure modes and slow iteration.

**Not pure serverless for v1.** Serverless can work for a small API, but a long-running Node service is simpler with Prisma, upload processing, background workers, polling dashboards, and predictable event-day warm behavior. Supabase keeps the data/storage side managed without forcing all backend logic into edge functions.

**Supabase role in the backend.** Supabase is the backend platform for persistence and storage, not the replacement for the NestJS API in v1. We use Supabase Postgres through Prisma, Supabase Storage for uploaded/generated files, and Supabase dashboard/backups for operations. We do **not** use Supabase Auth for attendee login in the pilot because the PRD requires registration-list-bound, enumeration-safe magic links controlled by our API.

**Runtime shape:**

```text
Next.js PWA / Admin Dashboard
        |
        | HTTPS REST API, secure cookies
        v
NestJS API modular monolith
        |
        | Prisma
        v
Supabase Postgres
        |
        +-- Supabase Storage for photos, badges, exports
        +-- SMTP provider for magic-link email
        +-- Optional Redis-backed job queue for async work
```

Real-time behavior should use polling for the pilot:
- Leaderboard: poll every 5-10 seconds.
- Admin analytics/check-ins: poll every 5-30 seconds depending on screen.
- Feed refresh: pull-to-refresh plus periodic polling.

WebSockets can be added in Phase 2 if the pilot proves that live updates are a differentiator.

---

## Tech Stack

| Layer | Choice | Reasoning |
|---|---|---|
| API framework | NestJS + TypeScript | Already selected in the PRD and present in the repo. Gives strong module boundaries, guards, DTO validation, and testable services. |
| Backend platform | Supabase | Chosen managed backend platform for hosted Postgres, Storage, backups, dashboard operations, and environment separation. Keeps ops light for the pilot. |
| Database | Supabase Postgres | Fits relationship-heavy data: attendees, meetings, check-ins, bookmarks, feed, feedback, and admin analytics. |
| ORM | Prisma | Already present. Strong typing, migrations, and quick schema evolution for a pilot. Prisma connects to Supabase using pooled runtime and direct migration URLs. |
| Auth/session | JWT in secure, HTTP-only cookies | Works for the PWA and admin dashboard without exposing tokens to JavaScript. Keeps mobile web login simple. |
| Validation | `class-validator` / DTO validation | Already in the API dependencies and aligns with NestJS request validation. |
| File upload parsing | Multer for API-mediated uploads; direct-to-storage later | Good enough for pilot admin CSV uploads and small photo flows. Direct signed uploads can be introduced for larger media. |
| CSV/XLSX import | `csv-parse` plus an XLSX parser such as `xlsx` or `exceljs` | The admin upload accepts CSV and Excel files. Column mapping still owns the Google Form export quirks. |
| Email | Nodemailer over SMTP | Already present. The current Gmail SMTP plan is enough for ~200 attendees, with an easy swap to a transactional provider if deliverability is weak. |
| Background jobs | BullMQ + Redis, or a simple in-process scheduler for MVP | Use a real queue if deploying workers is available. For the pilot, short async jobs can start in-process, but exports/media jobs should be queue-ready. |
| Object storage | Supabase Storage | Keeps feed photos, profile photos, badge PDFs, and exports outside the database while staying inside the chosen backend platform. |
| QR generation | Server-generated signed opaque QR payloads | QR must not expose phone/email and must be verifiable when scanned. |
| PDF/export | Server-side CSV/vCard generation; PDF generation for badges/reports | Required for badges, contact exports, feedback exports, and organizer reports. |

---

## Authentication Strategy

### Attendee Auth

Attendees use **email magic-link login only**.

Flow:
1. Admin manually posts one generic app link in the WhatsApp group.
2. Attendee opens the link and enters their registered email.
3. API returns the same neutral response whether or not the email exists.
4. If the email matches an imported attendee, the API creates a single-use token, stores only its hash, and emails a signed link.
5. The attendee opens the link within 30 minutes.
6. The verify page exchanges the token, immediately strips it from the URL/history, and loads no third-party resources while the token is present.
7. API marks the token used and issues a session cookie.
8. First-time attendees go to profile setup; completed attendees go to Home.

Implementation rules:
- No passwords for attendees.
- No WhatsApp-delivered auth links.
- No SMS OTP for the pilot.
- Store magic-link token hashes, not raw tokens.
- Token expiry: 30 minutes.
- Token use: single-use, invalidated immediately after verification.
- Response text must be enumeration-safe: "If that email is on the guest list, we've sent a link."
- Rate limit by email, IP/device fingerprint where available, and user agent family.
- The session is never carried in a URL. It lives only in a secure, HTTP-only cookie after token exchange.
- The authenticated attendee navigation shell must only render after session verification and required onboarding completion, so attendee identity cannot flash on login, verification, expired-link, or focused onboarding screens.

### Admin Auth

Admins and staff use **email/password login** with role-based access.

Roles:
- `organizer`: full admin dashboard, import, event settings, analytics, moderation, exports.
- `staff`: check-in scanner, attendee lookup, resend magic link/help actions.
- `viewer`: read-only dashboard for venue display or stakeholder review.

Admin implementation:
- Store password hashes with Argon2 or bcrypt.
- Lock or delay after repeated failed attempts.
- Session via secure, HTTP-only cookie.
- Shorter idle timeout than attendees, especially for shared devices.
- Require CSRF protection on state-changing admin requests.

### JWT, Sessions, and OAuth

Use **JWT-backed sessions in HTTP-only cookies** for both attendee and admin sessions. The cookie holds the session token; authorization is enforced server-side by guards that resolve the actor and role.

Recommended session claims:
- `sub`: attendee/admin ID.
- `type`: `attendee` or `admin`.
- `role`: admin role if applicable.
- `eventId`: current event context.
- `iat` / `exp`.

OAuth is **not needed for the pilot**. It can be added later for organizer/admin login with Google Workspace, but it should not be in the attendee flow because the PRD requires registration-list-bound magic-link access.

---

## Core Services

Keep these as NestJS modules inside the monolith. Each module owns its data writes and exposes methods to other modules through service classes.

### Auth Service

Owns:
- Attendee magic-link request and verification.
- Admin login/logout.
- Session issuance and cookie settings.
- Rate limiting for auth attempts.
- Token hashing and expiry.

Does not own:
- Profile completion rules.
- Admin import identity creation, except helper functions for token/session creation.

### Attendee Service

Owns:
- Attendee records imported from registration.
- Profile setup and profile edits.
- Directory reads, search, filters, and full pre-registered attendee visibility.
- "Me" endpoint.
- QR token association with attendee identity.
- Optional table assignment display and admin-managed updates.

Important rule: attendee email/phone are imported identity fields. Attendees can view them but should not self-edit them in v1.

Directory rule: show the full pre-registered attendee list for planning, expose check-in state and a checked-in/not-checked-in filter, and exclude the current attendee from their own directory results.

### Reference Data Service

Owns:
- Active business-category records.
- Active business tags used by both "looking for" and "offering".
- Active goal options.
- Active chapter records.
- Nationwide city catalogue displayed as `City, State/UT`.
- Directory/profile option endpoints that return reference records even when no attendee results match the current filters.

Company options remain attendee-derived. Reference records should be deactivated rather than hard-deleted so old profile values remain understandable.

### Admin Import Service

Owns:
- CSV/XLSX upload parsing.
- Column mapping for Google Form exports.
- Email mismatch flagging.
- Deduplication by email and phone.
- Import batch and row reporting.
- QR token creation for newly imported attendees.
- Optional imported city/business category mapping against active reference records.
- Optional imported table numbers when the source file includes them.

Payment screenshots and payment details are ignored. The PRD is explicit that payment verification is outside Evento.

### Event Settings Service

Owns:
- Event metadata.
- Venue latitude/longitude.
- Check-in radius.
- Event start/end times.
- Feedback prompt time.
- Feature flags for event-day behavior.

The first pilot can have one event record, but the schema should include `eventId` on operational tables so v2 can support multiple events without a rewrite.

### Matching Service

Owns:
- Rule-based match score calculation.
- Match reason generation.
- Top match list.
- Chapter relationship wording.

The service should consume profile tags and event attendance data, but it should not mutate profile data. This keeps it replaceable with semantic matching in Phase 2.

### Check-In Service

Owns:
- Venue config reads for client-side proximity detection.
- Confirmed geolocation-assisted check-in after the attendee taps "Check in".
- Manual attendee check-in.
- Staff QR check-in.
- Duplicate check-in prevention.
- Check-in method breakdown for admin.

Important rule: geolocation can show an "arrived" state, but the backend must not record a check-in until the attendee or staff deliberately confirms it. The checked-in state is a proof screen shown at the registration counter, not a background toast.

Writes must be idempotent because offline clients may replay check-in events. Store method/evidence fields such as geolocation accuracy and distance when available, but treat client-provided location as support data rather than a security boundary.

### QR / Meeting Service

Owns:
- QR payload verification.
- Self-scan rejection.
- Meeting record creation.
- Contact exchange semantics.
- Duplicate pair detection.
- Leaderboard source-of-truth data.

Meeting uniqueness should be enforced on an unordered attendee pair per event. A scan replay must not create a second leaderboard point.

### Bookmark and Connections Service

Owns:
- Want-to-meet bookmarks.
- Private connection notes.
- Combined "My Connections" read model.
- Remove/unbookmark behavior.

Notes are private to the attendee who wrote them.

### Leaderboard Service

Owns:
- Top 20 ranking query.
- Current attendee rank.
- Tie handling.
- Cached aggregate output for polling.

Leaderboard is computed from meetings, not manually stored as source-of-truth.

### Feed Service

Owns:
- Photo post records.
- Caption validation.
- Likes.
- Comments.
- Self-delete.
- Admin soft-delete/moderation.

The feed is unmoderated before publication in v1, but admin deletion history should be retained.

### Media Service

Owns:
- Upload validation.
- Image compression or resizing.
- Object storage writes.
- Signed read/write URL creation if direct upload is used.
- Deletion/retention policy for media.

The database stores object keys and public/CDN URLs, not binary files.

### Feedback Service

Owns:
- Attendee feedback submission.
- Rating distribution.
- Average rating.
- Feedback CSV export.

Allow resubmission only if the product wants "latest response wins"; otherwise enforce one response per attendee per event.

### Analytics Service

Owns:
- Admin dashboard aggregates.
- Engagement metrics: opened app, completed profile, checked in, scanned QR, posted photo, submitted feedback.
- Exportable organizer report data.

This service reads from operational tables. It should avoid owning primary writes.

### App Shell / Feature Flag Service

Owns:
- Enabled/disabled feature destinations for the authenticated attendee drawer.
- Production rule: hide unfinished destinations rather than linking to placeholders.
- Development rule: planned destinations may be returned as disabled with a "Soon" label.
- Session-aware navigation metadata after required onboarding is complete.

The frontend owns drawer rendering and focus behavior, but the backend should provide reliable session state and feature availability so private attendee data is not rendered before auth resolves.

### Export Service

Owns:
- Connection CSV.
- vCard files.
- Badge PDFs.
- Admin analytics exports.
- Feedback exports.

Large exports should run as background jobs.

### Notification/Mail Service

Owns:
- Transactional email delivery.
- Magic-link email templates.
- Delivery logging.

It does not own WhatsApp reminders. The admin manually posts WhatsApp group reminders for v1.

---

## Background Jobs

The backend should be designed so these can run through a queue. If time is tight, the MVP can start with in-process jobs for small workloads, but the boundaries should be queue-friendly.

Required or strongly recommended jobs:
- **Magic-link email send:** async email delivery with retry and failure logging.
- **Reference data seed/import:** load and maintain business categories, business tags, goals, chapters, and the Indian `City, State/UT` catalogue.
- **Import processing:** parse uploaded CSV/XLSX, normalize rows, flag issues, deduplicate, map known reference values, preserve legacy city/category values when needed, and generate QR tokens.
- **Badge PDF generation:** generate all or selected attendee badges after import.
- **Image processing:** compress feed/profile photos, strip EXIF metadata, create thumbnails.
- **Feed post finalization:** publish queued offline uploads after media processing.
- **Analytics snapshot:** periodically precompute event dashboard metrics during event hours.
- **Leaderboard cache refresh:** refresh every 5-10 seconds during event hours if query cost becomes noticeable.
- **Post-event summary generation:** compute per-attendee summary after the event ends.
- **Export generation:** CSV, vCard, feedback exports, and admin reports.
- **Cleanup:** expire unused magic-link tokens, delete abandoned uploads, clear old temp files.
- **Sync conflict audit:** record repeated duplicate offline writes for diagnostics without blocking users.

Nice-to-have jobs:
- **Email deliverability report:** count sent/failed magic links before event day.
- **Event-day health check:** periodic checks for DB connectivity, mail provider status, storage status, and API latency.

---

## File and Media Storage

Use **Supabase Storage** for all user-uploaded or generated files.

Recommended buckets/prefixes:
- `profile-photos/`: imported attendee photos.
- `feed-photos/original/`: original uploads, private if retained.
- `feed-photos/processed/`: compressed display images.
- `badges/`: generated badge PDFs.
- `exports/`: temporary CSV/vCard/PDF exports.
- `import-files/`: optional raw admin uploads for audit/debugging, with short retention.

Database records should store:
- Object key.
- Public or signed URL metadata.
- Media type.
- Size.
- Uploaded by.
- Created/deleted timestamps.

Rules:
- Do not store image binaries in PostgreSQL.
- Strip EXIF metadata from uploaded images.
- Compress attendee feed photos before publication.
- Enforce file type and size limits server-side.
- Prefer signed URLs for admin-only/private files.
- Public feed images can be CDN-cached, but deleted posts must be hidden immediately by database state even if the image URL still exists briefly.

For v1, API-mediated uploads through NestJS are acceptable. If feed usage grows, move to direct Supabase Storage signed uploads so the API does not carry large photo traffic.

---

## Third-Party Integrations

### Required for v1

**SMTP email provider**
- Used for attendee magic links.
- Current plan: Gmail SMTP through Nodemailer.
- Swap path: Postmark, Resend, SendGrid, or SES by changing SMTP/API adapter configuration.

**Supabase**
- Chosen backend platform for the pilot.
- Provides hosted Postgres, Storage, backups, dashboard operations, and environment-level project separation.
- NestJS connects to Supabase Postgres through Prisma.
- Files are stored in Supabase Storage buckets.

**Supabase Postgres**
- Local: Docker Postgres.
- Hosted: Supabase Postgres.
- Prisma uses `DATABASE_URL` at runtime and `DIRECT_URL` for migrations.

**Supabase Storage**
- Used for profile photos, feed photos, badges, and exports.
- Buckets should be separated by environment or by Supabase project so staging files cannot mix with production files.

### Optional for v1

**Redis**
- Needed if using BullMQ for background jobs and rate limiting.
- Can be deferred if using in-process jobs, but production benefits from Redis-backed queues.

**Error monitoring**
- Sentry or equivalent for API and frontend errors.
- Very useful on event day because attendee devices and network conditions will vary.

**Analytics/logging**
- Structured logs from the API plus a hosted log drain.
- Product analytics can be implemented internally through event tables first.

### Explicitly not integrated in v1

**WhatsApp Business API**
- Not used. Admin manually posts the app link, reminders, and follow-up in the existing WhatsApp group.
- Attendee-to-attendee follow-up uses `wa.me` deep links initiated by the attendee.

**Payment provider**
- Not used. Payment verification happens outside Evento before the attendee CSV is imported.

**OAuth**
- Not used for attendee login. Optional later for admin convenience.

**Supabase Auth**
- Not used for v1 attendee login. The custom NestJS magic-link flow remains the auth source because it must be tied to imported attendees, neutral login responses, rate limits, and single-use token semantics.

**Maps API**
- Not needed for v1. Admin can enter venue coordinates manually. Map picking is Phase 2.

---

## Environment Breakdown

### Local Development

Purpose:
- Fast iteration for engineers.
- Local database and stubbed external services.

Characteristics:
- Next.js on `localhost:3000`.
- NestJS on `localhost:4000`.
- Docker Postgres from `docker-compose.yml`.
- Magic links logged to the API console and optionally returned in dev responses.
- File storage can use a Supabase dev bucket, with a local stub only for quick offline development.
- Relaxed cookie `secure` setting for localhost only.

Required env:
- `DATABASE_URL`
- `DIRECT_URL`
- `SESSION_JWT_SECRET`
- `WEB_ORIGIN`
- `NODE_ENV=development`
- Supabase project URL/storage credentials when using Supabase Storage locally.
- Optional SMTP credentials.

### Staging

Purpose:
- Full rehearsal before the event.
- Organizer/staff acceptance testing.
- Venue dry run.

Characteristics:
- Separate Supabase project, or a clearly isolated Supabase staging database/storage setup.
- Real SMTP sending from the chosen sender account.
- Real Supabase Storage buckets.
- Production-like secure cookies and CORS.
- Seed/import test attendees only.
- Safe test event data that can be reset.
- Error monitoring enabled.

Staging must be used to test:
- Magic-link deliverability.
- Admin import with the real Google Form export shape.
- Reference data seeding for business categories, tags, goals, chapters, and the `City, State/UT` city catalogue.
- Low-end Android PWA install and QR scanning.
- Offline sync replay.
- Geolocation radius at the venue.
- Badge PDF printing.

### Production

Purpose:
- Live event and post-event summaries.

Characteristics:
- Dedicated Supabase production project/database.
- Backups enabled.
- Real SMTP.
- Real Supabase Storage buckets.
- Strict CORS to production frontend origin.
- Secure cookies only.
- Rate limiting enabled.
- Structured logs retained through the event and post-event window.
- Admin accounts restricted to organizer/staff.

Production deployment should be frozen before the event except for critical fixes. Run the final attendee import and badge generation only after staging dry run passes.

### Preview / PR Environments

Optional but useful for web/admin UI review.

Rules:
- No production data.
- No real attendee emails unless explicitly configured.
- Can share a staging API or use isolated preview data.

---

## Security Considerations

### Identity and Access

- Use enumeration-safe magic-link responses.
- Rate limit magic-link requests per email and source.
- Hash magic-link tokens at rest.
- Invalidate magic links after one use.
- Strip magic-link tokens from browser address/history immediately after verification with `history.replaceState`.
- Do not load third-party resources on the magic-link verification page while a raw token is present, preventing token leakage through `Referer`.
- Store sessions in HTTP-only, secure, SameSite cookies.
- Keep attendee and admin guards separate.
- Enforce role-based authorization on every `/admin/*` route.
- Add admin account lockout or progressive delay after failed login attempts.
- Do not render attendee identity, navigation, or cached private data until the API has confirmed a valid session and required onboarding state.

### CSRF and CORS

- Restrict CORS to the configured web origin.
- Use SameSite cookies.
- Add CSRF tokens for state-changing browser requests, especially admin actions.
- Do not allow wildcard origins in staging or production.

### QR Security

- QR payloads must be opaque and signed.
- QR must not contain phone, email, or sequential IDs.
- Verify signature server-side before accepting check-ins or meetings.
- Reject self-scans.
- Enforce meeting uniqueness by unordered attendee pair per event.
- Treat offline scan submissions as untrusted until verified on sync.

### Data Protection

- Minimize PII in logs.
- Never log raw magic-link tokens.
- Never log raw QR payloads or Supabase signed upload/download URLs.
- Never log full phone numbers unless needed for an audited admin action.
- Encrypt data in transit with HTTPS/TLS.
- Use managed database encryption at rest.
- Keep profile visibility consistent with product consent copy.
- Support deletion/export requests after the pilot if attendee data persists.
- Treat Supabase service-role keys as server-only secrets. The browser should only receive public anon configuration and signed URLs scoped to the specific action.

### Upload Security

- Validate MIME type and file extension.
- Enforce file size limits.
- Strip EXIF metadata.
- Store uploads outside the web server filesystem.
- Use generated object keys, not user filenames.
- Scan or quarantine suspicious uploads if adding richer file support later.

### Input and API Safety

- Validate all DTOs server-side.
- Normalize email and phone before dedupe.
- Resolve profile dropdown values against active reference records; preserve explicitly allowed legacy imported values rather than silently inventing new options from user input.
- Validate city selections against the nationwide `City, State/UT` catalogue for new profile edits.
- Use Prisma parameterized queries; avoid raw SQL unless reviewed.
- Add idempotency keys or deterministic uniqueness for offline replay writes.
- Use pagination on directory, feed, admin lists, and exports.
- Apply request body size limits.

### Operational Security

- Keep secrets in environment variables, not source control.
- Rotate `SESSION_JWT_SECRET` if exposed.
- Use separate credentials per environment.
- Limit production database access.
- Back up production data before final import and before event day.
- Monitor API errors, mail failures, and sync failure spikes during the event.

---

## Backend Priorities for the Pilot

1. Keep the monolith cleanly modular.
2. Make all offline-replayed writes idempotent.
3. Keep reference data database-backed: business categories, business tags/goals, chapters, and cities.
4. Protect attendee identity with email-only magic links, URL-token hygiene, session-gated navigation, and opaque QR tokens.
5. Record check-ins only after deliberate attendee/staff confirmation.
6. Favor polling and cached aggregates over realtime infrastructure.
7. Keep media and generated files out of Postgres.
8. Make staging as production-like as possible before the venue dry run.
