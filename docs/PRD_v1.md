# EVENTO — Product Requirements Document v1.0

**Fast, efficient networking for MSME event attendees**

| Attribute | Value |
|-----------|-------|
| Document Status | Draft — Pilot / Trial Build v1.0 |
| Prepared For | Jyoti Pandey |
| Date | July 15, 2026 |
| Target Event | Single-day pilot, ~200 attendees |
| Build Window | Under 1 month (MVP scope deliberately tight) |
| Stack | Next.js (frontend, PWA) + NestJS (backend) |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [User Personas](#user-personas)
3. [Core Features (Phase 1) with User Stories](#core-features-phase-1-with-user-stories)
4. [Future Considerations (Phase 2)](#future-considerations-phase-2)
5. [User Flows for Major Features](#user-flows-for-major-features)
6. [Edge Cases & Error States](#edge-cases--error-states)
7. [Non-Functional Requirements](#non-functional-requirements)
8. [Open Questions & Risks](#open-questions--risks)
9. [Appendix — Brainstorm Traceability](#appendix--brainstorm-traceability)

---

## Executive Summary

### Problem

MSME (Micro, Small & Medium Enterprise) owners regularly attend business events — trade meets, association gatherings, industry conferences — hoping to make useful connections. In practice, most leave with a stack of business cards and no structured record of who they met, why it mattered, or what to do next. There is no way to know in advance who else is attending, no way to identify people worth a conversation, and no easy way to follow up afterward. **Networking at these events is left to chance.**

### Solution

**Evento** turns any business event into planned, efficient networking. The platform enables attendees to:
- **Before the event:** See who's attending and get profile-driven match suggestions based on business category, looking-for/offering overlap, and goals
- **During the event:** Find and meet connections via QR code scan, which exchanges a digital business card and logs the meeting in one action
- **After the event:** Review who they met and get nudged to follow up

### Scope & Constraints

- **Pilot scale:** Single event, ~200 attendees, one day
- **Build timeline:** Under 1 month — MVP scope is deliberately tight and prioritized
- **Platform:** Progressive Web App (installable, works offline-first for critical flows)
- **Tech stack:** Next.js frontend, NestJS backend
- **Success criteria:** Adoption rate & attendee satisfaction (numeric targets TBD)

### Why This Matters

First-of-its-kind validation that MSME owners will adopt a structured networking tool at a live event. Success unblocks decisions on scaling, monetization, and a multi-event platform.

---

## User Personas

### Primary Persona: Radha, the MSME Owner (Age 35–55)

**Background**
- Owns a 10–50 person manufacturing or services business
- Attends 2–3 industry events per year to find suppliers, partners, or new customers
- Not a tech early-adopter but comfortable with WhatsApp and messaging apps
- Uses an older Android phone (often budget tier) with inconsistent mobile data

**Goals**
- Meet 5–10 useful people at the event who could become suppliers, customers, or collaborators
- Leave with a clear, organized record of who they met and why it mattered
- Follow up efficiently without losing track of business cards or conversations

**Pain Points**
- Business cards get lost, damaged, or mixed up with 50+ other cards
- No way to remember what each person does or why they wanted to talk to them
- No structured follow-up process — relies on memory or a hastily scribbled note
- Doesn't want to install yet another app, but WhatsApp links work fine

**Technical Context**
- Prefers WhatsApp for any digital communication (invites, reminders, follow-up)
- May not have a fast internet connection at the event; prefers offline-first actions
- Time-constrained during the event itself — needs the app to save time, not add steps
- Screen might be small, text needs to be legible

---

### Secondary Persona: Harish, the Event Organizer (Age 40–60)

**Background**
- Runs an industry association or event management company
- Responsible for the entire event end-to-end, including attendee registration
- Not technical but comfortable with spreadsheets and basic dashboards
- Owns the pre-registered attendee list (name, phone, company collected via external registration system)

**Goals**
- Get attendees onto the Evento platform with minimal friction
- See real-time analytics: who's checked in, how many meetings are happening, attendee feedback
- Ensure the experience feels smooth and valuable to attendees (directly tied to word-of-mouth for future events)
- (Phase 2) Prove ROI / success metrics to sponsors or investors

**Pain Points**
- Pre-registered list may have duplicates or incomplete data
- If attendees don't adopt the app, the event feels like a failure even if the concept works
- No visibility into whether attendees actually networked or just checked in
- Admin tools need to be simple (not a full BI dashboard) — they have a day job

**Technical Context**
- Wants a simple CSV/Excel upload for attendee import
- Needs simple table assignment (bulk edit) and the ability to resend invites if someone doesn't respond
- Admin dashboard should fit on a laptop or tablet at the venue
- Should not require technical support staff — just the organizer themselves

---

### Tertiary Persona: Priya, the Event Staff Member (Age 25–40)

**Background**
- Works the event day (check-in desk, tech support, general assistance)
- May be a volunteer or junior event coordinator
- Not an app expert; needs clear, simple instructions

**Goals**
- Help attendees check in and resolve technical issues quickly (without creating a queue)
- Manually scan QR codes for attendees who can't use their phones

**Pain Points**
- Multiple systems at the check-in desk (registration, badge printing, Evento) slow down the line
- QR scanning fails intermittently in a noisy, crowded venue
- No clear fallback if the app breaks on someone's phone

**Technical Context**
- Uses a shared tablet or phone to scan QR codes
- Needs a quick "checklist" of tasks
- Should be able to manually check someone in without requiring the attendee to do anything

---

## Core Features (Phase 1) with User Stories

### Feature 1: Attendee Import & Onboarding

**Description:** Organizer uploads pre-registered attendee list; system auto-generates unique QR codes; admin shares the web app sign-up link in the attendee WhatsApp group (no WhatsApp API integration — no vendor for the pilot); attendees sign in via email magic link and set up profiles.

**User Stories**

**US1.1 - Organizer imports attendee list**
```
As an event organizer
I want to upload a CSV/Excel file of pre-registered, paid attendees
So that I can quickly get all attendees into the system without manual entry
Acceptance Criteria:
- CSV/Excel upload interface on admin dashboard
- Columns: name (required), email (required), phone (required), business/profession
  name (required), RMB chapter (optional — attendee may not be an RMB member),
  photo (optional — URL/file reference; falls back to initials avatar if missing),
  city (optional) and business category (optional — both are asked during profile
  setup when not present in the import file)
- Source is the organizer's own registration form (observed as a Google Form export:
  Timestamp, Email Address ×2 [Google-account-captured + form-question field — use the
  form-question value as canonical, flag mismatches for admin review], Full Name,
  Phone Number, RMB Chapter, Business/Profession Name, photo upload, payment
  screenshot, payment details). Payment verification happens entirely in the
  organizer's own registration process, outside Evento — the file Evento imports is
  expected to already contain only confirmed, paid attendees. Evento's import schema
  has no payment fields and performs no payment verification.
- System deduplicates by phone number and by email to prevent duplicate imports
- Each attendee receives a unique personal QR code at import time
- Import status shows success count, duplicates found, and any errors
- Admin can retry failed imports
```

**US1.2 - Admin shares sign-up link in the attendee WhatsApp group**
```
As an organizer
I want to post the Evento web app link in the attendee WhatsApp group ~5 days before the event
So that attendees can sign up and set up their profile early
Acceptance Criteria:
- No WhatsApp Business API / messaging vendor integration for the pilot — the admin
  manually posts one generic sign-up link in the existing attendee WhatsApp group
- The link opens the app's sign-up/login screen (see US1.5); the attendee enters
  their registered email and receives a single-use magic link to get in
- The same generic link works for every attendee — no per-attendee personalized
  links to generate or distribute
- Sign-up screen shows a clear message: "Complete your profile to unlock match
  suggestions"
- Admin can re-post the link in the group anytime as a reminder (e.g., Day -1,
  event morning) — reminders are manual group posts, not system-sent messages
```

**US1.3 - Attendee completes profile during onboarding**
```
As Radha (attendee)
I want to tap the group link, sign in with my email, and answer a few quick questions about myself
So that I can get personalized match suggestions and not have to install an app first
Acceptance Criteria:
- Profile form opens in a mobile web view (does not require app install yet)
- Fields: business category (database-backed dropdown — e.g., Manufacturer, Trader/Distributor, Service Provider, Retailer, Professional), city (searchable database-backed picker using `City, State/UT`), looking for (multi-select dropdown, shared business-type taxonomy — e.g. Real Estate Builders, Interior Designer, Digital Marketing), offering (multi-select dropdown, same taxonomy as looking for), goals (multi-select), optional free-text bio. No separate "industry" field — business category is the only categorization field, and looking-for/offering tags carry the business-type detail so nothing is asked twice.
- Form is under a minute to complete (5–6 fields) — name, email, phone, business/profession name, chapter and photo are already known from registration and are pre-filled/read-only, not re-asked. City and business category are asked here because the registration form does not capture them (if a future import file includes City/Category columns, they are imported and pre-filled instead)
- Validation: phone number and email already in system (auto-filled), name is required
- After completion, user sees: "Great! Get suggestions by installing the app" → PWA install prompt
- Profile is saved even if attendee doesn't install PWA
- Tutorial video or walkthrough available (optional for attendees who want it)
```

**US1.4 - PWA install & first-time experience**
```
As Radha (attendee)
I want to install the Evento app on my home screen so I can use it offline
And see a tutorial on my first open
So that I know what to do at the event and don't have to figure it out on the day
Acceptance Criteria:
- "Install" button uses native PWA install prompt (browsers that support it)
- Fallback: "Add to home screen" instructions for older browsers
- On first app open, auto-show 60-second tutorial: "Scan QR to meet people, check leaderboard, post photos"
- Tutorial has skip button; re-accessible from settings
- App is fully functional offline (directory, matches, and profiles load from cache)
```

**US1.5 - Attendee logs in without a password (first-time and returning)**
```
As Radha (attendee)
I want to get into Evento the first time, and back in if I switch phones, clear my
browser, or reinstall the app
Without needing a password or calling anyone for help
So that getting in never costs me time
Acceptance Criteria:
- No passwords anywhere in the attendee experience — the email magic link is the
  single login mechanism for both first-time sign-up (via the group link, US1.2)
  and returning re-entry
- Attendee enters their email on the sign-up/login screen, and if it matches a
  registered attendee, a single-use signed link (30-minute expiry) is emailed to
  that address; first-time users land on profile setup, returning users land on Home
- Response is identical whether or not the email matched ("If that email is on the
  guest list, we've sent a link") — prevents using the login screen to check who is
  registered
- Rate limited (~5 sends/hour per email) to prevent inbox spam
- Email is the only self-serve login channel — no WhatsApp-delivered login link
- Entering someone else's email cannot grant access to their account — the
  link only ever reaches the address on file, never whoever typed it in
- Staff-assisted lookup (via admin Check-In Management) is the only fallback,
  for an attendee with no working access to email at the venue
```

---

### Feature 2: Smart Attendee Matching

**Description:** Rule-based matching surfaces suggested connections based on profile tags (business category, looking for, offering, goals) and RMB chapter affiliation.

**User Stories**

**US2.1 - Attendee sees match suggestions**
```
As Radha (attendee)
I want to see a list of people I should try to meet
Ranked by relevance so I don't have to scroll through hundreds of names
So that I know who to look for at the event
Acceptance Criteria:
- "People to meet" list appears after profile completion (pre-event and during event)
- Matching logic: overlap between my "looking for" tags and their "offering" tags, plus shared business category
- Chapter is a matching signal, not a filter on relevance — cross-chapter matches are
  surfaced deliberately, not suppressed, since same-chapter members mostly know each
  other already and the event's value is expanding beyond one's own chapter. The match
  reason line names the chapter relationship either way: "You're both Manufacturers
  — she's from the Surat chapter" (cross-chapter) or "You're both in the Ahmedabad
  chapter" (same-chapter). Attendees with no chapter (non-RMBians) match on
  business category/tags only, with no chapter clause in the reason line.
- Top 10 matches shown first; full list is scrollable
- Each person shows: name, company, business category, chapter (if any), table number, one-line match reason
- Match cards include a "bookmark" button
- If no good matches found, show: "No exact matches yet. Browse the full directory."
- Matching is available offline (computed client-side or cached)
```

**US2.2 - Attendee browses full directory**
```
As Radha (attendee)
I want to see everyone at the event (or registered, depending on open question)
Filtered by business category or company so I can find people beyond the top 10 suggestions
So that I have agency to explore and might discover useful connections on my own
Acceptance Criteria:
- "Directory" or "All attendees" view shows full list
- Filters: business category, company, RMB chapter (including a "no chapter" bucket for non-RMBians), city, checked-in status
- Search: by name or company
- Each directory card shows: photo (initials avatar if photo missing), name, company, business category, chapter (if any), table number
- Sorting: by match score, alphabetical, or random (to reduce bias)
- Directory is available offline (cached at event start)
- Pilot implementation initially provides alphabetical name and company sorting. Match-score sorting activates with F2.1/F2.3; random sorting is deferred unless event testing demonstrates a discovery-bias problem.
- Business-category, city and chapter filters come from active database reference records and remain available even when no attendee cards are returned. Cities use the nationwide `City, State/UT` catalogue; company options are derived from attendee records.
```

**US2.3 - Matching engine is modular**
```
As a developer
I want the matching logic to be decoupled from the profile schema
So that we can swap in AI/semantic matching in Phase 2 without rewriting profiles
Acceptance Criteria:
- Matching logic lives in a separate module/service (e.g., `matching.service.ts`)
- Profile schema is independent and stores raw tags (not pre-computed match scores)
- Matching can run client-side (offline) or server-side (for better ranking)
- Easy to A/B test different matching algorithms in Phase 2
```

---

### Feature 3: Attendance & Check-In

**Description:** Attendees are marked present when they open the app at the venue; fallback is staff QR scan.

**User Stories**

**US3.1 - Attendee arrival detection at venue (Geolocation), tap to confirm**
```
As Radha (attendee)
I want the app to notice when I've arrived at the event
And let me confirm with one tap rather than it happening invisibly
So that I know for sure I'm checked in before I walk up to the registration desk
Acceptance Criteria:
- App requests geolocation permission on first app launch (if not already granted)
- On app open, app calls device geolocation API (max 5 second timeout)
- If device location is within venue radius (organizer-defined, default 500m), show a full-page
  "You've arrived" state with a single "Check in" button — check-in is NOT recorded until the
  attendee taps it. (Revised from an earlier silent-auto-checkin design: the confirmed "checked
  in" screen doubles as what the attendee shows at the registration counter, so the moment needs
  to be deliberate, not something that happened in the background without their noticing.)
- Tapping "Check in" records the check-in and shows: "Checked in at 9:15 AM" — this screen is
  designed to be shown to registration staff, so it's full-page and unambiguous, not a toast
- Check-in timestamp is recorded for analytics
- Venue proximity detection itself is not gated on connectivity — see Technical Details
- Check-in timestamp is saved locally (works offline); synced when online
- If already checked in, skip straight to the "checked in" screen on subsequent app opens (no re-detection)
Technical Details:
- Venue coordinates: organizer sets latitude/longitude + radius (in admin dashboard); coordinates
  aren't sensitive (the attendee is physically at the venue already) so the client fetches and
  caches them, letting it decide "am I in radius" even without a live round-trip to the server
- Geolocation precision: 50–100m accuracy typical; radius buffer accounts for this
- Battery impact: single geolocation call on app open, ~100ms, minimal battery drain
- Privacy: app requests permission with clear message: "We need your location to check you in at the venue"
```

**US3.1A - Attendee manual check-in fallback**
```
As Radha (attendee)
I want to manually check in if geolocation isn't working or I'm outside the venue radius
So that I can still attend the event and start networking
Acceptance Criteria:
- If proximity can't be confirmed (geolocation off, timeout, or outside radius), Home screen shows
  a full-page "Not checked in" state with a "Check in manually" button (orange/yellow, prominent)
- Tapping button shows a loading state ("Marking you present…")
- On success: full-page "Checked in at 9:15 AM" screen (same screen as US3.1's confirmed state —
  the one shown at the registration counter)
- Check-in state persists; the button/prompt doesn't reappear until next app session
- If manual check-in fails (network error), show: "Can't check in. Try again or ask staff to scan your QR"
- Retry button is always available
- Manual check-in works offline; timestamp recorded locally and synced when online
Technical Details:
- Manual check-in API call: POST /api/checkin (requires no geolocation, just user ID)
- Timeout: 3 seconds; if no response, show error and allow retry
- Duplicate protection: server ignores second check-in if user already checked in today
- Staff can verify by viewing admin dashboard (Screen 3.4) if attendee is truthfully at venue
```

**US3.2 - Staff manual check-in via QR scan**
```
As event staff at the check-in desk
I want to scan an attendee's personal QR code to mark them checked in
So that I can help attendees whose phones don't work or aren't at the venue yet
Acceptance Criteria:
- Admin dashboard has a "Check-in" tab with a QR scanner
- Scanning an attendee's QR marks them "checked in" immediately
- System shows: "✓ Radha Sharma checked in at 9:15 AM"
- If already checked in, show: "Radha is already checked in"
- Scanner works offline; syncs when connection returns
```

**US3.3 - Admin configures venue geolocation**
```
As Harish (organizer)
I want to set the venue's GPS coordinates and check-in radius
So that the app can automatically detect when attendees arrive
Acceptance Criteria:
- Admin dashboard has "Event Settings" section with venue configuration
- Fields: venue latitude, venue longitude, check-in radius (in meters, default 500m)
- Help text: "Enter venue center point. 500m radius = ~5 min walk."
- Can use Google Maps integration to pick venue on map (optional, Phase 2)
- Changes take effect immediately; attendees' next app open uses new coordinates
- If not configured, geolocation check-in is disabled (manual check-in only)
Technical Details:
- Coordinates stored in event record in database
- Attendee app fetches on startup (cached for offline)
- Validation: latitude ±90, longitude ±180, radius 100–5000m
```

**US3.4 - Admin sees live check-in status**
```
As Harish (organizer)
I want to see in real time how many attendees have checked in
So that I know how the event is progressing and can send reminders if needed
Acceptance Criteria:
- Admin dashboard shows live counter: "142 of 200 checked in" (updated every 5–10 seconds)
- Breakdown: by check-in method (auto geolocation, manual button, staff QR)
- List of checked-in attendees (by check-in time, sortable by name or company)
- List of not-yet-checked-in attendees
- Admin can copy the not-yet-checked-in list (names/phones) to nudge them manually in the WhatsApp group — no system-sent reminders (no WhatsApp vendor)
- Check-in timeline chart: graph of check-ins over time (optional)
```

---

### Feature 4: Digital Business Card Exchange & "Met" Detection (Unified QR)

**Description:** One QR scan exchanges digital business cards and logs a confirmed meeting.

**User Stories**

**US4.1 - Attendee scans another attendee's QR**
```
As Radha (attendee)
I want to scan another person's QR code using my phone camera
So that I can exchange our business card details and record that we met
Acceptance Criteria:
- App has a prominent "Scan QR" button (camera access required)
- Tapping opens native camera with QR overlay
- Scanning another attendee's QR triggers two actions at once:
  a) Exchange: Both parties' profile details (name, company, phone, custom bio) are saved to each other's contact list
  b) Meeting log: A "confirmed meeting" is recorded (timestamp, photo/flag if possible)
- Success message: "You met Deepak from TechCorp! View their profile."
- Duplicate scans (same two people scanning twice) do NOT double-count on leaderboard
- Scan works offline; synced when connection returns
- QR decode fails gracefully: "Can't read QR. Try scanning a badge or printed card instead."
```

**US4.1A - Attendee shows their own QR code**
```
As Radha (attendee)
I want my personal QR code visible at the top of my Profile screen
So that the person I'm talking to can scan me instantly, without me hunting through menus
Acceptance Criteria:
- Attendee's own QR code is displayed prominently at the TOP of their Profile/Settings
  screen — first thing visible when the screen opens
- QR renders at a size reliably scannable from another phone (~60% of screen width minimum)
- QR is available offline (generated/cached locally — no network call to display it)
- Tapping the QR enlarges it to full-screen with boosted brightness for easier scanning
- The attendee's name is shown directly below the QR (so the scanner can confirm
  they scanned the right person)
```

**US4.2 - Attendee can view scanned contacts**
```
As Radha (attendee)
I want to see everyone I've met or bookmarked in one place
With their details and optional notes
So that I can remember who they are and follow up
Acceptance Criteria:
- "My Connections" view shows all met + bookmarked people
- Sorting: by "met date" or "bookmarked"
- Each connection card shows: name, company, phone, profile bio, table number
- Action buttons: "Call", "WhatsApp", "Save to contacts", "Remove"
- Notes: Attendee can add a private note ("potential supplier") to any connection
- Offline: all met connections are cached; new meets sync when online
```

**US4.3 - Backup QR on printed badge**
```
As event staff
I want to print a physical badge with an attendee's QR code as a backup
So that attendees whose phones are dead, lost, or don't support QR can still be scanned
Acceptance Criteria:
- Admin dashboard has a "Print badges" option
- Generated PDF includes: attendee name, company, photo (if available), unique QR code
- Attendee's name is printed prominently alongside the QR code (large, legible type) so
  staff and other attendees can visually confirm whose code they're scanning
- QR code is large enough (1-inch square) to scan reliably in a busy venue
- Suggested: print before event, or on-demand at check-in desk
- Staff can still scan a printed badge using a shared tablet/phone at check-in desk
```

---

### Feature 5: Bookmark & Interactions

**Description:** Attendees can bookmark people they want to meet or have met, visible in "My Connections."

**User Stories**

**US5.1 - Attendee bookmarks someone from directory**
```
As Radha (attendee)
I want to save a person to "want to meet" without scanning their QR yet
So that I can plan who to find at the event and keep track of my priorities
Acceptance Criteria:
- "Bookmark" button (heart or star icon) on every profile card
- Bookmarked people appear in "My Connections" view, labeled "Want to meet"
- Visual distinction: "Want to meet" vs. "Already met"
- One-tap unbookmark
- Offline: bookmarks are synced when online
```

**US5.2 - Attendee sees pending vs. completed meetings**
```
As Radha (attendee)
I want to quickly see:
- People I haven't met yet but want to (bookmarks)
- People I've already met (confirmed scans)
So that I can focus on who's left to find
Acceptance Criteria:
- "My Connections" view has two tabs or clear sections:
  a) "Want to meet" (bookmarks, met = false)
  b) "Already met" (confirmed scans, met = true)
- Tab badges show count (e.g., "Want to meet (3)")
- Swipe or tap to switch between tabs
```

---

### Feature 6: Gamification — Star/Met Counter & Leaderboard

**Description:** 1 point per confirmed meeting; live leaderboard shown on-screen at venue.

**User Stories**

**US6.1 - Leaderboard is live and visible on-screen**
```
As attendees at the event
I want to see a live leaderboard showing who's met the most people
So that I feel motivated to network and can compete with friends in a fun way
Acceptance Criteria:
- Large display screen at the venue shows live leaderboard
- Leaderboard shows top 20 attendees: name, company, met count
- Updates in real-time as QR scans are logged
- Updates every 5–10 seconds (not every scan to avoid flickering)
- Design: colorful, mobile-friendly for attendees to check on their phones too
- Attendee's own rank is highlighted
- No tiered badges or sponsor prizes for pilot (Phase 2 feature)
```

**US6.2 - Attendee can see their own stats**
```
As Radha (attendee)
I want to see my met count and my rank on the leaderboard
In a prominent place in my profile or dashboard
So that I feel motivated and can check how I'm doing vs. others
Acceptance Criteria:
- Dashboard/home screen shows: "You've met 5 people • Rank: 12th"
- Tapping the stat opens the full leaderboard
- Stats update in real-time as new meetings are logged
- Offline: shows cached stats; updates when online
```

**US6.3 - Duplicate scans don't double-count**
```
As developers
I want the system to recognize when two attendees have already scanned each other
So that mistakes or repeated scans don't game the leaderboard
Acceptance Criteria:
- System tracks scan pairs: (attendee_A, attendee_B)
- If the same pair scans again, leaderboard point is NOT added
- System shows: "You've already met Deepak. Move on to someone new!"
- Attendee can still view the contact or add a note
```

---

### Feature 7: Event Photo Feed

**Description:** Attendees post a selfie + caption; visible to all, unmoderated for pilot.

**User Stories**

**US7.1 - Attendee posts photo to event feed**
```
As Radha (attendee)
I want to take a selfie or upload a photo with a caption
And share it with everyone at the event
So that others can see who I am and feel more connected
Acceptance Criteria:
- "Post" button on the home feed
- Tapping opens camera or photo library
- Photo editor: crop, brightness, optional filter
- Caption field: up to 200 characters, emoji support
- "Post" button publishes to the shared event feed
- User can delete their own posts anytime
- Post timestamp shows when posted
```

**US7.2 - Attendee views event feed**
```
As Radha (attendee)
I want to see photos and comments from other attendees
So that I can put faces to names and see who's enjoying the event
Acceptance Criteria:
- "Event" or "Feed" tab shows all posted photos
- Newest photos first (chronological)
- Each post shows: attendee name, company, photo, caption, timestamp, like count
- Like button (heart icon) to engage
- Tap photo to enlarge and see full caption + comments
- Comments on posts (simple: name + message, no threads for MVP)
- Feed works offline (cached posts; new posts sync when online)
```

**US7.3 - Admin can remove inappropriate posts**
```
As Harish (organizer)
I want to see all posts and delete one that's inappropriate
Without a formal moderation queue (fast-track for pilot)
So that the feed stays appropriate and attendees feel safe
Acceptance Criteria:
- Admin dashboard has a "Feed" tab showing all posts
- "Delete" button next to each post
- Clicking delete removes post immediately
- Deleted post is gone from attendee feeds (refreshed live or on next load)
- No email notification (pilot is too small for that)
- Log: admin can see a history of deleted posts (for review if needed)
```

---

### Feature 8: Feedback & Review

**Description:** End-of-event feedback prompt; simple rating + optional comment.

**User Stories**

**US8.1 - Attendee receives feedback prompt**
```
As Radha (attendee)
I want to rate my event experience and leave a comment
When the event is wrapping up
So that the organizer knows what worked and what didn't
Acceptance Criteria:
- Feedback prompt triggered at a set time (e.g., 4:45 PM for a 5 PM end) or manually by organizer
- Simple 5-star rating: "How was your networking experience?"
- Optional text box: "Any comments?" (max 500 chars)
- Skip option (attendee can skip without providing feedback)
- "Submit" button saves feedback
- Confirmation: "Thanks for your feedback!"
```

**US8.2 - Admin sees feedback analytics**
```
As Harish (organizer)
I want to see feedback scores, average rating, and all comments
So that I can evaluate if the pilot was successful and what to improve
Acceptance Criteria:
- Admin dashboard "Feedback" tab shows:
  - Average star rating (e.g., 4.2/5)
  - Distribution of ratings (e.g., 80 five-star, 40 four-star, etc.)
  - All text comments (searchable, sortable by rating)
  - Total feedback count
  - Export option (CSV) for reporting
```

---

### Feature 9: Event Summary & Post-Event Follow-Up

**Description:** Post-event summary in-app; follow-up nudge is a manual admin post in the WhatsApp group (no system-sent messages, no in-app chat yet).

**User Stories**

**US9.1 - Attendee sees event summary**
```
As Radha (attendee)
I want to see after the event ends:
- How many people I met
- How many cards I collected
- A summary of my top connections
- A link to download my connections list
So that I have a record of the networking I did
Acceptance Criteria:
- Summary screen appears after event end time
- Stats: "You met 7 people", "You collected 7 cards", "Your rank: 14th"
- Top 5 connections list: name, company, phone, table number
- "View all connections" link opens full list
- "Download connections" button exports as CSV or vCard (for importing to contacts)
- Attendee can share summary to WhatsApp
```

**US9.2 - Post-event follow-up nudge (manual, via group)**
```
As Radha (attendee)
I want a nudge the day after the event
With a link to my summary so I remember to reach out to the people I met
Acceptance Criteria:
- No system-sent WhatsApp messages (no vendor for the pilot) — the admin manually
  posts a follow-up message with the app link in the attendee WhatsApp group the
  day after the event
- The link opens the app; each attendee sees their own event summary after logging in
- The summary screen itself is the primary follow-up surface — it persists in-app
  after the event ends, so attendees who miss the group post still see it on next open
- No in-app chat or AI-generated conversation starters for pilot
- Follow-up happens via WhatsApp (attendee-initiated, wa.me deep links) or in person
```

---

### Feature 10: Save as Contact

**Description:** One-tap export of a met connection's details to native contacts app (vCard).

**User Stories**

**US10.1 - Attendee exports connection to native contacts**
```
As Radha (attendee)
I want to save any connection's details to my phone's contacts app
So that I can call or message them after the event without opening Evento
Acceptance Criteria:
- "Save to contacts" button on every connection card
- Tapping generates a vCard (.vcf) with: name, company, phone, email (if available)
- vCard is passed to native contact picker or auto-imported
- If contact already exists, show: "Contact exists. Update?" option
- Confirmation: "Saved to contacts as Deepak Sharma"
```

---

### Feature 11: Analytics (Attendee-Facing & Admin-Facing)

**Description:** Personal stats for attendees; event-wide dashboard for organizers.

**User Stories**

**US11.1 - Attendee views personal stats**
```
As Radha (attendee)
I want a clear view of my networking performance
So that I can see my progress during the event
Acceptance Criteria:
- Dashboard or profile view shows:
  - People met (count)
  - Leaderboard rank
  - Connections bookmarked (count)
  - Photos posted (count)
  - Time at event (if available)
- Stats update live as new meetings are logged
- Offline: shows cached stats
```

**US11.2 - Admin sees event-wide analytics**
```
As Harish (organizer)
I want a real-time dashboard showing event health metrics
So that I can identify issues or celebrate wins during the event
Acceptance Criteria:
- Admin dashboard shows:
  - Total check-ins / expected (e.g., 142 of 200)
  - Total meetings logged (e.g., 486 scans)
  - Average meetings per attendee (e.g., 3.4)
  - Leaderboard (top 20)
  - Photo feed activity (posts, likes)
  - Feedback scores (if event is ending)
  - User engagement (% who opened app, % who scanned QR, % who posted photo)
- Charts: check-in over time, meetings over time
- Export option (CSV/PDF) for reporting
- Responsive design: fits on laptop or tablet at the venue
```

---

### Cross-Cutting Feature 12: Authenticated Attendee Navigation

**Description:** A consistent, low-friction navigation shell for the attendee PWA: a **persistent bottom tab bar** for the four primary destinations, plus a left slide-over drawer for lower-frequency ones.

> **Revised (UX revision v1.1).** This feature previously specified a drawer *only*, with the explicit criterion "No persistent attendee bottom-tab bar in the pilot", on the rationale that two navigation systems duplicate destinations and consume vertical space. That decision is **reversed**: bottom tabs are the current convention for this app category, and the four primary destinations are used constantly during the event, where a two-tap drawer is friction at the wrong moment. The duplication concern is answered by strict separation — **every destination lives in exactly one of the two systems, never both.** Owning build unit: PF7.1 in `FEATURES.md`.

**US12.1 - Attendee navigates the app after login**
```
As Radha (attendee)
I want the destinations I use constantly to be one tap away, and the rest tucked out of the way
So that I can move around the event app without hunting through a menu mid-conversation
Acceptance Criteria:
- Navigation renders only after a valid attendee session and completed required onboarding
- It never renders on Login, magic-link verification, expired-link/error or focused onboarding screens, including while session verification is loading
- Bottom tab bar is persistent and holds exactly four primary destinations, ordered:
  Home, People, Want to Meet, Profile
- Each tab has a 44×44px minimum touch target, an icon plus a short label, and respects the device safe-area inset
- The drawer holds only secondary destinations — Leaderboard, Event Summary, Give Feedback, Event Photos, Show My QR — with Sign Out visually separated at the bottom
- No destination appears in both the tab bar and the drawer
- Header shows a 44×44px menu trigger; drawer slides from the left and occupies at most 88% of a phone width / 360px
- Scan QR is reachable in one tap from the primary navigation (proposed: a center FAB in the tab bar — OPEN, pending confirmation)
- Current destination is visibly highlighted and programmatically marked in whichever system owns it
- Drawer close works through the close button, backdrop, Escape and Android/browser Back without leaving the current screen
- Drawer traps focus while open, restores focus to its trigger, locks background scrolling and respects reduced motion
- Navigation uses cached attendee identity offline; missing photos fall back to initials
- Production hides destinations until their feature route works; local development may show them disabled with a clear "Soon" label and no placeholder navigation
- Tabs do not obscure page content: scrollable screens reserve bottom padding equal to the bar height
```

---

## Future Considerations (Phase 2)

These ideas were on the original brainstorm and are deliberately deferred, not dropped.

| Idea | Why Deferred | Trigger to Revisit |
|------|-------------|-------------------|
| **Multi-tenant platform for multiple organizers/events** | Pilot is a single event; no need for multi-tenancy yet | Pilot succeeds and a second organizer wants in |
| **In-app chat between matched attendees** | Contact exchange + WhatsApp/in-person is sufficient for pilot | Attendees ask for it, or WhatsApp follow-up proves too lossy |
| **AI/semantic matching on free-text profiles** | Rule-based tags are faster to build; enough to test the concept | Real matching data exists to tune an AI model on |
| **NFC / proximity-based automatic "met" detection** | Needs hardware/BLE support beyond a 1-month PWA build | QR-based flow proves too much friction in practice |
| **Tiered badges + sponsor-funded prizes** | Adds prize logistics the organizer isn't ready to manage | Leaderboard shows strong engagement and organizer wants to invest further |
| **AI-generated conversation starters** | Nice-to-have, not essential to prove the core matching/networking loop | Follow-through rate (post-event) is lower than expected |
| **Multi-language UI (Hindi/regional)** | English-only is faster and free within the 1-month window | Pilot audience or a future event needs non-English support |
| **Native mobile app (iOS/Android)** | PWA is faster to ship and avoids app store review time | Adoption is strong but attendees report PWA friction |
| **Interactive venue maps with networking zones** | Not needed with the fixed-table model | Future events use an open floor plan instead of assigned tables |
| **Real-time event schedule with session recommendations** | Not relevant to a single-track networking event; complex to build | Future events have multi-session programming |

---

## User Flows for Major Features

### Flow 1: Pre-Event Registration & Onboarding (Day -5 to Day 0)

```
START: Organizer has pre-registered attendees in CSV
  ↓
[ORGANIZER: Import Attendees]
  • Upload CSV/Excel to admin dashboard
  • System deduplicates by phone number
  • Generate unique QR code for each attendee
  • Status: "Import complete: 198 attendees, 2 duplicates skipped"
  ↓
[ADMIN: Share Sign-Up Link in Group (Day -5)]
  • Admin manually posts the Evento web app link in the attendee WhatsApp group
  • Message (written by admin): "You're invited to Industry Conf 2026! Sign up: [link]"
  ↓
[ATTENDEE: Sign In via Email Magic Link]
  • Tap group link → sign-up/login screen opens
  • Enter registered email → receive single-use magic link → tap to enter
  ↓
[ATTENDEE: Complete Profile]
  • Fill form: business category, looking for, offering, goals, optional bio
  • Form validation: all required fields filled, phone is pre-filled
  • Submit → "Profile saved!"
  ↓
[PWA INSTALL PROMPT]
  • "Install Evento to unlock match suggestions and networking tools"
  • Attendee can: Install Now | Install Later | Skip
  • If Install: native PWA installer prompt (or "Add to home screen" instructions)
  • If Skip: profile is saved; attendee can install later
  ↓
[SYSTEM: Pre-compute Matches (Day -3)]
  • For each attendee, calculate "People to Meet" list
  • Cache on their device for offline access
  ↓
[ADMIN: Post Reminder in Group (Day -1)]
  • Admin manually posts in the group: "Tomorrow's the big day! Make sure you have Evento installed. [link]"
  • In-app tutorial for first-timers (skippable)
  ↓
END: Attendees ready for event day
```

---

### Flow 2: Event Day Check-In & First Meeting (Day 0, 9 AM – 5 PM)

```
START: Attendee arrives at venue
  ↓
[ATTENDEE: Open App at Venue]
  • Opens Evento PWA on phone
  • App detects venue via geolocation
  • Auto-marks attendee as "checked in"
  • Toast: "Welcome! You're checked in at [time]"
  ↓
[ATTENDEE: View Table Assignment]
  • Home screen shows: "Your table: 7"
  • Can navigate to table location (or map, if available)
  ↓
[ATTENDEE: Browse Matches & Directory]
  • "People to meet" list shows top 10 suggested connections
  • Can swipe through, bookmark favorites, or search by name
  • Offline: full directory is cached; matches pre-computed
  ↓
[ATTENDEE: Navigate to Find Someone]
  • Tap "Find Deepak Sharma" (from matches)
  • Card shows: name, company, business category, table number
  • Attendee walks to table or venue area
  ↓
[MEETING: In-Person Conversation]
  • Two attendees chat (organically, unmediated)
  • Duration: flexible (1 min to 30 min)
  ↓
[ATTENDEE A: Scan QR Code]
  • Takes out phone, opens Evento, taps "Scan QR"
  • Scans Attendee B's personal QR code (displayed on phone or printed badge)
  • System captures scan, creates meeting record
  ↓
[BOTH ATTENDEES: Confirmation & Exchange]
  • Attendee A sees: "You met Deepak Sharma from TechCorp! View profile."
  • Both attendees' profiles are saved to each other's contact list
  • Leaderboard updates: both get +1 point
  • "My Connections" list is updated
  ↓
[BOTH ATTENDEES: Optional Interactions]
  • Add a private note: "potential supplier"
  • Send WhatsApp directly
  • Save to native contacts
  • Like their profile or bookmark for later
  ↓
[REPEAT] Attendee continues networking
  • Browse directory, find new matches, scan QR
  • Post photos to event feed
  • Check leaderboard to see progress
  ↓
[OPTIONAL: Photo Feed Post]
  • Attendee taps "Post photo"
  • Uploads selfie or group photo + caption
  • Visible to all attendees in real time
  • Others can like or comment
  ↓
[END OF PHOTO: 4:45 PM - Feedback Prompt]
  • "Thanks for coming! Rate your experience (1–5 stars)"
  • Optional comment: "Any feedback?"
  • Submit or skip
  ↓
END: Event wraps up
```

---

### Flow 3: Post-Event Summary & Follow-Up (Day 1+)

```
START: Event has ended
  ↓
[ATTENDEE: View Event Summary (Day 0, after event)]
  • Summary screen shows:
    - "You met 7 people"
    - "You're rank 14th on the leaderboard"
    - Top 5 connections with photos
  ↓
[ATTENDEE: Export Connections]
  • "Download my connections" → options:
    - CSV (for Excel/CRM)
    - vCard (for native contacts)
    - Share via WhatsApp
  ↓
[ADMIN: Post Follow-Up in Group (Day 1)]
  • Admin manually posts in the group: "Great meeting everyone at Industry Conf 2026!
    Check your networking summary and follow up: [link]"
  • Link opens the app; each attendee sees their own summary after logging in
  • Attendee can view connections, export contacts, etc.
  ↓
[ATTENDEE: Manual Follow-Up (outside Evento)]
  • Calls, texts, or WhatsApps connections directly
  • Can reference notes from "My Connections" or exported CSV
  ↓
[ORGANIZER: Review Admin Dashboard (Day 0, end of event)]
  • Sees event recap: 142 check-ins, 486 meetings logged, 3.4 avg meetings/person
  • Feedback average: 4.2/5, with comments
  • Photo feed: 23 posts, 156 likes
  • Leaderboard: top networker met 12 people
  ↓
[ORGANIZER: Export Report]
  • Dashboard "Export" button → PDF/CSV with all metrics
  • Send to sponsor or stakeholder
  ↓
END: Post-event phase complete
```

---

### Flow 4: Admin Management & Operations (Throughout Event)

```
START: Day before event
  ↓
[ADMIN: Monitor Check-Ins]
  • Opens admin dashboard, "Check-ins" tab
  • Live counter: "142 of 200 checked in"
  • List of who's checked in, who hasn't
  • Can copy the not-checked-in list and nudge them manually in the WhatsApp group
  ↓
[ADMIN: Manual Check-In (if needed)]
  • Attendee arrives but phone doesn't work
  • Staff scans attendee's printed QR badge
  • Dashboard shows: "✓ Radha Sharma checked in at 9:15 AM"
  ↓
[ADMIN: View Live Leaderboard]
  • See who's networking most actively
  • Top 20 rankings, updated every 5–10 seconds
  ↓
[ADMIN: Monitor Feed Posts]
  • "Feed" tab shows all attendee posts
  • Can delete inappropriate posts instantly
  • Count: 23 posts, engagement (likes, comments)
  ↓
[ADMIN: Check Analytics]
  • "Analytics" dashboard shows:
    - Check-in rate over time
    - Meetings logged over time (graph)
    - Engagement: % who opened app, % who scanned, % who posted
    - Feedback (if event is ending)
  ↓
[ADMIN: End-of-Event Wrap-Up]
  • Trigger feedback prompt for all attendees
  • Export all data: attendee list, meetings, feedback, photos
  • Email report to organizer/sponsors
  ↓
END: Event data captured and reported
```

---

## Edge Cases & Error States

| Scenario | How It's Handled |
|----------|------------------|
| **Attendee has no smartphone / phone too old for PWA** | Printed QR badge as fallback; staff can scan them in and log meetings on their behalf. Attendee can still be included in directory (passive view only) and leaderboard if staff manually scans QR when they meet others. |
| **Auto check-in fails at venue (no signal, phone issue, geolocation off)** | Fallback: staff at help desk scans the attendee's personal QR to mark attendance. Attendee can also manually tap "Check in" button if they remember. Sync happens when connection returns. |
| **Two attendees scan each other's QR twice (accident or testing)** | System recognizes the pair has already logged a meeting and does not double-count on leaderboard. Attendee sees: "You've already met Deepak. Move on to someone new!" Duplicate meeting record is logged but flagged as duplicate. |
| **Registered attendee never installs PWA / never shows up** | Remains in imported list as "not checked in"; excluded from live directory/matches of who's currently at event. Admin can see full list vs. checked-in subset. Open question: should inactive attendees be visible in the directory? |
| **Connectivity drops mid-scan** | Scan is queued locally in browser storage and synced automatically when connection returns. Attendee sees: "Saved offline. Will sync when you're back online." No duplicate scans when sync happens. |
| **Duplicate attendee entries on import (same person, two phone numbers)** | Deduplicated by phone number at import time. If same person uses two different phone numbers, system has no way to know; admin must manually edit or reimport. Flagged as a limitation. |
| **Attendee wants to be excluded from public directory** | Not currently supported for pilot — directory visibility is on-by-default for all checked-in attendees. Flagged as an open question (privacy opt-out). |
| **QR scanner fails (camera permission not granted, phone hardware issue)** | QR scan button shows helpful message: "Can't access camera. Check your phone settings or ask staff to scan for you." Fallback: printed badge or staff manual check-in. |
| **WiFi is completely down at the venue (not just slow)** | App is designed to work offline for critical flows (QR scanning, check-in, directory, matches). Sync will happen when connection returns. Feed and analytics won't update live. Attendee experience degrades gracefully. |
| **Attendee bookmarks 50+ people and runs out of device storage** | Unlikely but possible on low-end phones. Browser storage limit is typically 50 MB; at ~1 KB per profile, this supports ~50K profiles. If limit is hit, app shows: "Storage full. Clear some data and try again." Links to settings. |
| **Photo feed post contains inappropriate content** | Admin can instantly delete the post from the dashboard. Post disappears from attendee feeds on next refresh (or live if WebSocket is implemented). No formal moderation queue for pilot. |
| **Feedback prompt appears at wrong time (organizer forgot to trigger it)** | Attendee can manually trigger by opening app after event end time, or admin can manually trigger from dashboard. Feedback is not mandatory; attendee can skip. |
| **Admin loses internet mid-event while viewing dashboard** | Dashboard shows "Connection lost. Trying to reconnect..." Admin can still see cached data (last known state). Critical actions (deleting posts, manual check-ins) are queued and executed when reconnected. |

---

## Non-Functional Requirements

### Performance

**Mobile Performance**
- Initial page load: < 3s on 4G, < 5s on 3G (LTE)
- QR scanner activation: < 1s (camera native, no processing delay)
- Leaderboard update: < 1s from QR scan to UI refresh
- Directory browsing: < 500ms for scroll/filter interactions
- Photo upload: < 30s for a 2 MB photo on 4G (with progress indicator)

**Server Performance**
- API response time: < 200ms for 95th percentile requests
- Concurrent users: handle 200 peak concurrent users at event
- QR scan API: < 50ms response time (critical path)
- Database query: < 100ms for top 10 matches

**Bundle Size**
- Initial PWA bundle: < 500 KB (gzipped) — important for low-bandwidth venues
- Image optimization: all user photos < 100 KB (auto-compressed on upload)
- Lazy load: feed photos, non-critical components

### Security & Privacy

**Data Storage & Protection**
- Attendee phone numbers: stored in NestJS backend, encrypted at rest (TLS 1.3 in transit)
- Personal QR codes: unique, non-sequential, opaque identifiers (not phone numbers)
- Meeting records: stored with attendee IDs, not PII
- Consent: attendees explicitly consent to data storage and reuse at profile setup (DPDP Act 2023 compliance)
- Data retention: attendee data persists beyond the single event (for future Evento events) unless attendee requests deletion

**Authentication & Authorization**
- Attendee login: email magic links only — single-use, signed, 30-minute expiry (no personalized WhatsApp deep links; the group link is generic and carries no token)
- Magic-link token in the URL: unavoidable for email links (that's how the link arrives), and acceptable because the token is single-use, hashed at rest, and short-lived — but the verify page must (a) strip the token from the address bar/history immediately after consuming it (`history.replaceState`), so it doesn't linger in browser history on shared devices, and (b) load no third-party resources, so the token can't leak via the `Referer` header. The session itself is never carried in a URL — it lives in an httpOnly cookie from the moment the token is exchanged.
- QR codes: signed with a secret so only valid codes can be scanned
- Admin dashboard: password-protected, organizer login required
- Session management: 30-minute idle timeout; session stored in secure HTTP-only cookies

**API Security**
- Rate limiting: 100 requests/minute per user (prevent brute-force or DDoS)
- CORS: restricted to Evento domain only
- Input validation: all user inputs validated server-side (not just client-side)
- SQL injection: use parameterized queries; ORM used (avoid raw SQL)
- CSRF: CSRF tokens on all state-changing requests

**QR Code Security**
- QR codes are unique per attendee and include a server-signed signature
- Scanning a QR decodes the attendee ID and verifies the signature server-side
- If signature is invalid, scan is rejected ("Invalid QR code")

### Offline-First Architecture

**What Works Offline**
- **QR scanning & meeting detection:** Scans are recorded locally and synced when online
- **Check-in:** Attendee can manually tap "Check in" button; recorded locally and synced
- **Directory & matches:** Full list and pre-computed matches are cached at event start
- **My Connections:** Cached list of met and bookmarked people
- **Settings & profile:** Personal profile cached

**What Requires Online**
- **Leaderboard:** Depends on server to aggregate and rank; sync happens when online
- **Event feed:** Needs server to fetch new posts; can show cached posts offline
- **Real-time analytics:** Admin dashboard; not available offline
- **Magic-link login emails:** Sending login links requires internet (attendee side and server side)

**Sync Strategy**
- Changes are recorded locally (in IndexedDB or browser storage)
- When connection returns, app detects and syncs:
  - QR scans: POST to `/api/meetings`
  - Bookmarks: POST to `/api/bookmarks`
  - Photo uploads: multipart POST to `/api/photos` (retry on failure)
  - Feedback: POST to `/api/feedback`
- Sync is automatic and silent; user sees notification when complete
- Duplicate detection: server checks if meeting already exists by (attendee_A_id, attendee_B_id) pair

**Device Storage**
- IndexedDB: ~50 MB available; storing attendee profiles, meeting records, bookmarks, cached feed
- Session storage: auth tokens, temporary UI state
- Local storage: user preferences (theme, language, tutorial dismissed)

### Reliability & Resilience

**Error Handling**
- Network errors: show "You're offline. Some features are limited." with retry button
- QR scan fails: "Can't scan QR. Try positioning the code closer or under better light."
- API timeouts: retry up to 3 times with exponential backoff
- Payment/third-party failures: graceful fallback (e.g., photo upload fails → show offline cache, retry later)

**Data Integrity**
- Duplicate scans: server enforces uniqueness constraint on (attendee_A, attendee_B) pairs
- Profile updates: optimistic UI update followed by server confirmation
- Photo uploads: confirm receipt before deleting local copy
- Feedback: non-blocking; won't cause app to hang if submission fails

**Monitoring**
- Error logging: all client errors logged to server (with user context) for debugging
- Server logs: API errors, failed syncs, performance metrics
- Admin alerts: if check-in API is down or sync queue is growing, notify organizer

---

## Open Questions & Risks

### Questions Requiring Decision

| Question | Impact | Resolution |
|----------|--------|-----------|
| **Numeric targets for adoption and satisfaction** | Needed to call the pilot a success/failure. Currently metrics are defined, not the bar. | Decision: Set target adoption rate (% of invitees who install and complete profile) and satisfaction score (e.g., 4.0+/5.0). Recommend: adoption 50–60%, satisfaction 3.8+. |
| **Directory visibility: checked-in only or full pre-registered?** | Affects whether attendees can plan to meet someone not yet arrived vs. only see who's present. | **Resolved:** Show the full pre-registered attendee list so pre-event planning works; expose check-in state and a checked-in/not-checked-in filter. The current attendee is excluded from their own results. |
| **Who owns printing physical QR badges, and at what cost?** | Logistics and budget impact. | Decision: Organizer prints before event or on-demand at check-in desk. Evento provides PDF template. Estimated cost: < $50 for 200 badges. |
| **Exact consent copy for data storage and reuse** | Legal/DPDP compliance. Must be finalized before the sign-up link is posted in the group. | Decision: Work with legal to draft. Suggest: "Your data will be stored and reused for future Evento events. You can request deletion anytime." |
| **Venue WiFi/network capacity testing** | Unknown if offline-first assumption holds or if connectivity is completely down. | Decision: Test at venue a few days before; measure signal strength, throughput, peak load. Adjust app caching strategy if needed. |
| **Privacy opt-out from public directory** | Some attendees may not want to be discoverable. Not currently supported. | Decision: Defer to Phase 2 or add simple toggle in profile: "Show me in directory: Yes/No". |
| **Fixed table assignment vs. open floor plan** | Table model assumes assigned seating. Future events may be different. | Decision: Table numbers are optional; if not provided, attendee sees "Find me at the event" instead. Works for either model. |
| **Does Evento verify payment (₹4,000 registration fee)?** | Registration form collects a payment screenshot + amount; unclear if Evento needs a review/approval step. | **Resolved:** Out of scope for Evento. The organizer's own registration process (Google Form) handles payment verification; only confirmed, paid attendees are exported into the CSV Evento imports. Evento's schema has no payment fields. |
| **How should RMB chapter affiliation be used?** | Registration captures chapter for RMB members; unclear if it's just informational or an active product signal. | **Resolved:** Used as a matching + filtering signal, not just metadata. Cross-chapter matches are surfaced deliberately (same-chapter members likely already know each other) — see Feature 2, US2.1. Directory gets a chapter filter. Non-RMBians (no chapter) match on business category/tags only. |
| **Where do category, city and chapter dropdown options come from?** | Hardcoded or attendee-derived lists become empty/inconsistent and cannot be managed without a release. | **Resolved:** Active database reference records are canonical. Business categories and a broad Indian city catalogue are normalized reference tables; cities display as `City, State/UT`. Chapter uses active Chapter records. Directory receives these lists independently of attendee results; company remains attendee-derived. |
| **How does attendee login work without an SMS OTP vendor?** | No SMS vendor is budgeted for the pilot; need a passwordless mechanism for returning attendees. | **Resolved:** Passwordless magic link via email only (now a required registration field). No WhatsApp-delivered login link, no SMS OTP vendor. Staff-assisted lookup is the sole fallback for an attendee with no working email access. See Feature 1, US1.5. |

### Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Low PWA adoption due to installation friction** | Medium | High | Send clear WhatsApp instructions; reduce profile form to 4–5 fields; offer fallback: web-only, no install needed (slower but works). |
| **QR scanning fails consistently in a noisy, crowded venue** | Medium | High | Use high-contrast, large QR codes (1-inch); test camera phone in low light before event; fallback: staff manual check-in via phone/tablet. |
| **Venue WiFi entirely down for 1+ hours** | Low | High | Design app fully offline-first; test sync when reconnected; educate attendees: "Most features work offline; syncs when you're online." |
| **Organizer forgets to post the sign-up link in the group 5 days early** | Low | Medium | Onboarding is a manual group post (no vendor) — put the Day -5 / Day -1 / Day +1 posts in the runbook checklist and assign an owner; team reminds the organizer if the post hasn't gone out. |
| **Attendees don't know who to meet / low match quality** | Medium | Medium | Pre-event email: "Here's who you should try to meet." Show top 10 matches prominently. Allow browsing full directory. Collect feedback on match quality. |
| **Photo feed becomes a distraction instead of engagement** | Low | Low | Keep feed small on home screen; make it secondary to leaderboard. Moderation is available if needed. |
| **Admin dashboard is too complex for organizer** | Low | Medium | Keep dashboard focused on 3–4 key metrics (check-ins, meetings, feedback). Offer email summary if organizer doesn't check in-event. |
| **DPDP compliance issues with data persistence / WhatsApp** | Low | High | Finalize consent language early; have legal review. Store only necessary PII. Provide easy data deletion/opt-out. |
| **Duplicate QR codes or security breach** | Very Low | Very High | QR codes include server-signed tokens; validate on every scan. Use strong signing key. Log all scans for audit trail. Rotate keys if breach suspected. |

---

## Appendix — Brainstorm Traceability

Mapping original sticky-note brainstorm to decisions in this PRD, for transparency.

| Original Idea | Board Status | Decision | Section |
|---------------|-------------|----------|---------|
| Smart attendee matching | Keep | In scope — rule-based for MVP | 6.3 |
| Digital business card exchange (QR) | Keep | In scope — unified with met-detection | 6.6 |
| Real-time event schedule + session recommendations | Discard (difficult) | Out of scope | 4.2 |
| Profile setup during registration | Keep | In scope | 6.2 |
| Interactions/Bookmark | Keep | In scope | 6.7 |
| Scan QR & mark as met | Unresolved | QR for MVP; NFC deferred to Phase 2 | 6.6, Phase 2 |
| Interactive venue maps with networking zones | Discard | Out of scope (fixed-table model) | 4.2 |
| Post-event follow-up + conversation starters | Keep | Reminder + summary only; AI starters deferred | 6.11, Phase 2 |
| Live polling & Q&A | Discard | Out of scope | 4.2 |
| Mark attendance | Keep | In scope — auto + staff QR fallback | 6.5 |
| Event images on same link | Keep | In scope — photo feed | 6.9 |
| Summary of the event | Keep | In scope | 6.11 |
| Table number allocation | Keep | In scope — every attendee gets one | 6.4 |
| Gamification (Star/Met, leaderboard) | Keep | In scope — points only, no prizes | 6.8 |
| Selfie + caption posts | Keep | In scope — unmoderated for pilot | 6.9 |
| Trigger review/feedback | Keep | In scope — end-of-event prompt | 6.10 |
| Save as contact | Keep | In scope — vCard export | 6.12 |
| Event/member/contact details | Keep | In scope | 6.1, 6.2 |
| PWA | Keep | In scope | 6.15 |
| Analytics | Keep | In scope — attendee + admin views | 6.13 |
| Instructions (5-day nudge, tutorial, 1-day reminder) | Keep | In scope | 5.1, 6.15 |

---

## Summary of Scope

### In Scope (Pilot MVP)

✓ Attendee import & auto-generate QR  
✓ Group-link onboarding flow (admin posts sign-up link in WhatsApp group; email magic-link login)  
✓ Profile setup (structured tags + free text)  
✓ Rule-based attendee matching  
✓ Leaderboard & met counter  
✓ QR scan to exchange cards + log meeting  
✓ Bookmark / interactions  
✓ Event photo feed (unmoderated)  
✓ Admin dashboard (attendee management, analytics, feed moderation)  
✓ PWA with offline-first critical flows  
✓ Post-event summary (in-app; follow-up nudge via manual admin group post)  
✓ Feedback prompt  
✓ Save as contact (vCard)  

### Out of Scope (Phase 2)

✗ Multi-tenant / multi-event platform  
✗ In-app chat  
✗ AI / semantic matching  
✗ NFC / proximity-based auto detection  
✗ Tiered badges + sponsor prizes  
✗ AI-generated conversation starters  
✗ Multi-language UI  
✗ Native mobile app (iOS/Android)  
✗ Interactive venue maps  
✗ Real-time event schedule  
✗ Live polling & Q&A  

---

**Document prepared by:** Claude  
**Last updated:** July 16, 2026  
**Next steps:** Design mockups, backend API spec, frontend component library
