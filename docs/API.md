# EVENTO - API Specification

Frontend API contract for the single-day Evento pilot described in [`PRD_v1.md`](./PRD_v1.md), [`SCREENS.md`](./SCREENS.md), [`BACKEND.md`](./BACKEND.md), and [`DB.md`](./DB.md).

All paths below are shown as the frontend calls them through the Next.js rewrite: `/api/...`. The NestJS service itself mounts the same routes without the `/api` prefix.

---

## Conventions

### Authentication

- Attendee sessions use secure, HTTP-only cookies set by `POST /api/auth/magic-link/verify`.
- Admin sessions use secure, HTTP-only cookies set by `POST /api/admin/auth/login`.
- The frontend must call authenticated endpoints with `credentials: "include"`.
- State-changing authenticated requests should send `X-CSRF-Token`.
- Offline-replayable writes should send `Idempotency-Key`.

### Common Headers

```json
{
  "Content-Type": "application/json",
  "Cookie": "evento_session=...",
  "X-CSRF-Token": "...",
  "Idempotency-Key": "client-generated-uuid"
}
```

Use `multipart/form-data` for file uploads. Do not manually set the multipart boundary in browser code.

### Common Error Shape

```json
{
  "error": {
    "code": "validation_error",
    "message": "Readable message for the UI",
    "details": {}
  }
}
```

Common error codes used across endpoints:

| HTTP | Code | Meaning |
|---:|---|---|
| 400 | `validation_error` | Request body, query, or params failed validation. |
| 401 | `unauthorized` | Missing, expired, or invalid session. |
| 403 | `forbidden` | Actor is authenticated but lacks permission. |
| 404 | `not_found` | Entity does not exist or is not visible to the actor. |
| 409 | `conflict` | Duplicate or conflicting write. |
| 413 | `payload_too_large` | Uploaded file or body exceeds limit. |
| 415 | `unsupported_media_type` | Uploaded file type is not allowed. |
| 422 | `business_rule_violation` | Valid JSON, but product rule rejects it. |
| 429 | `rate_limited` | Too many requests. |
| 500 | `server_error` | Unexpected backend failure. |

### Shared Schema Snippets

```ts
type UUID = string;
type ISODateTime = string;

type Option = {
  id: UUID;
  name: string;
  displayName?: string;
  isActive: boolean;
};

type MediaRef = {
  id: UUID;
  url: string | null;
  widthPx?: number;
  heightPx?: number;
  mimeType?: string;
};

type AttendeeCard = {
  id: UUID;
  name: string;
  businessName: string;
  businessCategory: Option | null;
  chapter: Option | null;
  city: Option | null;
  tableNumber: string | null;
  photo: MediaRef | null;
  checkedIn: boolean;
  checkedInAt: ISODateTime | null;
  bookmarkedByMe: boolean;
  metByMe: boolean;
};

type AttendeeProfile = AttendeeCard & {
  email: string;
  phone: string;
  bio: string | null;
  lookingFor: Option[];
  offering: Option[];
  goals: Option[];
  noteByMe: string | null;
  metAt: ISODateTime | null;
  matchReason: string | null;
  isMe: boolean;
};

type PageInfo = {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
};
```

---

## Auth

### POST /api/auth/magic-link

Description: Request an attendee magic link by registered email. Response is enumeration-safe whether or not the email exists.

Auth required: No.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "X-Device-Id": "optional-client-device-id"
  },
  "body": {
    "email": "radha@example.com"
  }
}
```

Response 200:

```json
{
  "status": "sent",
  "message": "If that email is on the guest list, we've sent a link.",
  "retryAfterSeconds": 60,
  "devLink": "http://localhost:3000/login/verify?token=..." 
}
```

Error codes: `400 validation_error`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: About 5 sends/hour per normalized email, about 3/hour per device/IP/user-agent family. The neutral success message must still be used for unknown emails.

### POST /api/auth/magic-link/verify

Description: Exchange a single-use email token for an attendee session cookie.

Auth required: No.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "token": "raw-token-from-email-url"
  }
}
```

Response 200:

```json
{
  "status": "ok",
  "nextRoute": "/onboarding",
  "attendee": {
    "id": "uuid",
    "name": "Radha Sharma",
    "profileCompleted": false,
    "eventId": "uuid"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `410 token_expired_or_used`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Limit failed token verification attempts by IP/device. Tokens expire after 30 minutes and are single-use.

### GET /api/auth/session

Description: Verify the current attendee session without rendering private UI before the response.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  }
}
```

Response 200:

```json
{
  "authenticated": true,
  "actor": {
    "type": "attendee",
    "id": "uuid",
    "eventId": "uuid"
  },
  "profileCompleted": true,
  "nextRoute": "/home"
}
```

Error codes: `401 unauthorized`, `500 server_error`.

Rate limiting notes: General authenticated read limit.

### POST /api/auth/logout

Description: Clear the attendee session cookie.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "..."
  },
  "body": {}
}
```

Response 200:

```json
{
  "status": "logged_out"
}
```

Error codes: `401 unauthorized`, `403 forbidden`, `500 server_error`.

Rate limiting notes: General authenticated write limit.

### POST /api/admin/auth/login

Description: Authenticate organizer, staff, or viewer with email and password.

Auth required: No.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "email": "organizer@example.com",
    "password": "password",
    "rememberMe": false
  }
}
```

Response 200:

```json
{
  "status": "ok",
  "admin": {
    "id": "uuid",
    "name": "Harish",
    "email": "organizer@example.com",
    "role": "organizer"
  },
  "csrfToken": "..."
}
```

Error codes: `400 validation_error`, `401 invalid_credentials`, `423 account_locked`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Progressive delay or temporary lock after repeated failures by email and IP.

### GET /api/admin/auth/me

Description: Verify the current admin session and role.

