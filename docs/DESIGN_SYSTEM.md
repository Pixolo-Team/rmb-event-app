# EVENTO — Design System v1.0

**Reference:** LinkedIn / Facebook-familiar patterns, tuned for a live one-day MSME networking event.

| Attribute | Value |
|-----------|-------|
| Document Status | v1.0 |
| Companion file | [`DESIGN_SYSTEM.html`](./DESIGN_SYSTEM.html) — live, styled reference with real components and applied mobile/admin screens |
| Primary surface | Attendee PWA (mobile, 360–428px) |
| Secondary surface | Organizer admin dashboard (desktop, 1024px+) |
| Tertiary surface | Staff check-in tablet (768px) |
| Stack | Next.js (frontend, PWA) + NestJS (backend) |

> Open `DESIGN_SYSTEM.html` in a browser to see every token and component actually rendered — buttons, cards, the leaderboard, phone mockups of the attendee app, and the organizer dashboard frame. This file is the token/spec reference for implementation (naming, values, usage rules).

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Color](#color)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Radius & Elevation](#radius--elevation)
6. [Iconography & Motion](#iconography--motion)
7. [Components](#components)
8. [Applied Patterns](#applied-patterns)
9. [Accessibility & Performance](#accessibility--performance)
10. [Voice & Content](#voice--content)

---

## Design Principles

Evento borrows the trust-network visual language of LinkedIn and Facebook — card-based lists, avatar-driven identity, a calm blue anchor — but every decision is re-tested against the actual user: **Radha**, 35–55, on a budget Android phone, in bright venue lighting, with ninety seconds between handshakes to get something done.

1. **Blue is trust, marigold is the moment.** The brand blue carries every profile, action and link. The one accent color (marigold) is spent only on the scan button and gamification — it never becomes a generic "pretty" CTA color.
2. **Nothing requires a photo.** Avatars default to initials. MSME owners without a professional headshot are still fully represented.
3. **Offline is a designed state, not an error.** Directory, matches, check-in and scanning all have a fully-cached, fully-functional offline appearance.
4. **44px is the floor.** Every tappable target meets 44×44px minimum, 52px on primary CTAs.
5. **Radius signals context.** Sharper corners (6px) in dense admin/data views; softer corners (12–18px) on the social surfaces attendees swipe through.

---

## Color

### Brand

| Token | Hex | Usage |
|---|---|---|
| `brand-900` | `#0C2C57` | Deepest ink-adjacent blue, rarely used directly |
| `brand-700` | `#14458C` | Headers, admin sidebar, active nav |
| `brand-600` | `#1B54A6` | Link hover |
| `brand-500` | `#2B6CD4` | **Primary action** — default button, active tab, links |
| `brand-100` | `#DCE7FB` | Selected/tint background (chip "on" state, match-reason banner) |
| `brand-50` | `#EEF4FE` | Faintest tint, focus-ring glow |

| Token | Hex | Usage |
|---|---|---|
| `accent-700` | `#B96A1B` | Accent text on light tint |
| `accent-500` | `#E5892B` | **Reserved**: Scan QR button, leaderboard rank #1–3, streaks |
| `accent-100` | `#FBE6CC` | Accent tint background |

**Rule:** `accent-500` is reserved for the core scan loop and gamification only. It must never appear as a generic call-to-action color — that job belongs to `brand-500`.

### Semantic (independent of brand/accent)

| Token | Hex | Usage |
|---|---|---|
| `success-500` | `#1F8A5F` | Checked in, already met, success toast |
| `warning-500` | `#B8720A` | Offline banner, sync pending, manual check-in prompt |
| `danger-500` | `#C4433D` | Delete post, remove connection, invalid QR, errors |

### Neutrals (blue-tinted, not pure grey)

| Token | Hex | Usage |
|---|---|---|
| `paper` | `#F5F7FB` | Page background |
| `surface` | `#FFFFFF` | Card background |
| `surface-2` | `#EEF2F9` | Recessed fields, input backgrounds |
| `border` | `#D8E0EE` | Default hairline |
| `border-strong` | `#B9C6DC` | Input borders, dividers that need to read |
| `ink` | `#16233B` | Primary text |
| `ink-muted` | `#5B6B85` | Secondary text (meta lines, captions) |
| `ink-faint` | `#8B98AF` | Placeholder, disabled, tertiary labels |

### Dark theme

All tokens above are redefined under `prefers-color-scheme: dark` and `[data-theme="dark"]` — see `DESIGN_SYSTEM.html` §Color for the paired swatches. Ground shifts to `#0D1626`, cards to `#16223B`; `brand-500` lightens to `#6FA1F2` and `accent-500` to `#F0A552` to hold contrast on dark surfaces.

### Usage rules

| Surface | Token | Note |
|---|---|---|
| Primary button, links, active tab | `brand-500` | Default CTA everywhere except the scan flow |
| Scan QR button, leaderboard highlight | `accent-500` | Core loop + gamification only |
| Checked-in, already-met, success toast | `success-500` | Confirms a completed action |
| Offline banner, sync pending | `warning-500` | Attention without alarm — venue WiFi is expected to dip |
| Delete post, remove connection | `danger-500` | Destructive/blocking states only |

---

## Typography

Three faces, three jobs. **Body text never sets smaller than 16px** — this is both a legibility decision for a 35–55 audience on cheap screens, and what keeps mobile Safari/Chrome from auto-zooming into form fields.

| Face | Role | Weights | Why |
|---|---|---|---|
| **Manrope** | Display — screen titles, stat numbers, section headers | 700, 800 | Geometric warmth, confident at large sizes |
| **IBM Plex Sans** | Body / UI — every label, button, paragraph | 400, 500, 600 | Built for interface legibility at small sizes on low-DPI screens; ships with a Devanagari companion for Phase 2 Hindi |
| **IBM Plex Mono** | Data — rank, met-count, timestamps, table cells | 500, 600 | Tabular figures so counted things line up |

### Type scale

| Style | Size / Line | Weight | Example |
|---|---|---|---|
| Display 2XL | 36 / 44 | Manrope 800 | "142 of 200 checked in" |
| Heading LG | 22 / 30 | Manrope 700 | "People to meet" |
| Heading MD | 18 / 26 | Manrope 700 | "Your Connections" |
| Body LG | 18 / 28 | Plex Sans 500 | "You met Deepak Sharma from TechCorp!" |
| Body MD | 16 / 26 | Plex Sans 400 | Default paragraph / UI copy |
| Body SM | 14 / 22 | Plex Sans 400 | "Manufacturing · Table 7 · Ahmedabad" |
| Caption | 12 / 16 | Plex Sans 600, uppercase, tracked .06em | "WANT TO MEET" |
| Data | mono, size varies | Plex Mono 500/600 | "Rank #12 · 9:15 AM · 486 scans" |

---

## Spacing & Layout

**Base unit: 4px.**

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 64`

| Token | px | Usage |
|---|---|---|
| space-1 | 4 | Icon-to-label gap |
| space-2 | 8 | Chip padding, tight stack |
| space-3 | 12 | Default control padding |
| space-4 | 16 | Base mobile gutter, card padding |
| space-5 | 20 | Card internal padding (desktop) |
| space-6 | 24 | Section spacing (mobile) |
| space-8 | 32 | Section spacing (desktop), card grid gap |
| space-10 | 40 | Major section breaks |
| space-16 | 64 | Cover/hero spacing |

### Breakpoints

| Surface | Width | Who |
|---|---|---|
| Attendee PWA | 360–428px | Radha, on her own phone, one-handed |
| Staff check-in tablet | 768px | Priya, shared device at the desk |
| Organizer dashboard | 1024px+ | Harish, laptop at the venue |

---

## Radius & Elevation

### Radius

| Token | px | Usage |
|---|---|---|
| `radius-sm` | 6 | Buttons, inputs, table cells (admin, data-dense) |
| `radius-md` | 12 | Cards: match, connection, stat tile |
| `radius-lg` | 18 | Feed photos, modals, phone screens |
| `radius-pill` | 999 | Chips, badges, avatars |

### Elevation

| Token | Usage |
|---|---|
| `shadow-1` | Resting cards on the feed and directory |
| `shadow-2` | Toasts, the raised scan button |
| `shadow-3` | Modals, install-prompt sheet |

Shadows are tinted toward the brand hue (`rgba(20,40,80,…)`) rather than pure black, so they read as soft depth, not smudge.

---

## Iconography & Motion

**Icon style:** 1.6px stroke, rounded joins/caps, 24px grid. Filled variant only for active/selected states (bookmark, active tab). All icons ship as an inline SVG sprite — no icon font, so nothing disappears on a flaky venue connection.

Icon set: `home` `users` `qr` `bookmark` `bookmark-filled` `chat` `camera` `trophy` `image` `sliders` `grid` `search` `download` `bell` `wifi-off` `star` `heart` `phone` `check` `x` `plus` `arrow-right` `check-circle` `alert` `map-pin` `table`

### Motion

| Duration | Name | Usage |
|---|---|---|
| 120ms | Micro | Button press, chip toggle, icon-button tap (ease-out) |
| 200ms | Standard | Toast enter/exit, card appear, tab switch — matches the 3s auto-dismiss on check-in toasts |
| 280ms | Sheet | Modal and install-prompt slide-up — reserved for full-attention moments |

Respect `prefers-reduced-motion: reduce` — disable non-essential transitions.

---

## Components

Full rendered specimens live in `DESIGN_SYSTEM.html` §Components. Inventory:

- **Buttons** — primary (`brand-500`), accent (`accent-500`, reserved for Scan QR), secondary (outline), ghost, danger, disabled. Sizes: default 44px, large 52px (primary CTAs), small 36px (admin-only, never below 44px on mobile).
- **Inputs & forms** — text, select, multi-select tag picker, textarea, disabled/pre-filled (phone), error state with inline hint.
- **Tags & chips** — filter chip (toggle on/off), static display chip, removable form chip.
- **Status & badges** — checked-in (success), not-checked-in (neutral), want-to-meet (accent outline), already-met (brand), offline/saved-offline (warning).
- **Avatar** — sizes 24/32/40/56/72px, initials-first fallback on `brand-100`, optional success-ring for "checked in."
- **Cards** — match card (People to Meet: avatar, name, company, table #, match reason, bookmark), connection card (My Connections: avatar, name, phone, note, action row), directory card, feed post card.
- **Stat tiles** — label + mono value + delta.
- **Leaderboard row** — rank, avatar, name/company, mono count; "me" row highlighted in accent.
- **Toasts & alerts** — success toast (auto-dismiss 3s per PRD), warning/offline toast, persistent alert banner with retry.
- **Modal** — e.g. "Contact exists — Update?"
- **Admin table** — attendee list: name, company, status pill, mono timestamp, check-in method. Wrapped in `overflow-x: auto` so it never breaks page layout on tablet.

---

## Applied Patterns

`DESIGN_SYSTEM.html` §Applied renders these directly:

**Attendee app (mobile, 5-tab bar: Home · People · Scan · Board · Feed, with Scan raised and accent-colored):**
1. Home — check-in badge, table number, "People to meet" matches
2. Scan confirmation — full-screen success state ("You met Deepak Sharma!")
3. My Connections — Already met / Want to meet tabs
4. Live leaderboard — ranked list with the attendee's own row highlighted

**Organizer dashboard (desktop, sidebar nav: Dashboard · Attendees · Check-in · Leaderboard · Feed · Feedback · Settings):**
- Stat row (checked-in progress bar, meetings logged, feedback avg, feed activity)
- Attendee table with live status

---

## Accessibility & Performance

| Rule | Why |
|---|---|
| 44×44px minimum tap targets, 52px on primary CTAs | Radha is time-constrained and one-handed; a mis-tap costs her the ninety seconds she has with the person in front of her |
| 16px minimum body text, 4.5:1 contrast minimum | Budget Android screens + bright venue lighting + a 35–55 audience. Status is never color-only — every pill pairs a color with an icon or label |
| Offline state is a first-class UI state, not an error | Directory, matches, check-in and scanning render fully from cache; the warning banner explains what's degraded, never blocks the screen |
| <500KB initial bundle, <3s load on 4G | Variable fonts (2 files cover 5 weights), inline SVG icons (no icon-font request), photos auto-compressed under 100KB |
| No feature requires a photo | Avatars default to initials on `brand-100` |

---

## Voice & Content

Evento talks like the person standing next to Radha at the check-in desk, not like software. Short sentences, a first name when we have one, and a next step in every message.

**Do:**
- "Welcome! You're checked in at 9:15 AM"
- "You met Deepak Sharma from TechCorp! View their profile."
- "Can't check in. Try again or ask staff to scan your QR."

**Don't:**
- "Check-in successful. Geolocation verified."
- "Contact record created and linked to meeting entity."
- "An error occurred during the check-in process."

---

**Document prepared alongside:** [`PRD_v1.md`](./PRD_v1.md), [`SCREENS.md`](./SCREENS.md)
**Live reference:** [`DESIGN_SYSTEM.html`](./DESIGN_SYSTEM.html)
