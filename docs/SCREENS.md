# EVENTO — Screen Specification Document

Comprehensive list of all screens, organized by module. Each screen includes states, interactions, navigation, data requirements, and edge cases.

---

## Module 1: Pre-Event Onboarding (Group Sign-Up Link)

> **Distribution note:** there is no WhatsApp API/vendor integration. The admin manually posts one generic app link in the attendee WhatsApp group; attendees enter by requesting an email magic link on Screen 2.0 (which serves both first-time sign-up and returning re-entry). First-time users are routed here to Profile Setup after their magic link is verified.

### Screen 1.1: Profile Setup Form

**Module:** Onboarding  
**Purpose:** Attendee answers questions about themselves to set up a profile before the event

**States:**
- **Default:** Form displayed with business-category/looking-for/offering/goals/bio/LinkedIn/website empty; name, email, phone, business/profession name, chapter and photo already filled in (read-only) from registration
- **Loading:** Spinner on "Submit" button; fields disabled while saving
- **Success:** "Profile saved!" confirmation → auto-redirect to PWA install prompt
- **Error:** "Something went wrong. Please try again." (with retry button)
- **Validation Error:** Red border on required fields; message: "This field is required"

**User Interactions:**
- Tap business category dropdown → open dropdown picker (single select — e.g., Manufacturer, Trader/Distributor, Service Provider, Retailer, Professional)
- Search/select City from the database-backed `City, State/UT` suggestions (required; pre-filled if the import file provided a valid or preserved legacy value)
- Tap "Looking for" dropdown → open multi-select checklist overlay (shared business-type taxonomy with Offering — e.g. Real Estate Builders, Interior Designer, Digital Marketing); selected items shown in the closed field
- Tap "Offering" dropdown → open multi-select checklist overlay (same business-type taxonomy as Looking for); selected items shown in the closed field
- Tap "Goals" tags → open tag selector (multi-select)
- Type in "Bio" text field (optional, 200 char max)
- Type in "LinkedIn URL" and "Website URL" fields — both optional (F4.7), grouped last under an "Add your links (optional)" heading so they never read as blockers on the under-a-minute path; validated on blur/submit, not per keystroke
- Tap "Submit" button → validate & submit
- Tap "Skip for now" → move to PWA install prompt without saving; profile stays incomplete, so the attendee is routed back to this form on their next login

**Navigation:**
- **Comes from:** Login / Get Access Link (2.0) — first-time attendee lands here after their email magic link is verified and no completed profile exists
- **Leads to:** PWA Install Screen (1.2) or Thanks Screen (1.3)