Auth required: Yes, admin.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  }
}
```

Response 200:

```json
{
  "authenticated": true,
  "admin": {
    "id": "uuid",
    "name": "Harish",
    "email": "organizer@example.com",
    "role": "organizer"
  },
  "csrfToken": "..."
}
```

Error codes: `401 unauthorized`, `500 server_error`.

Rate limiting notes: General authenticated read limit.

### POST /api/admin/auth/logout

Description: Clear the admin session cookie.

Auth required: Yes, admin.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=...",
    "X-CSRF-Token": "..."
  },
  "body": {}
}
```

Response 200:

```json
{
  "status": "logged_out"
}
```

Error codes: `401 unauthorized`, `403 forbidden`, `500 server_error`.

Rate limiting notes: General authenticated write limit.

### GET /api/auth/csrf

Description: Return a CSRF token for the active cookie session.

Auth required: Yes, attendee or admin.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=... or evento_admin_session=..."
  }
}
```

Response 200:

```json
{
  "csrfToken": "...",
  "expiresAt": "2026-07-16T10:30:00.000Z"
}
```

Error codes: `401 unauthorized`, `500 server_error`.

Rate limiting notes: General authenticated read limit.

---

## App Shell and Event

### GET /api/app/bootstrap

Description: Session-aware bootstrap payload for authenticated attendee screens: actor, event, navigation, feature flags, feedback/summary prompts, and sync hints.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  }
}
```

Response 200:

```json
{
  "attendee": {
    "id": "uuid",
    "name": "Radha Sharma",
    "businessName": "Radha Textiles",
    "photo": null,
    "profileCompleted": true,
    "tutorialCompleted": false
  },
  "event": {
    "id": "uuid",
    "name": "Evento Pilot",
    "status": "live",
    "startsAt": "2026-07-20T03:30:00.000Z",
    "endsAt": "2026-07-20T11:30:00.000Z",
    "feedbackPromptAt": "2026-07-20T11:15:00.000Z"
  },
  "navigation": [
    { "key": "home", "label": "Home", "href": "/home", "enabled": true },
    { "key": "people_to_meet", "label": "People to Meet", "href": "/matches", "enabled": true }
  ],
  "prompts": {
    "showTutorial": true,
    "showFeedback": false,
    "showSummary": false
  }
}
```

Error codes: `401 unauthorized`, `500 server_error`.

Rate limiting notes: General authenticated read limit. Cache briefly on the client for offline shell rendering.

### GET /api/event

Description: Public event and venue configuration needed for login copy and client-side proximity detection. Does not expose attendee identity.

Auth required: No.

Request:

```json
{
  "headers": {},
  "query": {}
}
```

Response 200:

```json
{
  "id": "uuid",
  "name": "Evento Pilot",
  "slug": "evento-pilot",
  "venueName": "Venue Name",
  "venueLat": 28.6139,
  "venueLng": 77.209,
  "checkinRadiusM": 500,
  "startsAt": "2026-07-20T03:30:00.000Z",
  "endsAt": "2026-07-20T11:30:00.000Z",
  "feedbackPromptAt": "2026-07-20T11:15:00.000Z",
  "status": "live"
}
```

Error codes: `404 not_found`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Public read limit. Cacheable because venue config is safe to store offline.

### POST /api/app/tutorial/complete

Description: Mark the first-time tutorial as completed or skipped for the current attendee.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "body": {
    "completed": true,
    "lastStepSeen": 5
  }
}
```

Response 200:

```json
{
  "tutorialCompletedAt": "2026-07-16T10:00:00.000Z"
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `500 server_error`.

Rate limiting notes: General authenticated write limit. Idempotent by attendee.

---

## Reference Data

### GET /api/reference/profile-options

Description: Return active dropdown data for onboarding and profile editing.

Auth required: Yes, attendee or admin.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=... or evento_admin_session=..."
  },
  "query": {}
}
```

Response 200:

```json
{
  "businessCategories": [{ "id": "uuid", "name": "Manufacturer", "isActive": true }],
  "businessTags": [{ "id": "uuid", "name": "Digital Marketing", "isActive": true }],
  "goals": [{ "id": "uuid", "name": "Find suppliers", "isActive": true }],
  "chapters": [{ "id": "uuid", "name": "Ahmedabad", "isActive": true }],
  "citySearchMinChars": 2
}
```

Error codes: `401 unauthorized`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: General authenticated read limit. Client should cache for offline onboarding/profile screens.

### GET /api/reference/cities

Description: Search the nationwide `City, State/UT` catalogue.

Auth required: Yes, attendee or admin.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=... or evento_admin_session=..."
  },
  "query": {
    "q": "sur",
    "limit": 25
  }
}
```

Response 200:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Surat",
      "stateOrUt": "Gujarat",
      "displayName": "Surat, Gujarat",
      "isActive": true
    }
  ]
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Typeahead-friendly read limit. Debounce client input.

### GET /api/reference/directory-filters

Description: Return filter options for Directory. Reference-backed options remain available even when no attendee results match.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  },
  "query": {
    "cityQ": "ahm"
  }
}
```

Response 200:

```json
{
  "businessCategories": [{ "id": "uuid", "name": "Manufacturer", "isActive": true }],
  "chapters": [{ "id": "uuid", "name": "Ahmedabad", "isActive": true }],
  "cities": [{ "id": "uuid", "displayName": "Ahmedabad, Gujarat", "isActive": true }],
  "companies": [{ "value": "Radha Textiles", "count": 1 }],
  "checkInStatuses": ["all", "checked_in", "not_checked_in"]
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: General authenticated read limit. Cache with the directory response.

---

## Attendees and Profile

### GET /api/attendees/me

Description: Return the current attendee profile, onboarding state, QR display availability, and home stats.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  }
}
```

Response 200:

```json
{
  "attendee": {
    "id": "uuid",
    "name": "Radha Sharma",
    "email": "radha@example.com",
    "phone": "+919999999999",
    "businessName": "Radha Textiles",
    "businessCategory": { "id": "uuid", "name": "Manufacturer", "isActive": true },
    "chapter": null,
    "city": { "id": "uuid", "displayName": "Surat, Gujarat", "isActive": true },
    "tableNumber": "7",
    "bio": "Textile manufacturer",
    "lookingFor": [],
    "offering": [],
    "goals": [],
    "photo": null,
    "profileCompletedAt": "2026-07-16T10:00:00.000Z",
    "tutorialCompletedAt": null
  },
  "stats": {
    "metCount": 5,
    "leaderboardRank": 12,
    "bookmarkCount": 3,
    "photoPostCount": 1
  }
}
```

Error codes: `401 unauthorized`, `404 not_found`, `500 server_error`.

Rate limiting notes: General authenticated read limit. Cache last success for offline shell/profile display.

### PATCH /api/attendees/me/profile

Description: Save onboarding or profile edits. Email and phone are read-only in v1.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "body": {
    "name": "Radha Sharma",
    "businessCategoryOptionId": "uuid",
    "cityOptionId": "uuid",
    "lookingForTagIds": ["uuid"],
    "offeringTagIds": ["uuid"],
    "goalOptionIds": ["uuid"],
    "bio": "Textile manufacturer",
    "consentAccepted": true
  }
}
```

