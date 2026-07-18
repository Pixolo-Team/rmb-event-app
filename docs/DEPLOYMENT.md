# Deployment

How to deploy Evento (`apps/api` NestJS backend + `apps/web` Next.js frontend) and
the runtime constraints that a build alone does not catch. See also the annotated
`apps/api/.env.example` and `apps/web/.env.example`.

## Build & release commands

**Backend (`apps/api`)**

```bash
pnpm install                 # postinstall runs `prisma generate`
pnpm --filter api build      # runs `prisma generate && nest build`
pnpm --filter api exec prisma migrate deploy   # apply migrations to the prod DB (uses DIRECT_URL)
node apps/api/dist/main.js   # start (or: pnpm --filter api start:prod)
```

`prisma migrate deploy` is a **separate release step** — the build only generates the
client, it does not touch the database. Run it against production before serving traffic.

**Frontend (`apps/web`)**

```bash
pnpm install
pnpm --filter web build      # needs API_ORIGIN set (see below)
pnpm --filter web start
```

## Required environment variables

### `apps/api`

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled connection (Supabase: port 6543 + `pgbouncer=true`). |
| `DIRECT_URL` | Yes | Unpooled; used only by `prisma migrate`. |
| `SESSION_JWT_SECRET` | Yes | Long random string. The `.env.example` value is a placeholder — change it. |
| `ADMIN_PASSWORD` | Yes | Admin login refuses to start-serving admin routes in production if unset (no dev fallback). |
| `WEB_ORIGIN` | Yes | Origin of the deployed `apps/web`, for CORS. **Boot throws if unset in production** (by design). |
| `NODE_ENV` | Yes | Must be `production` — this is what flips session/CSRF cookies to `secure` (HTTPS-only). |
| `QR_PRIVATE_KEY` | See #2 | RSA private key for QR signing. Required on ephemeral/multi-instance hosts — see below. |
| `PORT` | Host-dependent | Many hosts inject this. The server binds `0.0.0.0`. |
| `SMTP_*`, `MAIL_FROM` | No | Unset → magic links are logged instead of emailed. |

### `apps/web`

| Variable | Required | Notes |
|---|---|---|
| `API_ORIGIN` | Yes | Origin of the deployed `apps/api`, e.g. `https://api.example.com`. Defaults to `http://localhost:4000` if unset. Server-side only (no `NEXT_PUBLIC_` prefix); read when `next.config.js` is evaluated. |

Do **not** point the browser directly at the API — every page fetches relative `/api/*`
paths that `next.config.js` proxies to `API_ORIGIN`, and the session cookies are host-only
`sameSite=lax`, so a cross-origin call would drop them and every authed request would 401.

## Known runtime constraints

### 1. Writable working directory — **hardened**

The app writes to `process.cwd()`: `uploads/` (photo/avatar storage) and `.keys/`
(QR keys). Previously a **read-only filesystem crashed boot**. These writes are now
best-effort — on a read-only FS the app logs a warning and starts anyway. Consequence:
file uploads then fail at request time unless a writable volume is mounted or object
storage is wired up (see #3). Verified: the API boots on a read-only working directory.

### 2. QR signing keys must be stable in production — **hardened, needs config**

QR tokens (PF5) are RSA-signed. The signing key is resolved in this order:

1. `QR_PRIVATE_KEY` env var (raw or base64 PEM) — **use this in production**.
2. Persisted `.keys/*.pem` files (dev convenience / persistent-volume hosts).
3. A freshly generated ephemeral pair (last resort; logs a warning).

If you rely on (3) on an **ephemeral filesystem** the key changes on every restart, and
with **multiple instances** each replica has a different key. Signed QR badges then fail
signature verification and fall back to a plain DB lookup of the stored token — check-in
still works, but the tamper-proofing provides no value. **Set `QR_PRIVATE_KEY`** so the
key is stable across restarts and shared by every instance. Generate one:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 | base64 | tr -d '\n'
```

Verified: a token signed by one instance verifies in another when both share
`QR_PRIVATE_KEY`, and tampered tokens are still rejected.

### 3. Uploads on an ephemeral filesystem are lost on restart — **documented**

Uploaded photos/avatars are written to `uploads/` on local disk and served via
`useStaticAssets`. On a host with an ephemeral filesystem they vanish on every restart
or redeploy. For a real event, mount a persistent volume or move uploads to object
storage. (Not yet implemented — tracked here as a deploy requirement.)

## Pre-deploy checklist

- [ ] All required env vars set (tables above); `NODE_ENV=production`.
- [ ] `QR_PRIVATE_KEY` set if the host is ephemeral or runs >1 instance (#2).
- [ ] `prisma migrate deploy` run against the production DB.
- [ ] Writable volume mounted for `uploads/`, or object storage wired up (#3).
- [ ] `WEB_ORIGIN` (api) and `API_ORIGIN` (web) point at each other's deployed origins.