**Data Needed to Display:**
- Pre-filled and read-only, from registration: name, email, phone, business/profession name, RMB chapter (if any), photo (initials avatar shown if no photo on file)
- LinkedIn URL and website URL, pre-filled and **editable** if the import file supplied them (F1.1's optional column mapping); empty otherwise
- Business category options (dropdown list — the only categorization field; no separate "industry" field, to avoid asking the same thing twice)
- Active city options from the nationwide database catalogue, displayed as `City, State/UT` with type-ahead/search suggestions
- "Looking for" dropdown options (multi-select, shared business-type taxonomy with Offering)
- "Offering" dropdown options (multi-select, same taxonomy as Looking for)
- "Goals" tag options (multi-select)

**Edge Cases:**
- Phone number already in system but no profile yet → pre-fill phone/email/photo/chapter, show "Complete your profile"
- Phone number not found → show error "You're not registered for this event"
- Magic-link session expired mid-setup → send back to Login (2.0) with "Your session expired. Request a new link" (form progress preserved locally where possible)
- User goes back (browser back button) → warn "Progress will be lost" before leaving
- Network fails mid-submit → show "Saving..." and retry when online
- User fills only required fields and submits → save successfully, move forward
- User fills all fields and submits → save and show success state
- Registration photo failed to upload / file corrupted → treat as no photo, initials avatar used everywhere; no blocking error shown to attendee
- LinkedIn/website left blank → valid, submit proceeds; the profile is complete without them and no reminder or nag is shown later
- Bare host typed ("acme.in", "linkedin.com/in/radha") → accepted, normalized to `https://` on save, no error
- Malformed URL → inline error on that field only ("Enter a valid link, e.g. https://acme.in"); the rest of the form is retained
- Non-LinkedIn URL in the LinkedIn field → inline error "That doesn't look like a LinkedIn URL"; the value is not silently moved to the website field
- Imported LinkedIn/website value is malformed → keep it as the field's starting value and flag on blur, so the attendee can fix the organizer's data rather than being blocked by it

---

### Screen 1.2: PWA Install Prompt

**Module:** Onboarding  
**Purpose:** Offer attendee to install the PWA app on their home screen for offline access

**States:**
- **Default:** "Install Evento" button visible with app icon and description
- **Already Installed:** "App installed! Open it here" button; can skip
- **Install in Progress:** Button shows spinner "Installing..."
- **Install Failed:** "Installation failed. Tap to try again" or show manual instructions
- **Dismissed:** User can tap "Not now" → still navigate to pre-event matches

**User Interactions:**
- Tap "Install" button → trigger native PWA install prompt (if browser supports)
- Tap "Install" (after native prompt) → browser installs to home screen
- Tap "Not now" → skip installation, go to pre-event matches
- Tap "Manual install instructions" → show modal with "Add to home screen" steps
- Tap "Learn more" → show brief tooltip about offline features

**Navigation:**
- **Comes from:** Profile Setup Form (1.1)
- **Leads to:** Pre-Event Matches Screen (1.4) or App Home Screen (2.1) if already open

**Data Needed to Display:**
- App name, description, icon
- Installation status (installed/not installed)
- Supported browsers list (for manual install instructions)

**Edge Cases:**
- Browser doesn't support PWA install → show "Add to home screen" instructions instead
- App already installed → skip this screen automatically
- User dismisses install prompt in native dialog → show "Manual instructions" fallback
- User installs but then uninstalls → allow re-installation on next visit
- Low storage on device → show "Free up storage first" message

---

### Screen 1.3: Thanks & Welcome Screen

**Module:** Onboarding  
**Purpose:** Confirm profile completion and set expectations for next steps (before event)

**States:**
- **Default:** Confirmation message with next steps
- **Loading:** (N/A)

**User Interactions:**
- Tap "View my matches" → go to Pre-Event Matches (1.4)
- Tap "Open app" → launch PWA if installed
- Tap "Done" → close screen, return to browser home

**Navigation:**
- **Comes from:** Profile Setup Form (1.1) or PWA Install Prompt (1.2)
- **Leads to:** Pre-Event Matches Screen (1.4) or closes

**Data Needed to Display:**
- Confirmation message: "Your profile is set up!"
- Pre-event info: "Matches are ready. See you at the event!"
- CTA buttons

**Edge Cases:**
- User hasn't installed app yet → encourage installation with "Open app" button disabled
- User already has app installed → show "Open app" button active
- User bookmarks this page → remind them to install app later

---

### Screen 1.4: Pre-Event Matches & Directory

**Module:** Onboarding (accessible before event)  
**Purpose:** Show attendee their suggested matches before the event so they can plan who to meet

**States:**
- **Default:** List of top 10 matches displayed with card view
- **Loading:** Skeleton loaders for 10 match cards
- **Empty:** "No matches yet. Complete your profile to see suggestions" (if matches not computed)
- **Success:** Matches loaded and displayed
- **Error:** "Can't load matches right now. Try again when you open the app at the event"

**User Interactions:**
- Swipe or scroll through match cards (horizontal or vertical, depending on design)
- Tap on a match card → open Individual Profile Screen (2.3)
- Tap bookmark/heart icon on card → bookmark this person ("Want to meet")
- Tap "Browse all attendees" → open Directory Screen (2.2) with filters
- Tap "Refresh" → reload matches

**Navigation:**
- **Comes from:** Thanks & Welcome Screen (1.3) or app launch
- **Leads to:** Individual Profile Screen (2.3) or Directory Screen (2.2)

**Data Needed to Display:**
- Top 10 matched attendees: name, company, business category, table number, match reason
- Bookmark status for each (is this person already bookmarked?)
- Current user's profile (for sidebar or header)
- Total attendee count

**Edge Cases:**
- No matches computed yet → show "Matches will be ready soon" 
- User's own profile incomplete → show "Complete your profile to see matches"
- Attendee profile not found → show "There's an issue with your profile. Re-open the app."
- Network offline → show cached matches (if cached) or message "Matches will load when online"

---

## Module 2: Attendee App (Main Networking Experience)

### Shared Authenticated Navigation (all Module 2 screens)

After session verification and completion of required onboarding, every attendee screen uses the same header and left slide-over menu. Login, magic-link verification, expired-link states and focused onboarding never render attendee identity or navigation, including during loading, so private information cannot flash before authentication resolves.

The drawer contains one flat list—no main/submenu hierarchy and no section headings—in this order: **Home · People to Meet · Attendee Directory · My Connections · Leaderboard · My Profile · Show My QR**. Sign Out is separated at the bottom. Scan QR remains a prominent contextual action on Home and networking screens, not a permanent navigation item. Feed, Feedback, Summary, Tutorial, Install, About and Terms are reached contextually from Home/Profile and do not belong in the primary drawer.

**States and rules:**
- **Closed:** 44×44px menu trigger in the attendee header.
- **Open:** left drawer, maximum 88% of phone width / 360px, scrim behind it, background scrolling locked.
- **Active:** current destination uses `brand-100` background and `brand-700` text and exposes `aria-current="page"`.
- **Development preview:** planned routes are disabled, marked **Soon** and expose `aria-disabled="true"`; they never open placeholders.
- **Production:** planned/disabled destinations are omitted until their owning feature is enabled.
- Close using the close button, scrim, Escape or Android/browser Back; return focus to the trigger and remain on the current screen.
- Cached destinations remain usable offline. Opening/closing the drawer must not restart geolocation, clear scanning state, discard edits or reload the page.
- Session expiry closes the drawer, removes attendee data from view and returns to Login.

---

### Screen 2.0: Login / Get Access Link

**Module:** Auth (single entry point — both first-time sign-up via the group link AND self-serve re-entry for a returning attendee who lost their session: new phone, cleared browser data, reinstalled PWA. Zero staff involvement in the normal case.)
**Purpose:** The one door into the attendee app. The admin posts a generic, tokenless app link in the attendee WhatsApp group; opening it (with no valid session) lands here.

**Why this screen exists / how it works:**
Evento has no passwords and no WhatsApp messaging vendor — the group link is the same for everyone and carries no identity. An attendee's "account" is created by the organizer's import (Screen 3.3) — the registration form already collects email for every attendee, so email is a **required** import field, not something asked for later. The mechanism is a passwordless magic link:

1. Attendee enters their **email** on this screen.
2. Server looks up that email against imported/profile records (case-insensitive exact match).
3. **Regardless of whether it matched**, the UI shows the same neutral message: *"If that email is on the guest list, we've sent you a link."* This is deliberate — it stops someone from using this screen to discover who is or isn't registered for the event (email/phone enumeration).
4. If it matched, the server issues a **single-use, signed token good for 30 minutes** and emails a link containing it.
5. Attendee opens the email, taps the link, and lands in the app already authenticated — the token is exchanged for a normal session and then immediately invalidated (can't be reused or forwarded). **Routing after auth:** no completed profile → Profile Setup (1.1, first-time onboarding); completed profile → Home (2.1).

**This is also the answer to "what if someone enters another attendee's email":** it doesn't get *them* in. The link is only ever delivered to the inbox on file for that record — typing in someone else's email just sends *that person* a link, it never grants the person typing it any access. Combined with the neutral response in step 3 and rate limiting (see below), this closes both the impersonation and the enumeration concern with the same mechanism.

**States:**
- **Default:** Email input + "Send me a link" button
- **Sending:** Button shows spinner, disabled
- **Sent (always shown on submit, match or not):** "Check your email — if that address is on the guest list, a link is on its way." + "Didn't get it? Resend in 60s" (countdown, then re-enabled)
- **Rate-limited:** "Too many attempts. Try again in [X] minutes." (max ~5 sends/hour per email, ~3/hour per requesting device)
- **Link expired or already used:** On landing from an old/reused link → "This link has expired. Request a new one." → back to default state
- **No email on file:** Not a distinct state (would leak registration status) — falls under the same neutral "sent" message

**User Interactions:**
- Type email → tap "Send me a link"
- Tap "Resend" after cooldown
- Tap "Ask event staff for help" (tertiary, small) → the only path that involves a person; staff can look the attendee up in Check-In Management (3.4) and trigger a resend on their behalf for the rare case where email isn't reachable at all (lost access to the inbox, typo in the registration form itself, etc.) — email is the single self-serve channel, so this is the sole fallback

**Navigation:**
- **Comes from:** The group sign-up link (first-time), or app opened with no valid session (expired/cleared/new device)
- **Leads to:** Profile Setup (1.1) for first-timers, or Home / Dashboard (2.1) for returning attendees, once the emailed link is tapped and the session is established

**Data Needed to Display:**
- Nothing attendee-specific up front (this screen is intentionally identity-blind until the email is submitted)

**Edge Cases:**
- Attendee's registered email has a typo from the registration form itself (not catchable by Evento) → staff-assisted lookup is the only recourse (see Check-In Management, 3.4)
- Attendee fat-fingers their email at login → neutral "sent" message either way; no error state that confirms a typo vs. non-registration, by design
- Attendee spams the resend button → rate limit kicks in with a clear cooldown message, not a silent failure
- Link opened on a different device than it was requested from → still works; the token isn't bound to a device, only to the attendee record and a 30-minute window
- Import's two raw "Email Address" columns from the registration form (Google-account-captured vs. the form question) disagree → admin import flags the row for manual review rather than silently picking one (see Screen 3.3)
- Attendee has no working access to email at the venue at all → staff-assisted lookup (Check-In Management, 3.4) is the only path; there is no self-serve channel beyond email for this pilot

**Implementation note:** email is a required import field (Screen 3.3) — the registration form already collects it for every attendee, so there is no "optional/add-it-later" case to design for. Login is single-channel (email only); there are no WhatsApp-delivered links of any kind — no messaging vendor is integrated. WhatsApp appears in the product only as (a) the group where the admin manually posts the app link and (b) attendee-initiated `wa.me` deep links (message a connection, share summary).

---

### Screen 2.1: Home / Dashboard

**Module:** Home  
**Purpose:** Central hub showing attendee's key stats, quick actions, and navigation to main features. Includes check-in status prominently.

**Layout:** Full-page (edge-to-edge, no floating card) — a full-width color band at the top (tone
matches the state: blue while detecting, green once arrived/checked-in, orange when a manual tap
is needed) with a big status icon and heading, then a borderless content column below it that's
centered and width-capped on tablets, never boxed in a bordered card. Same structure scales from
phone to iPad; only the band padding and heading size grow at wider viewports.

**States:**
- **Locating:** Full-page blue band, "Finding the venue…" — brief (up to 5s), not a bare spinner floating alone
- **Arrived (not yet confirmed):** Full-page green band, "You've arrived", body has a "Check in" button — check-in is deliberately **not** automatic; the attendee taps to confirm. (Revised from the original silent-auto-checkin design — see Edge Cases.)
- **Checked In:** Full-page green band, "Checked in at 9:15 AM", body shows name/company and "Show this screen at the registration counter" — this is the proof-of-check-in screen, by design (no QR here; that's a different feature, F4's own-QR display)
- **Not Checked In (proximity unclear):** Full-page orange band, "Not checked in"; reason shown: "Geolocation failed", "Outside venue area", "Location services off", or "Venue location isn't set up yet"
- **Offline:** Info-tone banner "You're offline — this will sync once you're back online"; check-in still works (queued, see PF4)

**Check-In Flow (Detailed):**
```
App opens
  ├→ Fetch attendee + check-in status + venue config (cached for offline)
  ├→ Already checked in? → skip straight to "Checked In" screen, no re-detection
  └→ Not yet checked in → request geolocation (5s timeout)
      ├→ Within venue radius → "Arrived" screen → attendee taps "Check in" → "Checked In" screen
      └→ Outside radius / failed / venue not configured → "Not Checked In" screen →
         attendee taps "Check in manually" → confirm → "Checked In" screen
```

**User Interactions:**
- Tap menu button → open the shared authenticated navigation drawer
- Tap "Check In Manually" button → navigate to Manual Check-In Screen (2.1A)
- Tap stats (met count, rank) → navigate to Leaderboard (2.5)
- Tap "Scan QR" button → open QR Scanner (2.4)
- Tap "My Connections" → open My Connections Screen (2.6)
- Tap "Directory" → open Directory Screen (2.2)
- Tap "Feed" → open Event Photo Feed (2.8)
- Use the drawer → open Settings / Profile (2.11)
- Tap table number → show table info or simple toast "Table [N]"
- Pull to refresh → reload stats and check-in status

**Navigation:**
- **Comes from:** PWA app launch, Settings, any back nav
- **Leads to:** Manual Check-In (2.1A), Scanner (2.4), Connections (2.6), Directory (2.2), Feed (2.8), Settings (2.11), Leaderboard (2.5)

**Data Needed to Display:**
- Attendee name & company (header)
- Check-in status: "Checked in at [time]" OR "Not checked in" OR "Checking in..."
- Check-in method (if displayed): "via location", "manual", "staff scan"
- Stats: met count, leaderboard rank, people bookmarked
- Table number assignment
- Current time at event
- Event start/end time

**Edge Cases:**
- Geolocation permission not granted → show "Location permission needed" + link to enable
- Geolocation request times out (slow GPS) → treat as failure, show Check In button
- Attendee is outside venue radius but wants to check in → allow manual check-in button (organizer can verify)
- Attendee checked in but hasn't scanned anyone → show "No meetings yet. Start scanning!" prompt
- No internet connection → offline banner; check-in button still works (will sync later)
- Event has ended → show "Event ended" message; hide check-in button; show "View Summary" link
- Data corrupted or sync failed → show "Something went wrong" with retry option
- First-time user (session 1) → show tutorial overlay explaining check-in + feature buttons
- Geolocation enabled but venue not configured by organizer → skip auto check-in, require manual button
- Why a tap instead of fully silent auto-checkin: the "Checked In" screen is what the attendee shows at the registration counter, so the moment of checking in needs to be something they consciously did and are aware of — not a background event they might not notice before walking up to the desk

---

### Screen 2.1A: Manual Check-In (Fallback)

**Module:** Home / Check-In  
**Purpose:** Allow attendee to manually confirm attendance if geolocation fails or is unavailable

**Layout:** Not a separate modal/dialog — implemented as a state within the same full-page Home
flow (2.1), reusing its orange "not checked in" band. Simpler than routing to a distinct screen,
and keeps the whole check-in experience on one URL.

**States:**
- **Default:** Full-page orange band + "Confirm you're at the venue to start networking" body copy and action button
- **Confirming:** Button shows spinner "Marking you present..."
- **Success:** Transitions straight to the shared "Checked In" full-page state (2.1) — no separate toast/dialog
- **Already Checked In:** Same "Checked In" state (server dedupes, no distinct message needed)
- **Error:** Inline warning banner "Can't check in. Try again or ask staff to scan your QR" with "Retry" button
- **Offline:** Info-tone banner "Saved offline — will sync when you're back online"

**User Interactions:**
- See prompt: "Confirm you're at the venue to start networking"
- Tap "Check In" button → submit check-in
- Tap "Cancel" or back → dismiss, return to Home
- On error, tap "Retry" → attempt check-in again
- On success, tap "Continue" or auto-return to Home (2s delay)

**Navigation:**
- **Comes from:** Home Dashboard (2.1) → tap "Check In Manually" button
- **Leads to:** Home Dashboard (2.1) on success or cancel

**Data Needed to Display:**
- Confirmation message: "Are you at the venue? Confirm to start networking."
- Check In button (prominent, teal/blue color)
- Cancel button (secondary)
- Loading state spinner
- Success message with timestamp
- Error message with retry option

**Edge Cases:**
- Geolocation is actually on and attendee is in radius → still allow manual check-in (no harm, server deduplicates)
- Manual check-in request times out (no internet) → show "Check in offline. Will sync later." + success state
- Network error during manual check-in → show "Can't reach server. Try again." with Retry button
- User taps Check In multiple times → disable button after first tap to prevent double-submit
- Check-in succeeds but sync fails later → show "Syncing..." and retry silently
- Attendee not in registered attendee list → show error "You're not registered for this event. Contact organizer."
- Staff has already checked them in via QR → show "You're already checked in" (no duplicate)
- Server rejects check-in (event hasn't started) → show "Event starts at [time]. Check back then."

---

### Screen 2.2: Directory / All Attendees

**Module:** Networking  
**Purpose:** Browse all attendees, filter, and search to find people to meet

**States:**
- **Default:** Full list of attendees in card view (scrollable)
- **Loading:** Skeleton loaders for attendee cards
- **Empty:** "No attendees found" (if filter returns 0 results)
- **Filtered:** List showing only filtered results (e.g., "Manufacturing, 12 results")
- **Searched:** Results matching search term (e.g., "Deepak, 3 results")
- **Error:** "Can't load directory. Check your connection."

**User Interactions:**
- Scroll through list (lazy load more on scroll)
- Tap filter icon → open filter drawer (business category, city, company, RMB chapter — including a "no chapter" option for non-RMBians — checked-in status)
- Tap search bar → open search input, type name/company
- Tap "X" on search → clear search
- Tap on attendee card → open Individual Profile (2.3)
- Tap bookmark/heart icon → bookmark this person
- Swipe card left (optional) → show "More" menu (call, WhatsApp, etc.)

**Navigation:**
- **Comes from:** Home Dashboard (2.1), Matches Screen (1.4), Leaderboard (2.5)
- **Leads to:** Individual Profile Screen (2.3)

**Data Needed to Display:**
- Full attendee list: photo (initials avatar if none on file), name, company, business category, RMB chapter (if any), table number, check-in status
- Filter options: active business-category reference list, active nationwide city reference list, active chapter reference list, and attendee-derived company list
- Search index (client-side for offline)
- Bookmark status for each attendee (added by F5.1; omitted from the F2.4-only response/UI)

**Canonical dropdown sources:** business-category, city and chapter filter options come from active database reference tables. They remain populated even when the directory has no attendee cards. Cities use a nationwide Indian catalogue and display as `City, State/UT`; the UI must remain usable with the larger list. Company options remain attendee-derived.

**Implementation sequencing:** F2.4 initially hides bookmark controls until F5.1 is available. Directory browsing, search, filters, sorting, check-in state and offline cache are independently complete.

**Edge Cases:**
- Directory is empty (0 attendees registered) → show "No attendees yet. Check back later."
- Attendee not checked in yet but in directory → show in separate section or with "not checked in" badge
- Search returns 0 results → show "No matches found for '[query]'"
- Filter selected but no results → show "No attendees in [filter]"
- Device storage full → show "Directory cached; some data may be outdated"
- Directory not yet cached → show "Loading..." and use skeleton loaders

---

### Screen 2.3: Individual Attendee Profile

**Module:** Networking  
**Purpose:** View detailed info about a single attendee (potential or past connection)

**States:**
- **Default:** Profile card with all info displayed
- **Loading:** Skeleton for profile content
- **Not Met:** Show action buttons: Bookmark, Scan QR, Share, Call
- **Already Met:** Show action buttons: Add Note, View Note, Call, WhatsApp, Save to Contacts
- **Bookmarked:** Show bookmark/heart icon filled
- **Error:** "Can't load profile. Try again."

**User Interactions:**
- Tap "Bookmark" / heart icon → bookmark this person
- Tap "Scan QR" → open QR Scanner (2.4) pre-focused on this person
- Tap "Call" → native dialer with their phone number
- Tap "WhatsApp" → open WhatsApp with pre-filled message
- Tap "LinkedIn" / "Website" → open the attendee's link in a new tab (F4.7); shown only when they added that link — an empty one renders no control at all, never a disabled one
- Tap "Save to Contacts" → export vCard to native contacts (2.10)
- Tap "Add Note" → open note editor
- Tap "View Note" → show existing note in modal
- Tap back button → return to Directory or Matches
- Tap share icon → share profile via WhatsApp/other apps

**Navigation:**
- **Comes from:** Directory (2.2), Matches (1.4), Leaderboard (2.5), My Connections (2.6)
- **Leads to:** QR Scanner (2.4), Note Editor, native apps (Phone, WhatsApp)

**Data Needed to Display:**
- Attendee name, company, business category, RMB chapter (if any), phone, email
- Table number
- Photo (from registration; initials avatar if none on file)
- LinkedIn URL and website URL, when present (F4.7) — both nullable, both rendered as tap actions rather than raw text

- Bio/description
- Match reason, when arrived from Matches (1.4) — states the chapter relationship explicitly: e.g. "You're both Manufacturers — she's from the Surat chapter" (cross-chapter) or "You're both in the Ahmedabad chapter" (same-chapter); omitted if either party has no chapter
- Meeting status (met or not)
- Bookmark status
- Any existing notes from current user
- Timestamp of when they met (if met)

**Implementation sequencing:** the base F2.5 profile currently ships registered/profile details, tags, bio, check-in/table state, Call, WhatsApp, native Share and offline cache. It hides bookmark/note state until F5 and personalized match reasons until the decoupled matching service F2.1 is available. Missing dependent actions must not render as disabled dead ends.

**Edge Cases:**
- Phone number missing → disable "Call" button, show message "Phone not available"
- Attendee has no LinkedIn/website → omit that action entirely (no disabled dead end); if they have neither, the link row itself doesn't render
- Attendee has no company → show just name
- Bio is very long → truncate and show "Read more" button
- User viewing their own profile → hide "Scan QR" button, show "This is you" badge
- Attendee not checked in yet → show "Not at event yet" badge, hide meet action
- Meeting data corrupted → show "Can't load meeting info"
- Note too long to display → show preview with "View full note" button

---

### Screen 2.4: QR Scanner

**Module:** Networking  
**Purpose:** Scan another attendee's QR code to log a meeting and exchange contact details

**States:**
- **Default:** Camera feed with QR overlay, ready to scan
- **Scanning:** Highlighted frame when QR detected; "Scanning..." text
- **Success:** Green checkmark, "You met [Name]!" message; pause camera briefly
- **Already Met:** "You've already met [Name]. Move on to someone new!" (yellow warning)
- **Error:** "Can't scan. Try again." (red error); show troubleshooting tips
- **No Camera:** "Camera permission required. Check your settings."
- **Camera Off:** "Your camera is off. Enable it in settings."

**User Interactions:**
- Camera auto-starts on screen load
- Tap "Scan" button / area → keep camera active
- Tap "Flip camera" (if available) → switch to front/back camera
- Tap "Torch" / flashlight icon → toggle camera flash
- Tap "Gallery" or upload icon → select QR from photos (fallback)
- Tap close / back button → exit scanner, return to previous screen
- On success, tap "View profile" → navigate to Individual Profile (2.3)
- On success, tap "Skip" → return to scanner to scan next person

**Navigation:**
- **Comes from:** Home (2.1), Individual Profile (2.3), or direct shortcut
- **Leads to:** Individual Profile (2.3) on success, back to Home on cancel

**Data Needed to Display:**
- Camera feed (native browser API)
- QR decode library (jsQR or html5-qrcode)
- Attendee name to show on success

**Edge Cases:**
- Camera permission denied → show "Camera permission required. Enable in settings."
- QR code invalid or corrupted → show "Invalid QR code. Ask staff for help."
- Duplicate scan detected (already met) → show gentle warning, allow user to re-scan or skip
- Device has no camera → show message "Your device doesn't have a camera"
- Low light → show tip "Try better lighting or use flash"
- Network offline when scanning → scan works offline; syncs when online (show toast "Saved offline")
- QR code not found in frame → show "Can't find QR. Try positioning it in the frame" with animation guide
- User scans their own QR (self-scan) → show error "You can't scan yourself"
- Zoom/pinch gestures → allow zoom to help scan distant QR codes

---

### Screen 2.5: Leaderboard

**Module:** Gamification  
**Purpose:** View live rankings of who has met the most people; motivate networking activity

**States:**
- **Default:** Leaderboard table showing top 20 ranked attendees
- **Loading:** Skeleton leaderboard
- **Live Update:** Highlight new entries/changes with animation
- **Your Rank:** Current user's rank highlighted/scrolled into view
- **Offline:** Show last cached leaderboard with "Last updated [time]" badge
- **Error:** "Can't load leaderboard. Try refreshing."

**User Interactions:**
- Scroll to see top 20 rankings
- Tap on attendee in leaderboard → open Individual Profile (2.3)
- Tap "Refresh" → manually fetch latest rankings
- Auto-refresh every 10 seconds (optional; can be disabled in settings)
- Tap on your own rank → show your stats details
- Pull to refresh → reload leaderboard

**Navigation:**
- **Comes from:** Home Dashboard (2.1), tap on stats
- **Leads to:** Individual Profile (2.3)

**Data Needed to Display:**
- Top 20 attendee rankings: rank #, name, company, met count
- Current user's rank & met count
- Total attendees count
- Last update time

**Edge Cases:**
- Tied rankings (same met count) → show with same rank number, sort alphabetically
- User has 0 meets → show in leaderboard at bottom
- Leaderboard empty (0 attendees checked in) → show "No one has checked in yet"
- Leaderboard not updated yet (server down) → show last cached version with timestamp
- Network offline → show cached leaderboard + "Offline" badge
- User's rank changes mid-view → highlight change with animation
- Attendee name too long → truncate and show "..." on hover/tap

---

### Screen 2.6: My Connections

**Module:** Networking  
**Purpose:** View all people the attendee has met or bookmarked, with details and action options

**States:**
- **Default:** Two tabs (Want to Meet / Already Met) with card list
- **Loading:** Skeleton cards
- **Empty - Want to Meet:** "No one bookmarked yet. Browse the directory to add people."
- **Empty - Already Met:** "You haven't met anyone yet. Start scanning QR codes!"
- **Offline:** Show cached connections + "Offline" badge

**User Interactions:**
- Tap "Want to meet" tab → show bookmarked people
- Tap "Already met" tab → show people scanned with QR
- Tap connection card → open Individual Profile (2.3)
- Tap "..." menu on card → show options: Call, WhatsApp, Save to Contacts, Remove, Add Note
- Tap bookmark/unbookmark icon → move between tabs
- Long-press card → show quick actions (hover states for desktop)
- Sort options: by name, by date met, by bookmark date
- Search within connections (optional)

**Navigation:**
- **Comes from:** Home Dashboard (2.1)
- **Leads to:** Individual Profile (2.3), native apps, Note Editor

**Data Needed to Display:**
- Two lists: bookmarked attendees, met attendees
- For each: name, company, business category, phone, photo (optional)
- Tab badge counts ("Want to meet (5)", "Already met (7)")
- Meeting timestamp (for Already Met tab)
- Notes (if any)

**Edge Cases:**
- No connections in either tab → show empty state with prompt to browse directory
- Connection removed mid-view → update list in real-time
- Note added but not synced → show as pending with "(saving...)" indicator
- Person appears in both tabs → show warning "Also bookmarked" on Already Met tab
- Connection count > 100 → implement pagination or infinite scroll
- Device storage full → show "Can't save new connections" message
- Person deleted their account → show "Contact unavailable" state

---

### Screen 2.7: Post Photo (Camera / Upload)

**Module:** Social  
**Purpose:** Take or upload a photo, add caption, and post to event feed

**States:**
- **Camera Ready:** Camera view ready to take photo
- **Photo Captured:** Frozen frame with retake/confirm buttons
- **Uploading:** Upload progress bar showing "[X]% uploaded"
- **Success:** "Photo posted!" confirmation message
- **Error:** "Can't upload photo. Try again." with retry button

**User Interactions:**
- Tap "Camera" → open device camera
- Tap shutter button → capture photo
- Tap "Retake" → discard and re-capture
- Tap "Use this photo" → confirm and move to caption screen
- Tap "Upload from gallery" → select existing photo from device
- Type caption (max 200 chars) → show character counter
- Tap "Post" button → upload and publish
- Tap "X" / close → discard post and return to feed
- Optional: add filters or edit brightness (Phase 2)

**Navigation:**
- **Comes from:** Home (2.1), Event Photo Feed (2.8)
- **Leads to:** Event Photo Feed (2.8) on success

**Data Needed to Display:**
- Camera view (native browser API)
- Text input for caption
- Character count (max 200)
- Upload progress

**Edge Cases:**
- Camera permission denied → show "Camera permission required. Enable in settings."
- No camera on device → show "Your device doesn't have a camera. Upload from gallery instead."
- Photo upload fails → show error + retry option
- Network offline during upload → queue for upload when online (show "Saved offline. Will post when online.")
- Caption too long → disable "Post" button, show "Caption too long ([X]/200 chars)"
- Device storage full → show "Not enough storage to upload. Free up space and try again."
- Photo file too large → auto-compress before upload
- Duplicate photo detection (optional) → warn "Similar photo already posted"

---

### Screen 2.8: Event Photo Feed

**Module:** Social  
**Purpose:** View all attendees' photos with captions; like and comment on posts

**States:**
- **Default:** Feed showing all photos in chronological order (newest first)
- **Loading:** Skeleton cards for photo feed
- **Empty:** "No photos yet. Be the first to post!"
- **Refreshing:** Pull-to-refresh spinner at top
- **Offline:** Show cached photos + "Offline. Latest photos may not be visible."

**User Interactions:**
- Scroll through feed (infinite scroll, load more on bottom)
- Tap on photo → enlarge in modal view
- Tap like/heart icon → like/unlike photo
- Tap comment icon → open comment sheet
- Type comment → add reply to photo
- Pull to refresh → reload latest photos
- Tap "Post photo" button → navigate to Post Photo screen (2.7)
- Tap attendee name → open their Individual Profile (2.3)
- Tap "..." menu on own post → "Delete" option (with confirm: "Delete this post?") — the post's creator can always delete their own post
- Tap "..." menu on others' posts → show options: report, share, etc.

**Navigation:**
- **Comes from:** Home Dashboard (2.1)
- **Leads to:** Post Photo (2.7), Individual Profile (2.3)

**Data Needed to Display:**
- Photo posts: photo URL, attendee name, company, caption, timestamp
- Like count, comment count
- Current user's like status (liked or not)
- Comments: commenter name, message, timestamp

**Edge Cases:**
- Photo deleted by user → remove from feed with animation
- Post contains inappropriate content (admin deleted) → show "Post removed by moderator" placeholder
- Like added but network offline → queue and sync when online
- Comment submit fails → show error and allow retry
- Feed empty (no posts) → show encouraging message "Be the first to post!"
- User's own post → show "Delete" option instead of report
- Very long caption → truncate in feed, show "..." and full text on tap
- Device storage full → show "Can't load more photos. Free up space."

---

### Screen 2.9: Feedback Form

**Module:** Post-Event  
**Purpose:** Collect attendee feedback on their event experience via rating and comment

**States:**
- **Default:** Rating prompt (5 stars) + comment box, both optional
- **Loading:** Submit button shows spinner
- **Success:** "Thanks for your feedback!" confirmation + auto-dismiss after 2s
- **Error:** "Can't submit feedback. Try again." with retry button

**User Interactions:**
- Tap on star (1–5) to rate experience
- Type comment (max 500 chars) → show character counter
- Tap "Submit" → validate (at least rating required) and submit
- Tap "Skip" → close form without submitting
- Optional: Show emoji reactions (Phase 2)

**Navigation:**
- **Comes from:** Auto-triggered at 4:45 PM or from Home after event ends
- **Leads to:** Home (2.1) or Event Summary (2.10) after submission

**Data Needed to Display:**
- 5-star rating widget
- Text comment box (max 500 chars)
- Character counter

**Edge Cases:**
- User skips form → feedback not recorded (that's OK)
- Submit fails (network error) → show retry button
- User rates without comment → allow submit (comment is optional)
- User types 500+ chars → disable further typing, show "Limit reached"
- Form shown multiple times (organizer triggered multiple times) → allow user to re-submit

---

### Screen 2.10: Event Summary (Post-Event)

**Module:** Post-Event  
**Purpose:** Show attendee their networking results: people met, rank, key stats, and export options

**States:**
- **Default:** Summary with stats, top connections, and action buttons
- **Loading:** Skeleton for summary content
- **Success:** All stats loaded and displayed
- **Error:** "Can't load summary. Try again."

**User Interactions:**
- View stats: people met, rank, cards collected
- Tap "View all connections" → open My Connections (2.6)
- Tap "Download as CSV" → export connections as CSV file
- Tap "Download as vCard" → export all as vCard bundle
- Tap "Share on WhatsApp" → open WhatsApp with pre-filled summary message
- Tap on individual connection → open Individual Profile (2.3)

**Navigation:**
- **Comes from:** Home (2.1) after event ends, or via the app link the admin posts in the WhatsApp group the day after (attendee logs in and lands on their own summary)
- **Leads to:** My Connections (2.6), Individual Profile (2.3), native WhatsApp

**Data Needed to Display:**
- Total people met (count)
- Leaderboard rank
- Total cards collected
- Top 5 connections: name, company, phone, table number
- Event name & date
- Download/export options

**Edge Cases:**
- Attendee met 0 people → show "You didn't meet anyone yet. That's OK! Check out the directory."
- Attendee still has unsync'd data → show "Syncing..." and wait before showing final summary
- Export fails → show error "Can't export. Try again."
- Summary not yet generated (too soon after event) → show "Summary coming soon. Check back in a few minutes."

---

### Screen 2.11: Settings / Profile

**Module:** Settings  
**Purpose:** Show the attendee's own QR code (top of screen, always first) and let them view/edit personal profile, notification preferences, tutorial, etc.

> **Revised (UX revision v1.1 — F4.4/F4.5/F4.8).** The screen's vertical order is fixed as:
> 1. **Own QR code** — pinned at the top, the thing another attendee scans to connect (unchanged intent; already built in F4.1).
> 2. **Attendee Card** — a *designed identity card* (photo/initials, name, company, business category, city, chapter, tags, LinkedIn, website), **not** the list of label/value detail rows shipped today. The two links appear as icon actions on the card and are omitted when empty.
> 3. **Edit Profile button** — opens Screen 2.11a as its own page (replaces the "tap a field to edit inline" interaction described below).
> 4. **Logout** — sign-out lives on this screen, not only in the drawer.
>
> Editing moves off this screen entirely: 2.11 is read-only presentation, 2.11a is the form.

**States:**
- **Default:** Attendee's personal QR code displayed prominently at the TOP of the screen (name directly below it), followed by the settings form with editable fields
- **QR Enlarged:** Full-screen QR modal with screen brightness boosted, for easy scanning by another attendee
- **Editing:** Save button active
- **Saving:** Spinner on save button
- **Saved:** "Saved!" toast confirmation
- **Error:** "Can't save changes. Try again."

**User Interactions:**
- Tap own QR code → enlarge full-screen (brightness boosted); tap again or back to dismiss
- Tap on profile fields (name, company, business category, etc.) → edit (some read-only)
- Toggle notifications on/off
- Tap "View tutorial" → re-show onboarding tutorial
- Tap "About" → show app version, support email
- Tap "Terms & Privacy" → open in browser
- Tap "Sign out" (if applicable) → return to login/start screen
- Tap back → save changes and return to Home

**Navigation:**
- **Comes from:** Home Dashboard (2.1)
- **Leads to:** Home (2.1) on save

**Data Needed to Display:**
- Attendee's own signed QR code (generated/cached locally — must render offline, no network call)
- User's profile: name, company, business category, bio, phone (some read-only), LinkedIn URL and website URL (nullable, F4.7)
- Notification settings
- App version
- Support contact

**Edge Cases:**
- QR not yet cached (first open ever, offline) → show placeholder with "Connect once to load your QR"; cache permanently after first render
- User tries to edit read-only field (phone, email) → show "Contact organizer to change this"
- Changes not saved (user closes without saving) → prompt "Discard changes?"
- Name field empty → show validation error
- Notification toggle switches to off → confirm "You won't get reminders"

---

### Screen 2.11a: Edit Profile *(new — UX revision v1.1, F4.5/F4.6/F4.7)*

**Module:** Settings  
**Purpose:** Let the attendee edit their own card on a dedicated form page, reached from the Edit Profile button on 2.11.

**Editable vs read-only:** editable fields are **exactly the ones onboarding collects** (Screen 1.1) plus photo. Since onboarding now collects LinkedIn and website (US1.6), those two are editable here by the same rule rather than as exceptions to it. Registered details are read-only — changing them is an organizer action, because CSV import dedups on phone+email.

| Field | Editable? |
|---|---|
| Photo | ✅ upload / replace / remove (F4.6) |
| Business category | ✅ dropdown, validated against active reference data (PF8) |
| City | ✅ searchable, validated against active reference data (PF8) |
| Looking for / Offering | ✅ multi-select, shared taxonomy |
| Networking goals | ✅ |
| Bio | ✅ optional, character-capped |
| LinkedIn URL | ✅ optional, URL-validated, linkedin.com host enforced, clearable (F4.7) |
| Website URL | ✅ optional, URL-validated, any host, clearable (F4.7) |
| Name, company, phone, email, chapter, table number | ❌ read-only → "Contact the event organizer to change this" |

Both link fields are **clearable** — emptying one and saving removes it, which also removes its action from the card and profile. That's a valid save, not a validation error.

**States:** Default (prefilled) · Editing (Save enabled once dirty) · Saving (spinner on Save) · Saved ("Saved!" toast, return to 2.11) · Error ("Can't save changes. Try again.", form retained) · Uploading photo (progress + cancel) · Offline (Save disabled with "You're offline — reconnect to save"; edits are **not** queued, unlike check-in).

**User Interactions:**
- Tap photo → choose camera or library → crop → replace; tap Remove → fall back to initials
- Edit any editable field → Save becomes enabled
- Tap Save → validate → persist → toast → return to 2.11
- Tap Cancel/back with unsaved edits → "Discard changes?" prompt
- Tap a read-only field → inline hint "Contact the event organizer to change this"

**Navigation:** **Comes from:** Profile (2.11) Edit Profile button. **Leads to:** Profile (2.11) on save or discard.

**Data Needed to Display:** current profile values; active business-category and city reference lists (PF8); shared looking-for/offering taxonomy; photo URL.

**Edge Cases:**
- Photo too large / wrong type → client-side resize (reuse F7.1's pipeline); reject non-images with a clear message
- Upload fails mid-save → keep other field edits, surface a retry on the photo only
- Category/city no longer active in reference data → keep the existing value as a valid legacy option, per PF8
- Invalid LinkedIn or website URL → inline validation on that field, block save; other edits on the form are retained
- Bare host typed → normalized to `https://` on save rather than rejected
- Non-LinkedIn host in the LinkedIn field → "That doesn't look like a LinkedIn URL"; not auto-moved to the website field
- Link field emptied → saves as removed; the corresponding card/profile action disappears
- Session expires while editing → preserve form state, re-auth, resume
- ⚠️ **Storage dependency:** photo upload requires durable object storage (Supabase Storage). Local-disk `/uploads` does not survive a hosted deploy — see the open question in `FEATURES.md`.

---

### Screen 2.12: First-Time Tutorial

**Module:** Onboarding (In-App)  
**Purpose:** Show new users a quick walkthrough of key features (auto-shown on first launch)

**States:**
- **Default:** Modal overlay showing step-by-step tutorial
- **Active:** Current step highlighted
- **Completed:** All steps shown; user can dismiss

**User Interactions:**
- Swipe left/right between tutorial steps (or tap arrows)
- Tap "Skip" → dismiss tutorial and go to Home
- Tap "Next" → advance to next step
- Tap "Done" on last step → close tutorial

**Navigation:**
- **Comes from:** App first launch
- **Leads to:** Home Dashboard (2.1)

**Data Needed to Display:**
- 5–7 tutorial steps with screenshots/animations:
  1. "Scan QR codes to meet people"
  2. "Check the leaderboard to see who's networking most"
  3. "View the directory to find who to meet"
  4. "Post photos to share the moment"
  5. "Check your connections after the event"

**Edge Cases:**
- User dismisses tutorial → can re-enable in Settings
- Tutorial shown on slow network → images lazy load; don't block view
- User closes app during tutorial → resume from same step on next launch (or restart)

---

## Module 3: Admin Dashboard (Organizer/Staff)

### Screen 3.1: Admin Login

**Module:** Admin  
**Purpose:** Authenticate organizer/staff to access admin dashboard

**States:**
- **Default:** Login form with email/password
- **Loading:** Spinner on login button
- **Success:** Redirect to Dashboard
- **Error:** "Invalid credentials. Try again."
- **Account Locked:** "Too many failed attempts. Try again later."

**User Interactions:**
- Type email/username → input field
- Type password → password field (masked)
- Tap "Login" → authenticate
- Tap "Forgot password?" → reset flow (optional)
- Tap "Remember me" (optional) → stay logged in

**Navigation:**
- **Comes from:** Browser direct navigation to /admin
- **Leads to:** Admin Dashboard (3.2) on success

**Data Needed to Display:**
- Email/username input
- Password input
- Submit button

**Edge Cases:**
- Caps lock on → show warning "Caps Lock is on"
- Network offline → show "Check your connection"
- Session already active → skip login, go to Dashboard

---

### Screen 3.2: Admin Dashboard / Overview

**Module:** Admin  
**Purpose:** High-level view of event status: check-ins, meetings, feedback, engagement

**States:**
- **Default:** Dashboard with key metrics displayed
- **Loading:** Skeleton loaders for each metric card
- **Live Updates:** Auto-refresh metrics every 30 seconds
- **Error:** "Can't load dashboard. Refresh." with refresh button
- **Offline:** Show last cached data with "Offline" badge

**User Interactions:**
- View live counters: check-ins, meetings, leaderboard
- Tap on metric → drill down to detailed view
- Tap tab: Check-ins, Leaderboard, Feed, Feedback, Analytics
- Pull to refresh → manually reload data
- Tap "Export" → download summary as CSV/PDF
- Tap "Settings" → manage event details (optional)

**Navigation:**
- **Comes from:** Admin Login (3.1)
- **Leads to:** Check-in Management (3.4), Leaderboard, Feed Moderation (3.5), Feedback Analytics (3.6)

**Data Needed to Display:**
- Check-ins: total checked in vs. expected (e.g., 142/200)
- Meetings: total meetings logged (e.g., 486)
- Leaderboard: top 5 attendees
- Photo feed: post count, engagement (likes)
- Feedback: average rating (if event ending)
- Engagement metrics: % opened app, % scanned QR, % posted photo

**Edge Cases:**
- Event hasn't started yet → show "Event starts at [time]. Metrics will appear here."
- No check-ins yet → show "Waiting for attendees to check in..."
- Network slow → show spinner on metric cards and load progressively
- Admin loses connection → show last known state with "Last updated [time]"

---

### Screen 3.3: Import Attendees (CSV Upload)

**Module:** Admin  
**Purpose:** Upload pre-registered attendee list to populate the system

**Source format:** the organizer's registration form (observed as a Google Form export) produces columns beyond what Evento needs: `Timestamp`, `Email Address` (Google-account-captured), `Full Name`, `Email Address` (form question — canonical, used over the account-captured column if they differ), `Phone Number`, `RMB Chapter Name if You are a RMBian`, `Business/Profession Name`, `Upload your latest photo`, `Upload screenshot of payment`, `upload payment details of Rs.4000/- payment`. **Payment columns are ignored on import** — payment verification happens entirely in the organizer's own registration process; the file handed to Evento is expected to already contain only confirmed, paid attendees.

**States:**
- **Default:** File upload interface with drag-and-drop area, plus a column-mapping step (map the raw form headers above to Evento's fields: name, email, phone, business/profession name, chapter, photo)
- **Uploading:** Progress bar with filename
- **Success:** "Imported 198 attendees. 2 duplicates skipped."
- **Validation Error:** "Invalid file. Check required columns: name, email, phone, business/profession name"
- **Error:** "Upload failed. Check your connection and try again."

**User Interactions:**
- Drag and drop CSV/Excel file onto upload area
- Tap upload area → open file picker, select file
- Select file → file added, column-mapping preview shown (auto-detected from headers, editable)
- Tap "Import" → submit file to server
- Tap "Cancel" → discard file
- View preview (optional) → show first 5 rows of data before importing, including which rows will be flagged for review

**Navigation:**
- **Comes from:** Admin Dashboard (3.2)
- **Leads to:** Check-in Management (3.4) or shows success and stays on screen

**Data Needed to Display:**
- File upload area with drag-and-drop
- File name, size display
- Column-mapping UI (raw header → Evento field), with sensible auto-detected defaults for the known Google Form header names
- Format instructions: required — name, email, phone, business/profession name; optional — RMB chapter, photo
- Progress bar during upload
- Success/error message with counts, plus a count of rows flagged for manual review (see edge cases)

**Edge Cases:**
- File too large (> 5 MB) → show "File too large. Max 5 MB."
- Wrong file format → show "Please upload a CSV or Excel file"
- Required columns missing after mapping → show "Missing columns: [list]"
- CSV has empty rows → skip empty rows, show count of rows imported
- Phone numbers have inconsistent formats → try to normalize, warn on conflicts
- Duplicate phone numbers or duplicate emails in same import → dedup, show count of duplicates skipped
- The two raw "Email Address" columns disagree for a row → import the form-question value, flag the row in the success summary for admin's own review (does not block import)
- Photo upload reference is broken/missing/unreadable → import the attendee anyway with no photo; initials avatar used everywhere in-app
- RMB Chapter left blank → import as "no chapter" (attendee treated as a non-RMBian throughout matching/filtering)
- Import succeeds but partial → show "198 imported, 2 errors" with list of failed rows

---

### Screen 3.2A: Event Settings (Venue Configuration)

**Module:** Admin  
**Purpose:** Configure event details including venue geolocation for auto check-in

**States:**
- **Default:** Form with event settings (some read-only, some editable)
- **Editing:** Save button active
- **Saving:** Spinner on Save button
- **Saved:** "Settings saved ✓" toast
- **Error:** "Can't save settings. Try again." with retry

**User Interactions:**
- View event name, date, start/end time (read-only)
- **Venue Location (Editable):**
  - Tap latitude field → enter or edit (e.g., "28.6139")
  - Tap longitude field → enter or edit (e.g., "77.2090")
  - Tap on map or "Pick location" → open map picker (optional, Phase 2)
- **Check-In Radius (Editable):**
  - Dropdown or slider: 100m, 250m, 500m, 1000m, 5000m
  - Help text: "~500m = 5 min walk. Attendees outside this radius must check in manually."
- Tap "Save" → validate and save coordinates + radius
- Tap "Test geolocation" → show current device location and distance from venue (for testing)
- Tap "Clear location" → revert to no venue configured (geolocation check-in disabled)

**Navigation:**
- **Comes from:** Admin Dashboard (3.2) → Settings or Gear icon
- **Leads to:** Admin Dashboard (3.2)

**Data Needed to Display:**
- Event name, date, time (read-only)
- Venue latitude (decimal, e.g., "28.6139")
- Venue longitude (decimal, e.g., "77.2090")
- Check-in radius (100–5000m)
- Help text explaining geolocation behavior
- Optional map preview showing venue + radius
- Save button (enabled only if changed)

**Edge Cases:**
- Latitude/longitude invalid (outside ±90/±180) → show validation error "Invalid coordinates"
- Radius too small (< 100m) → warn "Radius is very small. Many attendees may be outside."
- Radius too large (> 5000m) → warn "Radius is very large. Attendees far from venue may auto check-in."
- Venue not set → show "Geolocation check-in is disabled. Attendees must use manual check-in."
- Network error during save → show "Can't save. Check your connection."
- Test geolocation fails (device location off) → show "Turn on location to test"

---

### Screen 3.4: Check-In Management

**Module:** Admin  
**Purpose:** View check-in status in real-time; manually check in attendees via QR scan

**States:**
- **Default:** List of checked-in attendees with counter "142 of 200"
- **Loading:** Skeleton list
- **Scanner Active:** Camera view for QR scanning
- **Scan Success:** "✓ [Name] checked in at [time]" confirmation
- **Scan Error:** "[Name] already checked in" or "Not found" error
- **Offline:** Show cached check-in list + "Offline" badge
- **Venue Not Configured:** Show warning banner "Venue location not configured. Geolocation check-in is disabled."

**User Interactions:**
- View counter: total checked in vs. expected + breakdown by method (auto, manual, QR scan)
- View two lists: "Checked In" (sortable by time/name/method), "Not Yet Checked In"
- Tap "QR Scanner" button → activate camera
- Hold camera to QR code → auto-detect and scan
- Tap "Flip camera" → switch front/back
- Tap "Torch" → toggle flashlight
- On scan success, auto-return to list
- Sort/filter: by check-in time, by name, by company, by check-in method
- Tap attendee name → open their profile (optional)
- Tap "Copy list" on Not Yet Checked In → copy names/phones to clipboard so the admin can nudge them manually in the WhatsApp group (no system-sent reminders — no WhatsApp vendor)
- Tap "Configure venue" → navigate to Event Settings (3.2A) if not yet configured

**Navigation:**
- **Comes from:** Admin Dashboard (3.2)
- **Leads to:** Scanner modal, Event Settings (3.2A), or stays on Check-in list

**Data Needed to Display:**
- Check-in counter: total, expected, percentage
- Check-in method breakdown: "120 via location, 15 manual, 7 via QR scan"
- Two lists: checked-in (with times + method), not checked-in
- QR scanner UI (camera feed)
- Scan result message
- Warning banner if venue not configured

**Edge Cases:**
- Attendee scans themselves → show "Self-check-in not allowed"
- QR code invalid → show "Invalid QR code"
- Attendee not in system → show "Not found in attendee list"
- Attendee already checked in (via any method) → show "[Name] already checked in at [time] (via location/manual/QR)"
- Duplicate check-in attempt → allow (server deduplicates, doesn't increment)
- Network offline during scan → scan works offline, syncs when online
- Camera permission denied → show "Camera permission required"
- Venue location not configured → geolocation check-ins disabled; show warning banner

---

### Screen 3.5: Feed Moderation

**Module:** Admin  
**Purpose:** View event photo feed and moderate inappropriate posts

**States:**
- **Default:** Grid or list of all photo posts
- **Loading:** Skeleton grid of photos
- **Empty:** "No photos posted yet."
- **Deleting:** Spinner on delete action

**User Interactions:**
- View all posts: photo, attendee name, caption, timestamp, like count
- Tap post → enlarge in modal
- Tap "..." menu → show options: Delete, Report (optional)
- Tap "Delete" → confirm "Delete this post?" → remove from feed
- Tap "Report" → flag for review (optional)
- Filter/sort: newest first, oldest first, most likes

**Navigation:**
- **Comes from:** Admin Dashboard (3.2)
- **Leads to:** Stays on feed

**Data Needed to Display:**
- Photo posts: thumbnail, attendee name, caption preview, timestamp, like count
- Delete button on each post
- Modal view of full post on tap

**Edge Cases:**
- Post deleted but not yet synced → show "Deleting..." + retry on failure
- Post violates policy → admin can delete + optionally block user (Phase 2)
- No posts in feed → show empty state "Waiting for attendees to share photos"
- Attendee deletes their own post mid-view → auto-update feed

---

### Screen 3.6: Feedback Analytics

**Module:** Admin  
**Purpose:** View attendee feedback: rating distribution and comments

**States:**
- **Default:** Average rating, distribution chart, list of comments
- **Loading:** Skeleton for chart and comments
- **Empty:** "No feedback yet. Event may not have ended."
- **Error:** "Can't load feedback. Try again."

**User Interactions:**
- View average rating (e.g., 4.2/5)
- View rating distribution (bar chart or donut)
- Scroll through all comments
- Search comments (optional)
- Sort comments: by rating, by newest, by oldest
- Tap "Export" → download feedback as CSV

**Navigation:**
- **Comes from:** Admin Dashboard (3.2)
- **Leads to:** Stays on feedback view

**Data Needed to Display:**
- Average rating (number + star display)
- Rating distribution: count of 1-star, 2-star, 3-star, 4-star, 5-star ratings
- Chart visualization (optional)
- All comments: attendee name, rating, comment text, timestamp
- Total feedback count

**Edge Cases:**
- No feedback yet → show "Feedback will appear after 4:45 PM"
- Some ratings without comments → show in list with blank comment
- Comment contains inappropriate content → admin can flag (optional, Phase 2)
- Export fails → show error "Can't export. Try again."

---

### Screen 3.7: Print Badges (QR Codes)

**Module:** Admin  
**Purpose:** Generate and print QR code badges for attendees without working phones

**States:**
- **Default:** Option to print all badges or select subset
- **Generating:** "Generating PDF..." spinner
- **Success:** "PDF ready. Click to download or print."
- **Error:** "Can't generate badges. Try again."

**Badge contents:** each badge shows the attendee's **name in large, prominent type alongside the QR code** (plus company and photo if available) — so staff and other attendees can visually confirm whose code they're scanning. QR at minimum 1-inch square.

**User Interactions:**
- Tap "Print all badges" → generate PDF of all attendee QR codes (each with the attendee's name printed prominently)
- Tap "Select attendees" → multi-select from list, then generate PDF
- Tap "Download" → download PDF to device
- Tap "Print" → open print dialog
- Tap "Preview" → see PDF in browser before printing

**Navigation:**
- **Comes from:** Admin Dashboard (3.2) or Import Attendees (3.3)
- **Leads to:** Print preview or download

**Data Needed to Display:**
- Attendee list (for selection)
- PDF generation button
- PDF preview (if implemented)

**Edge Cases:**
- No attendees imported → show "No attendees to print badges for"
- Large attendee list (200+) → PDF generation takes a few seconds, show progress
- PDF generation fails → show error + retry button
- Printer not available → allow user to download and print later

---

## Module 4: Error & Edge Case States (Cross-Cutting)

These states can appear on any screen depending on conditions.

### Screen 4.1: Network Error / Offline Banner

**Module:** System  
**Purpose:** Indicate loss of network connectivity and impact on app functionality

**States:**
- **Offline:** Banner at top: "You're offline. Core features work (scanning, directory)."
- **Connecting:** Spinner + "Connecting..."
- **Back Online:** Green checkmark + "Back online. Syncing..." → auto-dismiss after 2s

**User Interactions:**
- Tap banner → show connectivity troubleshooting tips (optional)
- Auto-dismiss when connection returns

**Navigation:**
- Appears on top of any screen

**Data Needed to Display:**
- Network status
- Last known connection time

**Edge Cases:**
- WiFi disconnected but mobile data available → show "Using mobile data"
- Connection flaky (intermittent) → show spinner for 5s, then offline banner
- Sync queue building up → show "Syncing X changes" on banner

---

### Screen 4.2: Sync Status / Queue

**Module:** System  
**Purpose:** Show pending changes waiting to sync when connection returns

**States:**
- **Syncing:** "Syncing [X] changes..."
- **Synced:** "All synced ✓"
- **Sync Failed:** "Sync failed. Retry?" with retry button
- **Hidden:** Show in settings or system menu (not always visible)

**User Interactions:**
- Tap "Retry" → attempt sync again
- Tap status → show details of pending changes (optional)

**Navigation:**
- Appears as notification or in system menu

**Data Needed to Display:**
- Number of pending changes
- Sync status

**Edge Cases:**
- Large queue of pending changes (> 50) → warn "Many pending changes. Sync may take a while"
- Sync succeeds for some, fails for others → show partial success message
- User closes app with unsync'd data → show warning "You have unsync'd changes"

---

### Screen 4.3: Loading / Skeleton State

**Module:** System  
**Purpose:** Indicate that content is loading

**States:**
- **Skeleton:** Placeholder shapes matching content layout
- **Spinner:** Centered circular spinner for full-screen loads

**User Interactions:**
- None; auto-shows while loading

**Navigation:**
- Appears on any screen during data fetch

**Data Needed to Display:**
- Skeleton shapes for content type (e.g., attendee cards, leaderboard)

**Edge Cases:**
- Load takes > 3s → show "Taking longer than expected..." message
- Load fails → show error state instead of skeleton

---

## Module 5: Notification / Toast Messages (Non-Modal)

Short-lived messages appearing at top or bottom of screen.

### Screen 5.1: Toast Notifications

**Purpose:** Brief confirmation, success, or warning messages

**Examples:**
- "Checked in! ✓"
- "Saved offline. Will sync when online."
- "Profile saved! ✓"
- "Can't upload photo. Try again."
- "You've already met Deepak."
- "Copied to clipboard ✓"

**States:**
- **Success:** Green checkmark, auto-dismiss in 3s
- **Error:** Red background, show 5s or until user taps
- **Info:** Blue background, auto-dismiss in 3s
- **Warning:** Yellow background, show until user taps

**User Interactions:**
- Auto-dismiss after timeout
- Tap to dismiss early (optional)

**Edge Cases:**
- Multiple toasts queued → stack or show sequentially
- Toast appears during screen transition → show briefly or dismiss

---

## Navigation Map (All Modules)

```
Pre-Event Flow:
  Generic app link (admin posts manually in WhatsApp group)
    ↓
  Login / Get Access Link (2.0) → email magic link → tap link in inbox
    ↓
  Profile Setup Form (1.1) [first-timers] → PWA Install (1.2) → Thanks Screen (1.3)
    ↓
  Pre-Event Matches (1.4) ← [can also access from app]
  [returning attendees with a completed profile go straight to Home (2.1)]

Main App Flow:
  Bottom tab bar [primary: Home · People · Want to Meet · Profile] + side drawer [secondary]
  (UX revision v1.1 — reverses the earlier "no bottom-tab bar" decision; see PRD US12.1 / FEATURES PF7.1)
    ├→ Home Dashboard (2.1) [central hub, includes check-in orchestration]
    ├→ Pre-Event Matches / People to Meet (1.4)
    ├→ Directory (2.2) → Individual Profile (2.3)
    ├→ My Connections (2.6)
    ├→ Leaderboard (2.5)
    └→ Settings / Profile (2.11) → Show My QR

  Home contextual actions
    ├→ Manual Check-In (2.1A) [if auto check-in fails]
    ├→ QR Scanner (2.4)
    ├→ Event Photo Feed (2.8) → Post Photo (2.7)
    ├→ Feedback Form (2.9) [auto-triggered at ~4:45 PM]
    └→ Event Summary (2.10) [post-event]

Admin Flow:
  Admin Login (3.1)
    ↓
  Admin Dashboard (3.2) [central hub]
    ├→ Event Settings (3.2A) [configure venue location for geolocation check-in]
    ├→ Import Attendees (3.3) [pre-event]
    ├→ Check-in Management (3.4) [real-time, with QR scanner]
    │   └→ Back to Event Settings (3.2A) [if venue not configured]
    ├→ Feed Moderation (3.5)
    ├→ Feedback Analytics (3.6)
    └→ Print Badges (3.7)

Check-In Orchestration Flow (Detailed):
  Attendee Opens App (anywhere)
    ↓
  Home Dashboard (2.1) - Check-In Logic:
    ├→ Request geolocation (5s timeout)
    │   ├→ Success + in radius → Auto check-in → "✓ Checked in" state
    │   └→ Fail/timeout/outside radius → Show "Check In Manually" button (orange)
    │       └→ User taps → Manual Check-In (2.1A) → Submit check-in → "✓ Checked in"
    └→ Or: Staff scans QR at desk (Admin 3.4) → "✓ Checked in" state (both directions)

Cross-Cutting:
  Network Error Banner (4.1)
  Sync Status (4.2)
  Loading Skeletons (4.3)
  Toast Notifications (5.1)
  First-Time Tutorial (2.12) [shown on app first launch]
```

---

## Summary: Screen Count by Module

| Module | Screens | Purpose |
|--------|---------|---------|
| Pre-Event Onboarding | 4 | Group link → email magic link (2.0) → Profile → PWA install → Pre-event matches |
| Attendee App (Main) | 10 | Home (with check-in orchestration), Manual Check-In (fallback), Directory, Profile, Scanner, Leaderboard, Connections, Photo Feed, Post Photo, Summary |
| Settings & Tutorial | 2 | Settings (2.11), Tutorial (2.12) |
| Admin Dashboard | 8 | Login, Dashboard, Event Settings (venue config), Import Attendees, Check-in Management (with QR scanner), Feed Moderation, Feedback Analytics, Print Badges |
| Cross-Cutting | 3 | Network errors, sync status, loading skeletons |
| **Total** | **27** | +3 screens (2.1A Manual Check-In, 3.2A Event Settings, updated check-in flow) |

**Check-In Flow Additions:**
- Screen 2.1A: Manual Check-In (fallback when geolocation fails)
- Screen 3.2A: Event Settings (venue coordinates & radius configuration)
- Screen 3.4: Check-In Management (expanded to show check-in methods + venue config warning)

---

## Design Notes

**Responsive Design:**
- Mobile-first: design for 5.5" low-end Android
- Tablet-friendly: admin dashboard should work on 10" tablet
- Keyboard/accessibility: support keyboard navigation, screen readers

**Color Palette (Suggested):**
- Primary: Blue (actions, QR scanner)
- Success: Green (checkmarks, feedback positive)
- Warning: Yellow (duplicates, cautions)
- Error: Red (failures, network issues)
- Neutral: Gray (text, borders)

**Typography:**
- Body text: 16px+ (readable on low-end phones)
- Headings: 20px+
- Buttons: 18px, 48px tall (easy tap targets)

**Performance Targets:**
- Each screen load: < 3s (4G), < 5s (3G)
- Tap response: < 100ms
- Smooth 60fps scrolling

**Offline-First:**
- Attendee: all critical screens (home, directory, scanner, connections) work offline
- Admin: dashboard requires network (non-essential during event)
- Sync: happens quietly in background when connection returns

---

**Document prepared by:** Claude  
**Last updated:** July 16, 2026  
**Next step:** Create wireframes/mockups for each screen module