Response 200:

```json
{
  "attendee": "AttendeeProfile",
  "profileCompleted": true,
  "nextRoute": "/install"
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `409 conflict`, `422 business_rule_violation`, `500 server_error`.

Rate limiting notes: General authenticated write limit. Safe to retry with the same idempotency key.

### GET /api/attendees/me/qr

Description: Return the current attendee's own signed opaque QR payload for display and offline caching.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  }
}
```

Response 200:

```json
{
  "qrPayload": "opaque-signed-payload",
  "payloadVersion": 1,
  "displayName": "Radha Sharma",
  "expiresAt": null
}
```

Error codes: `401 unauthorized`, `404 not_found`, `500 server_error`.

Rate limiting notes: General authenticated read limit. Cache permanently until payload version changes.

### GET /api/attendees

Description: Search and browse the attendee directory. Excludes the current attendee from results.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  },
  "query": {
    "q": "deepak",
    "businessCategoryId": "uuid",
    "chapterId": "uuid",
    "cityId": "uuid",
    "company": "TechCorp",
    "checkedIn": "all",
    "sort": "name",
    "limit": 50,
    "offset": 0
  }
}
```

Response 200:

```json
{
  "items": ["AttendeeCard"],
  "pageInfo": {
    "limit": 50,
    "offset": 0,
    "total": 199,
    "hasMore": true
  },
  "facets": {
    "businessCategories": [],
    "chapters": [],
    "cities": [],
    "companies": []
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: General authenticated read limit. Cache list and profiles for offline directory use.

### GET /api/attendees/:attendeeId

Description: Return a detailed attendee profile for directory, matches, leaderboard, or connections.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  },
  "params": {
    "attendeeId": "uuid"
  }
}
```

Response 200:

```json
{
  "attendee": "AttendeeProfile"
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `500 server_error`.

Rate limiting notes: General authenticated read limit. Never returns another attendee's QR payload.

---

## Matching

### GET /api/attendees/me/matches

Description: Return ranked People to Meet suggestions with rule-based reasons.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  },
  "query": {
    "limit": 10,
    "offset": 0
  }
}
```

Response 200:

```json
{
  "items": [
    {
      "rank": 1,
      "score": 91.25,
      "reason": "You're both Manufacturers - she's from the Surat chapter.",
      "attendee": "AttendeeCard"
    }
  ],
  "computedAt": "2026-07-16T10:00:00.000Z",
  "algorithmVersion": "rules_v1",
  "pageInfo": {
    "limit": 10,
    "offset": 0,
    "total": 20,
    "hasMore": true
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `422 profile_incomplete`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: General authenticated read limit. Cache for offline pre-event planning.

---

## Check-In

### GET /api/checkin/me

Description: Return the current attendee check-in status.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  }
}
```

Response 200:

```json
{
  "checkedIn": true,
  "checkedInAt": "2026-07-20T04:00:00.000Z",
  "method": "geolocation",
  "confirmationSource": "attendee_tap",
  "syncSource": "online"
}
```

Error codes: `401 unauthorized`, `404 not_found`, `500 server_error`.

Rate limiting notes: General authenticated read limit. Poll lightly from Home or refresh on sync events.

### POST /api/checkin/geolocation

Description: Record attendee check-in after the client detected venue proximity and the attendee tapped Check In.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "body": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "accuracyM": 80,
    "distanceFromVenueM": 120,
    "clientCheckedInAt": "2026-07-20T04:00:00.000Z",
    "syncSource": "online"
  }
}
```

Response 200:

```json
{
  "status": "checked_in",
  "alreadyCheckedIn": false,
  "checkIn": {
    "id": "uuid",
    "checkedInAt": "2026-07-20T04:00:00.000Z",
    "method": "geolocation"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `409 idempotency_conflict`, `422 outside_radius`, `422 event_not_open`, `500 server_error`.

Rate limiting notes: Offline-replayable. Server dedupes one check-in per attendee/event and by idempotency key.

### POST /api/checkin/manual

Description: Record attendee manual check-in when geolocation is unavailable or unclear.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "body": {
    "clientCheckedInAt": "2026-07-20T04:00:00.000Z",
    "syncSource": "online"
  }
}
```

Response 200:

```json
{
  "status": "checked_in",
  "alreadyCheckedIn": false,
  "checkIn": {
    "id": "uuid",
    "checkedInAt": "2026-07-20T04:00:00.000Z",
    "method": "manual"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `409 idempotency_conflict`, `422 event_not_open`, `500 server_error`.

Rate limiting notes: Offline-replayable. Duplicate taps return the existing check-in.

---

## QR Meetings

### POST /api/meetings/scan

Description: Verify another attendee's QR payload, exchange digital cards, and create a confirmed meeting if the pair has not already met.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "body": {
    "qrPayload": "opaque-signed-payload",
    "scannedAt": "2026-07-20T05:00:00.000Z",
    "syncSource": "online"
  }
}
```

Response 200:

```json
{
  "result": "success",
  "duplicate": false,
  "meeting": {
    "id": "uuid",
    "metAt": "2026-07-20T05:00:00.000Z"
  },
  "attendee": "AttendeeProfile",
  "leaderboardDelta": 1
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `409 idempotency_conflict`, `422 invalid_qr`, `422 self_scan`, `422 event_not_open`, `500 server_error`.

Rate limiting notes: Critical offline-replayable write. Dedupes by unordered attendee pair per event and by idempotency key.

---

## Connections, Bookmarks, Notes, and Contact Export

### GET /api/attendees/me/connections

Description: Return combined My Connections read model: bookmarked people, met people, and notes.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  },
  "query": {
    "tab": "all",
    "q": "",
    "sort": "met_at_desc",
    "limit": 50,
    "offset": 0
  }
}
```

Response 200:

```json
{
  "counts": {
    "wantToMeet": 3,
    "alreadyMet": 7
  },
  "items": [
    {
      "attendee": "AttendeeCard",
      "connectionType": "met",
      "bookmarked": true,
      "metAt": "2026-07-20T05:00:00.000Z",
      "note": "Potential supplier"
    }
  ],
  "pageInfo": {
    "limit": 50,
    "offset": 0,
    "total": 10,
    "hasMore": false
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: General authenticated read limit. Cache for offline connection browsing.

### POST /api/bookmarks

Description: Bookmark another attendee as Want to Meet.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "body": {
    "targetAttendeeId": "uuid"
  }
}
```

Response 200:

```json
{
  "status": "bookmarked",
  "bookmark": {
    "id": "uuid",
    "targetAttendeeId": "uuid",
    "createdAt": "2026-07-16T10:00:00.000Z"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `404 not_found`, `409 idempotency_conflict`, `422 self_bookmark`, `500 server_error`.

Rate limiting notes: Offline-replayable. Repeated bookmark returns existing active bookmark.

### DELETE /api/bookmarks/:targetAttendeeId

Description: Remove a Want to Meet bookmark.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "params": {
    "targetAttendeeId": "uuid"
  }
}
```

Response 200:

```json
{
  "status": "unbookmarked",
  "targetAttendeeId": "uuid"
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `404 not_found`, `409 idempotency_conflict`, `500 server_error`.

Rate limiting notes: Offline-replayable. Repeated unbookmark is treated as success.

### PUT /api/connections/:targetAttendeeId/note

Description: Create or replace a private note about a connection or bookmarked attendee.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "params": {
    "targetAttendeeId": "uuid"
  },
  "body": {
    "note": "Potential supplier"
  }
}
```

Response 200:

```json
{
  "status": "saved",
  "note": {
    "targetAttendeeId": "uuid",
    "note": "Potential supplier",
    "updatedAt": "2026-07-16T10:00:00.000Z"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `404 not_found`, `409 idempotency_conflict`, `422 note_too_long`, `500 server_error`.

Rate limiting notes: Offline-replayable. Latest write wins for the same target and idempotency key.

### DELETE /api/connections/:targetAttendeeId/note

Description: Delete the current attendee's private note for a target attendee.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "params": {
    "targetAttendeeId": "uuid"
  }
}
```

Response 200:

```json
{
  "status": "deleted",
  "targetAttendeeId": "uuid"
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `404 not_found`, `409 idempotency_conflict`, `500 server_error`.

Rate limiting notes: Offline-replayable. Repeated delete is treated as success.

### GET /api/connections/:targetAttendeeId/vcard

Description: Download one met or bookmarked attendee as a `.vcf` contact file.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  },
  "params": {
    "targetAttendeeId": "uuid"
  }
}
```

Response 200:

```json
{
  "contentType": "text/vcard",
  "filename": "deepak-sharma.vcf",
  "body": "BEGIN:VCARD..."
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Export/download limit to prevent scraping. Only allowed for met/bookmarked visible contacts.

### GET /api/attendees/me/connections/export

Description: Download all current attendee connections as CSV or vCard bundle.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  },
  "query": {
    "format": "csv"
  }
}
```

Response 200:

```json
{
  "contentType": "text/csv",
  "filename": "evento-connections.csv",
  "body": "name,company,phone,email..."
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Export/download limit. For 200 attendees this can be synchronous; later versions may return an export job.

---

## Leaderboard

### GET /api/leaderboard

Description: Return top 20 meeting rankings plus current attendee rank.

Auth required: Yes, attendee or admin viewer.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=... or evento_admin_session=..."
  },
  "query": {
    "limit": 20
  }
}
```

Response 200:

```json
{
  "items": [
    {
      "rank": 1,
      "attendee": {
        "id": "uuid",
        "name": "Deepak Sharma",
        "businessName": "TechCorp",
        "photo": null
      },
      "metCount": 12
    }
  ],
  "myRank": {
    "rank": 12,
    "metCount": 5
  },
  "totalAttendees": 200,
  "computedAt": "2026-07-20T05:00:00.000Z"
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Poll every 5-10 seconds during the event. Server may return cached snapshot.

---

## Feed

### GET /api/feed/posts

Description: Return published event photo feed posts, newest first.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  },
  "query": {
    "limit": 20,
    "offset": 0
  }
}
```

Response 200:

```json
{
  "items": [
    {
      "id": "uuid",
      "author": {
        "id": "uuid",
        "name": "Radha Sharma",
        "businessName": "Radha Textiles",
        "photo": null
      },
      "photo": {
        "id": "uuid",
        "url": "https://...",
        "widthPx": 1200,
        "heightPx": 900
      },
      "caption": "Great event!",
      "createdAt": "2026-07-20T05:00:00.000Z",
      "likeCount": 4,
      "commentCount": 2,
      "likedByMe": true,
      "canDelete": true
    }
  ],
  "pageInfo": {
    "limit": 20,
    "offset": 0,
    "total": 23,
    "hasMore": true
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Poll or pull-to-refresh. Cache last page for offline viewing.

### POST /api/feed/posts

Description: Upload a photo and caption to the event feed.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Content-Type": "multipart/form-data",
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "body": {
    "photo": "File image/jpeg|image/png|image/webp",
    "caption": "Great event!",
    "clientCreatedAt": "2026-07-20T05:00:00.000Z"
  }
}
```

Response 200:

```json
{
  "status": "published",
  "post": {
    "id": "uuid",
    "caption": "Great event!",
    "photo": { "id": "uuid", "url": "https://..." },
    "createdAt": "2026-07-20T05:00:00.000Z"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `409 idempotency_conflict`, `413 payload_too_large`, `415 unsupported_media_type`, `422 caption_too_long`, `500 server_error`.

Rate limiting notes: Upload rate limit per attendee. Offline upload replay should reuse the same idempotency key.

### DELETE /api/feed/posts/:postId

Description: Delete the current attendee's own feed post.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "params": {
    "postId": "uuid"
  }
}
```

Response 200:

```json
{
  "status": "deleted",
  "postId": "uuid"
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `409 idempotency_conflict`, `500 server_error`.

Rate limiting notes: General authenticated write limit. Repeated delete is treated as success if the actor owns the post.

### POST /api/feed/posts/:postId/like

Description: Like a feed post.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "params": {
    "postId": "uuid"
  },
  "body": {}
}
```

Response 200:

```json
{
  "status": "liked",
  "postId": "uuid",
  "likeCount": 5,
  "likedByMe": true
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `404 not_found`, `409 idempotency_conflict`, `500 server_error`.

Rate limiting notes: Offline-replayable. Repeated like returns current liked state.

### DELETE /api/feed/posts/:postId/like

Description: Unlike a feed post.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "params": {
    "postId": "uuid"
  }
}
```

Response 200:

```json
{
  "status": "unliked",
  "postId": "uuid",
  "likeCount": 4,
  "likedByMe": false
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `404 not_found`, `409 idempotency_conflict`, `500 server_error`.

Rate limiting notes: Offline-replayable. Repeated unlike returns current unliked state.

### GET /api/feed/posts/:postId/comments

Description: Return comments for one feed post.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  },
  "params": {
    "postId": "uuid"
  },
  "query": {
    "limit": 50,
    "offset": 0
  }
}
```

Response 200:

```json
{
  "items": [
    {
      "id": "uuid",
      "author": {
        "id": "uuid",
        "name": "Radha Sharma"
      },
      "comment": "Nice photo!",
      "createdAt": "2026-07-20T05:05:00.000Z",
      "canDelete": true
    }
  ],
  "pageInfo": {
    "limit": 50,
    "offset": 0,
    "total": 2,
    "hasMore": false
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `404 not_found`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: General authenticated read limit.

### POST /api/feed/posts/:postId/comments

Description: Add a flat comment to a feed post.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "params": {
    "postId": "uuid"
  },
  "body": {
    "comment": "Nice photo!"
  }
}
```

Response 200:

```json
{
  "status": "created",
  "comment": {
    "id": "uuid",
    "comment": "Nice photo!",
    "createdAt": "2026-07-20T05:05:00.000Z"
  },
  "commentCount": 3
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `404 not_found`, `409 idempotency_conflict`, `422 comment_too_long`, `500 server_error`.

Rate limiting notes: Offline-replayable. Comment spam limit per attendee/post.

### DELETE /api/feed/comments/:commentId

Description: Delete the current attendee's own feed comment.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "params": {
    "commentId": "uuid"
  }
}
```

Response 200:

```json
{
  "status": "deleted",
  "commentId": "uuid"
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `409 idempotency_conflict`, `500 server_error`.

Rate limiting notes: General authenticated write limit. Repeated delete is treated as success if actor owns the comment.

---

## Feedback and Summary

### GET /api/feedback/me

Description: Return feedback prompt eligibility and the current attendee's existing response, if any.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  }
}
```

Response 200:

```json
{
  "promptEnabled": true,
  "promptAt": "2026-07-20T11:15:00.000Z",
  "submitted": false,
  "response": null
}
```

Error codes: `401 unauthorized`, `500 server_error`.

Rate limiting notes: General authenticated read limit.

### POST /api/feedback

Description: Submit or replace attendee feedback.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "body": {
    "rating": 5,
    "comment": "Great networking experience"
  }
}
```

Response 200:

```json
{
  "status": "submitted",
  "feedback": {
    "rating": 5,
    "comment": "Great networking experience",
    "submittedAt": "2026-07-20T11:20:00.000Z"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `409 idempotency_conflict`, `422 rating_required`, `422 comment_too_long`, `500 server_error`.

Rate limiting notes: Offline-replayable. One active response per attendee/event; latest response may replace the previous one if product chooses latest-response-wins.

### GET /api/attendees/me/summary

Description: Return post-event networking summary for the current attendee.

Auth required: Yes, attendee.

Request:

```json
{
  "headers": {
    "Cookie": "evento_session=..."
  }
}
```

Response 200:

```json
{
  "status": "ready",
  "event": {
    "id": "uuid",
    "name": "Evento Pilot",
    "date": "2026-07-20"
  },
  "stats": {
    "peopleMetCount": 7,
    "cardsCollectedCount": 7,
    "leaderboardRank": 14
  },
  "topConnections": ["AttendeeCard"],
  "generatedAt": "2026-07-20T12:00:00.000Z"
}
```

Error codes: `401 unauthorized`, `404 not_found`, `409 sync_pending`, `425 summary_not_ready`, `500 server_error`.

Rate limiting notes: General authenticated read limit. Recompute or refresh after offline sync completes.

---

## Admin Event Settings

### GET /api/admin/event

Description: Return editable event settings for the admin dashboard.

Auth required: Yes, admin `organizer`, `staff`, or `viewer`.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  }
}
```

Response 200:

```json
{
  "id": "uuid",
  "name": "Evento Pilot",
  "venueName": "Venue Name",
  "venueLat": 28.6139,
  "venueLng": 77.209,
  "checkinRadiusM": 500,
  "startsAt": "2026-07-20T03:30:00.000Z",
  "endsAt": "2026-07-20T11:30:00.000Z",
  "feedbackPromptAt": "2026-07-20T11:15:00.000Z",
  "status": "ready"
}
```

Error codes: `401 unauthorized`, `403 forbidden`, `404 not_found`, `500 server_error`.

Rate limiting notes: General admin read limit.

### PATCH /api/admin/event

Description: Update event venue, check-in radius, timings, status, and prompt time.

Auth required: Yes, admin `organizer`.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_admin_session=...",
    "X-CSRF-Token": "..."
  },
  "body": {
    "venueName": "Venue Name",
    "venueLat": 28.6139,
    "venueLng": 77.209,
    "checkinRadiusM": 500,
    "startsAt": "2026-07-20T03:30:00.000Z",
    "endsAt": "2026-07-20T11:30:00.000Z",
    "feedbackPromptAt": "2026-07-20T11:15:00.000Z",
    "status": "ready"
  }
}
```

Response 200:

```json
{
  "event": {
    "id": "uuid",
    "venueLat": 28.6139,
    "venueLng": 77.209,
    "checkinRadiusM": 500,
    "updatedAt": "2026-07-16T10:00:00.000Z"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `422 invalid_coordinates`, `422 invalid_radius`, `500 server_error`.

Rate limiting notes: Admin write limit. Changes affect attendee clients on next fetch.

---

## Admin Import and Attendees

### POST /api/admin/import

Description: Upload and process a CSV/XLS/XLSX attendee import file.

Auth required: Yes, admin `organizer`.

Request:

```json
{
  "headers": {
    "Content-Type": "multipart/form-data",
    "Cookie": "evento_admin_session=...",
    "X-CSRF-Token": "..."
  },
  "body": {
    "file": "File text/csv|application/vnd.ms-excel|xlsx",
    "columnMapping": {
      "name": "Full Name",
      "email": "Email Address",
      "phone": "Phone Number",
      "businessName": "Business/Profession Name",
      "chapter": "RMB Chapter Name if You are a RMBian",
      "photo": "Upload your latest photo",
      "city": "City",
      "businessCategory": "Business Category",
      "tableNumber": "Table Number"
    },
    "dryRun": false
  }
}
```

Response 200:

```json
{
  "batch": {
    "id": "uuid",
    "status": "completed",
    "successCount": 198,
    "duplicateCount": 2,
    "errorCount": 0,
    "flaggedCount": 4
  },
  "previewRows": []
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `413 payload_too_large`, `415 unsupported_media_type`, `422 missing_required_columns`, `500 server_error`.

Rate limiting notes: Admin upload limit. Max 5 MB for pilot. Import jobs should be protected from repeated accidental submissions.

### GET /api/admin/import/:batchId

Description: Return import batch status and summary.

Auth required: Yes, admin `organizer`, `staff`, or `viewer`.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  },
  "params": {
    "batchId": "uuid"
  }
}
```

Response 200:

```json
{
  "batch": {
    "id": "uuid",
    "fileName": "attendees.xlsx",
    "status": "completed",
    "successCount": 198,
    "duplicateCount": 2,
    "errorCount": 0,
    "flaggedCount": 4,
    "createdAt": "2026-07-16T10:00:00.000Z",
    "completedAt": "2026-07-16T10:01:00.000Z"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `500 server_error`.

Rate limiting notes: General admin read limit.

### GET /api/admin/import/:batchId/rows

Description: Return row-level import results for errors, duplicates, and flags.

Auth required: Yes, admin `organizer`, `staff`, or `viewer`.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  },
  "params": {
    "batchId": "uuid"
  },
  "query": {
    "status": "flagged",
    "limit": 50,
    "offset": 0
  }
}
```

Response 200:

```json
{
  "items": [
    {
      "id": "uuid",
      "rowNumber": 12,
      "status": "flagged",
      "reason": "Email columns do not match",
      "normalizedEmail": "radha@example.com",
      "normalizedPhone": "+919999999999",
      "attendeeId": "uuid"
    }
  ],
  "pageInfo": {
    "limit": 50,
    "offset": 0,
    "total": 4,
    "hasMore": false
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `500 server_error`.

Rate limiting notes: General admin read limit.

### GET /api/admin/attendees

Description: Return admin attendee list for import review, check-in management, badge selection, and support lookup.

Auth required: Yes, admin `organizer`, `staff`, or `viewer`.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  },
  "query": {
    "q": "radha",
    "checkedIn": "all",
    "profileCompleted": "all",
    "limit": 100,
    "offset": 0
  }
}
```

Response 200:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Radha Sharma",
      "email": "radha@example.com",
      "phone": "+919999999999",
      "businessName": "Radha Textiles",
      "chapter": null,
      "tableNumber": "7",
      "profileCompleted": true,
      "checkedIn": true,
      "checkedInAt": "2026-07-20T04:00:00.000Z",
      "importFlags": []
    }
  ],
  "pageInfo": {
    "limit": 100,
    "offset": 0,
    "total": 200,
    "hasMore": true
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: General admin read limit. Contains PII; do not expose outside admin/staff roles.

### GET /api/admin/attendees/:attendeeId

Description: Return one attendee for admin support.

Auth required: Yes, admin `organizer` or `staff`.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  },
  "params": {
    "attendeeId": "uuid"
  }
}
```

Response 200:

```json
{
  "attendee": {
    "id": "uuid",
    "name": "Radha Sharma",
    "email": "radha@example.com",
    "phone": "+919999999999",
    "businessName": "Radha Textiles",
    "tableNumber": "7",
    "profileCompleted": true,
    "checkedIn": true,
    "importFlags": [],
    "lastSeenAt": "2026-07-20T05:00:00.000Z"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `500 server_error`.

Rate limiting notes: PII read limit. Audit access if used for support.

### PATCH /api/admin/attendees/:attendeeId

Description: Admin update for support fields such as table number, chapter, city/category mapping, or corrected contact details.

Auth required: Yes, admin `organizer`.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_admin_session=...",
    "X-CSRF-Token": "..."
  },
  "params": {
    "attendeeId": "uuid"
  },
  "body": {
    "name": "Radha Sharma",
    "email": "radha@example.com",
    "phone": "+919999999999",
    "businessName": "Radha Textiles",
    "chapterId": null,
    "cityOptionId": "uuid",
    "businessCategoryOptionId": "uuid",
    "tableNumber": "7"
  }
}
```

Response 200:

```json
{
  "attendee": {
    "id": "uuid",
    "name": "Radha Sharma",
    "email": "radha@example.com",
    "phone": "+919999999999",
    "updatedAt": "2026-07-16T10:00:00.000Z"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `409 duplicate_email_or_phone`, `422 invalid_reference_value`, `500 server_error`.

Rate limiting notes: Admin write limit. Audit every change.

### POST /api/admin/attendees/:attendeeId/resend-magic-link

Description: Staff-assisted resend of an attendee magic link to the email on file.

Auth required: Yes, admin `organizer` or `staff`.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_admin_session=...",
    "X-CSRF-Token": "..."
  },
  "params": {
    "attendeeId": "uuid"
  },
  "body": {}
}
```

Response 200:

```json
{
  "status": "queued",
  "recipientEmail": "radha@example.com",
  "retryAfterSeconds": 60
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Counts against attendee email magic-link limits plus a staff resend limit. Audit every resend.

---

## Admin Check-In

### GET /api/admin/checkin/status

Description: Return live check-in dashboard: counters, method breakdown, checked-in and not-yet-checked-in lists.

Auth required: Yes, admin `organizer`, `staff`, or `viewer`.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  },
  "query": {
    "q": "",
    "list": "all",
    "sort": "checked_in_at_desc",
    "limit": 100,
    "offset": 0
  }
}
```

Response 200:

```json
{
  "summary": {
    "checkedInCount": 142,
    "expectedCount": 200,
    "percentage": 71,
    "methodBreakdown": {
      "geolocation": 120,
      "manual": 15,
      "staff_qr": 7
    },
    "venueConfigured": true
  },
  "items": [
    {
      "attendee": "AttendeeCard",
      "checkedIn": true,
      "checkedInAt": "2026-07-20T04:00:00.000Z",
      "method": "geolocation"
    }
  ],
  "pageInfo": {
    "limit": 100,
    "offset": 0,
    "total": 200,
    "hasMore": true
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Poll every 5-30 seconds depending on admin screen.

### POST /api/admin/checkin/qr-scan

Description: Staff scans an attendee QR payload to mark that attendee checked in.

Auth required: Yes, admin `organizer` or `staff`.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_admin_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "body": {
    "qrPayload": "opaque-signed-payload",
    "scannedAt": "2026-07-20T04:00:00.000Z",
    "syncSource": "online"
  }
}
```

Response 200:

```json
{
  "result": "checked_in",
  "alreadyCheckedIn": false,
  "attendee": {
    "id": "uuid",
    "name": "Radha Sharma",
    "businessName": "Radha Textiles"
  },
  "checkIn": {
    "id": "uuid",
    "checkedInAt": "2026-07-20T04:00:00.000Z",
    "method": "staff_qr"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `409 idempotency_conflict`, `422 invalid_qr`, `422 self_checkin_not_allowed`, `500 server_error`.

Rate limiting notes: Offline-replayable. Duplicate scans return already-checked-in state and do not create a second check-in.

### POST /api/admin/checkin/:attendeeId/manual

Description: Staff manually checks in an attendee from admin lookup when QR is unavailable.

Auth required: Yes, admin `organizer` or `staff`.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_admin_session=...",
    "X-CSRF-Token": "...",
    "Idempotency-Key": "uuid"
  },
  "params": {
    "attendeeId": "uuid"
  },
  "body": {
    "checkedInAt": "2026-07-20T04:00:00.000Z"
  }
}
```

Response 200:

```json
{
  "result": "checked_in",
  "alreadyCheckedIn": false,
  "attendee": {
    "id": "uuid",
    "name": "Radha Sharma"
  },
  "checkIn": {
    "id": "uuid",
    "checkedInAt": "2026-07-20T04:00:00.000Z",
    "method": "staff_qr"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `409 idempotency_conflict`, `500 server_error`.

Rate limiting notes: Staff write limit. Idempotent per attendee/event.

---

## Admin Feed Moderation

### GET /api/admin/feed/posts

Description: Return feed posts for moderation, including removed posts when requested.

Auth required: Yes, admin `organizer`, `staff`, or `viewer`.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  },
  "query": {
    "status": "published",
    "sort": "newest",
    "limit": 50,
    "offset": 0
  }
}
```

Response 200:

```json
{
  "items": [
    {
      "id": "uuid",
      "author": {
        "id": "uuid",
        "name": "Radha Sharma",
        "businessName": "Radha Textiles"
      },
      "photo": { "id": "uuid", "url": "https://..." },
      "caption": "Great event!",
      "status": "published",
      "likeCount": 4,
      "commentCount": 2,
      "createdAt": "2026-07-20T05:00:00.000Z",
      "deletedAt": null,
      "deleteReason": null
    }
  ],
  "pageInfo": {
    "limit": 50,
    "offset": 0,
    "total": 23,
    "hasMore": false
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: General admin read limit.

### DELETE /api/admin/feed/posts/:postId

Description: Moderator soft-deletes a feed post.

Auth required: Yes, admin `organizer` or `staff`.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_admin_session=...",
    "X-CSRF-Token": "..."
  },
  "params": {
    "postId": "uuid"
  },
  "body": {
    "reason": "Inappropriate content"
  }
}
```

Response 200:

```json
{
  "status": "removed",
  "postId": "uuid",
  "deletedAt": "2026-07-20T05:10:00.000Z"
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `500 server_error`.

Rate limiting notes: Admin write limit. Audit every moderation action.

---

## Admin Feedback, Analytics, Badges, and Exports

### GET /api/admin/feedback

Description: Return feedback aggregate analytics and paged comments.

Auth required: Yes, admin `organizer` or `viewer`.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  },
  "query": {
    "q": "",
    "rating": "all",
    "sort": "newest",
    "limit": 50,
    "offset": 0
  }
}
```

Response 200:

```json
{
  "summary": {
    "averageRating": 4.2,
    "totalCount": 120,
    "distribution": {
      "1": 1,
      "2": 4,
      "3": 10,
      "4": 35,
      "5": 70
    }
  },
  "items": [
    {
      "id": "uuid",
      "attendee": {
        "id": "uuid",
        "name": "Radha Sharma"
      },
      "rating": 5,
      "comment": "Great networking experience",
      "submittedAt": "2026-07-20T11:20:00.000Z"
    }
  ],
  "pageInfo": {
    "limit": 50,
    "offset": 0,
    "total": 120,
    "hasMore": true
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: General admin read limit.

### POST /api/admin/feedback/prompt

Description: Manually enable or refresh the attendee feedback prompt.

Auth required: Yes, admin `organizer`.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_admin_session=...",
    "X-CSRF-Token": "..."
  },
  "body": {
    "enabled": true,
    "promptAt": "2026-07-20T11:15:00.000Z"
  }
}
```

Response 200:

```json
{
  "status": "updated",
  "feedbackPromptAt": "2026-07-20T11:15:00.000Z"
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `500 server_error`.

Rate limiting notes: Admin write limit.

### GET /api/admin/analytics/overview

Description: Return event-wide dashboard metrics.

Auth required: Yes, admin `organizer`, `staff`, or `viewer`.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  }
}
```

Response 200:

```json
{
  "checkIns": {
    "checkedInCount": 142,
    "expectedCount": 200,
    "methodBreakdown": {
      "geolocation": 120,
      "manual": 15,
      "staff_qr": 7
    }
  },
  "meetings": {
    "totalMeetings": 486,
    "averageMeetingsPerCheckedInAttendee": 3.4
  },
  "engagement": {
    "openedAppCount": 180,
    "completedProfileCount": 160,
    "scannedQrCount": 120,
    "postedPhotoCount": 23,
    "submittedFeedbackCount": 120
  },
  "feed": {
    "postCount": 23,
    "likeCount": 156,
    "commentCount": 40
  },
  "feedback": {
    "averageRating": 4.2,
    "totalCount": 120
  },
  "computedAt": "2026-07-20T11:30:00.000Z"
}
```

Error codes: `401 unauthorized`, `403 forbidden`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Poll every 30 seconds during event dashboard use.

### GET /api/admin/analytics/timeline

Description: Return chart data for check-ins and meetings over time.

Auth required: Yes, admin `organizer`, `staff`, or `viewer`.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  },
  "query": {
    "metric": "checkins",
    "bucketMinutes": 15
  }
}
```

Response 200:

```json
{
  "metric": "checkins",
  "bucketMinutes": 15,
  "items": [
    {
      "bucketStart": "2026-07-20T04:00:00.000Z",
      "count": 18
    }
  ],
  "computedAt": "2026-07-20T11:30:00.000Z"
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Poll no faster than overview. Server may return cached snapshots.

### POST /api/admin/badges

Description: Generate a badge PDF for all or selected attendees.

Auth required: Yes, admin `organizer` or `staff`.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_admin_session=...",
    "X-CSRF-Token": "..."
  },
  "body": {
    "attendeeIds": ["uuid"],
    "includeAll": false
  }
}
```

Response 200:

```json
{
  "job": {
    "id": "uuid",
    "kind": "badges_pdf",
    "status": "queued",
    "createdAt": "2026-07-16T10:00:00.000Z"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Admin export/job limit. For small selected sets, implementation may complete immediately and return `status: "completed"`.

### POST /api/admin/exports

Description: Create an admin export job for analytics, feedback, attendees, meetings, connections, or badges.

Auth required: Yes, admin `organizer`.

Request:

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Cookie": "evento_admin_session=...",
    "X-CSRF-Token": "..."
  },
  "body": {
    "kind": "feedback_csv",
    "format": "csv",
    "parameters": {
      "rating": "all"
    }
  }
}
```

Response 200:

```json
{
  "job": {
    "id": "uuid",
    "kind": "feedback_csv",
    "status": "queued",
    "createdAt": "2026-07-16T10:00:00.000Z"
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `422 unsupported_export_kind`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Export/job limit. Generated files should expire after the configured retention window.

### GET /api/admin/exports/:jobId

Description: Poll an export job status.

Auth required: Yes, admin `organizer`, or the admin who requested the job.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  },
  "params": {
    "jobId": "uuid"
  }
}
```

Response 200:

```json
{
  "job": {
    "id": "uuid",
    "kind": "feedback_csv",
    "status": "completed",
    "downloadUrl": "/api/admin/exports/uuid/download",
    "filename": "feedback.csv",
    "expiresAt": "2026-07-23T10:00:00.000Z",
    "errorMessage": null
  }
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `500 server_error`.

Rate limiting notes: Poll every 2-5 seconds while queued/processing.

### GET /api/admin/exports/:jobId/download

Description: Download a completed export file.

Auth required: Yes, admin `organizer`, or the admin who requested the job.

Request:

```json
{
  "headers": {
    "Cookie": "evento_admin_session=..."
  },
  "params": {
    "jobId": "uuid"
  }
}
```

Response 200:

```json
{
  "contentType": "text/csv",
  "filename": "feedback.csv",
  "body": "rating,comment,submitted_at..."
}
```

Error codes: `400 validation_error`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `410 export_expired`, `425 export_not_ready`, `429 rate_limited`, `500 server_error`.

Rate limiting notes: Download limit per admin. Do not log signed storage URLs.

---

## System

### GET /api/health

Description: Lightweight API health check for admin status displays and deployment checks.

Auth required: No.

Request:

```json
{
  "headers": {},
  "query": {}
}
```

Response 200:

```json
{
  "status": "ok",
  "time": "2026-07-16T10:00:00.000Z"
}
```

Error codes: `500 server_error`.

Rate limiting notes: Public health-check limit. Do not include secrets or database details in the public response.

