# EVENTO - Shared Contract

Shared TypeScript contract for the Evento pilot. This document is the source specification for the future `shared/` workspace package imported by both `apps/web` and `apps/api`.

Recommended package layout:

```text
shared/
  package.json
  src/
    index.ts
    types.ts
    api.ts
    enums.ts
    validation.ts
    constants.ts
    events.ts
```

The shared package must contain serializable types, enum values, constants, and pure validation helpers only. It must not import NestJS, Next.js, Prisma Client, browser APIs, database clients, or server-only secrets.

---

## Primitive Types

```ts
export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;
export type EmailAddress = string;
export type E164Phone = string;
export type IdempotencyKey = string;

export type Nullable<T> = T | null;
export type JsonObject = Record<string, unknown>;

export interface UploadFileLike {
  name: string;
  type: string;
  size: number;
}
```

---

## Enum Values

Keep string values in lower snake case because API responses and target database values use those names.

```ts
export const ADMIN_ROLES = ["organizer", "staff", "viewer"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ACTOR_TYPES = ["attendee", "admin"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const EVENT_STATUSES = ["draft", "importing", "ready", "live", "ended", "archived"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const DIRECTORY_VISIBILITIES = ["all_registered", "checked_in"] as const;
export type DirectoryVisibility = (typeof DIRECTORY_VISIBILITIES)[number];

export const FEATURE_FLAG_KEYS = [
  "home",
  "people_to_meet",
  "directory",
  "connections",
  "leaderboard",
  "profile",
  "show_qr",
  "feed",
  "feedback",
  "summary",
] as const;
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export const CHECK_IN_METHODS = ["geolocation", "manual", "staff_qr"] as const;
export type CheckInMethod = (typeof CHECK_IN_METHODS)[number];

export const CHECK_IN_CONFIRMATION_SOURCES = ["attendee_tap", "staff_scan", "offline_replay"] as const;
export type CheckInConfirmationSource = (typeof CHECK_IN_CONFIRMATION_SOURCES)[number];

export const SYNC_SOURCES = ["online", "offline_replay", "admin"] as const;
export type SyncSource = (typeof SYNC_SOURCES)[number];

export const QR_SCAN_PURPOSES = ["meeting", "staff_checkin"] as const;
export type QrScanPurpose = (typeof QR_SCAN_PURPOSES)[number];

export const QR_SCAN_RESULTS = [
  "success",
  "duplicate",
  "self_scan",
  "invalid_qr",
  "not_found",
  "already_checked_in",
] as const;
export type QrScanResult = (typeof QR_SCAN_RESULTS)[number];

export const CONNECTION_TABS = ["all", "want_to_meet", "already_met"] as const;
export type ConnectionTab = (typeof CONNECTION_TABS)[number];

export const CONNECTION_TYPES = ["bookmarked", "met", "noted"] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export const FEED_POST_STATUSES = ["pending_upload", "processing", "published", "failed", "removed"] as const;
export type FeedPostStatus = (typeof FEED_POST_STATUSES)[number];

export const IMPORT_FILE_TYPES = ["csv", "xls", "xlsx"] as const;
export type ImportFileType = (typeof IMPORT_FILE_TYPES)[number];

export const IMPORT_BATCH_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type ImportBatchStatus = (typeof IMPORT_BATCH_STATUSES)[number];

export const IMPORT_ROW_STATUSES = ["ok", "duplicate", "error", "flagged"] as const;
export type ImportRowStatus = (typeof IMPORT_ROW_STATUSES)[number];

export const MEDIA_KINDS = [
  "profile_photo",
  "feed_photo_original",
  "feed_photo_processed",
  "badge_pdf",
  "export",
  "import_file",
] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_PROCESSING_STATUSES = ["pending", "processing", "ready", "failed"] as const;
export type MediaProcessingStatus = (typeof MEDIA_PROCESSING_STATUSES)[number];

export const EXPORT_KINDS = [
  "connections_csv",
  "connections_vcard",
  "feedback_csv",
  "analytics_csv",
  "analytics_pdf",
  "badges_pdf",
] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export const EXPORT_FORMATS = ["csv", "vcard", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const JOB_STATUSES = ["queued", "processing", "completed", "failed", "expired"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const ANALYTICS_SNAPSHOT_TYPES = [
  "dashboard",
  "leaderboard",
  "checkin_timeline",
  "meeting_timeline",
] as const;
export type AnalyticsSnapshotType = (typeof ANALYTICS_SNAPSHOT_TYPES)[number];

export const CLIENT_SYNC_OPERATION_TYPES = [
  "check_in",
  "meeting_scan",
  "bookmark",
  "note",
  "feed_post",
  "feed_like",
  "feed_comment",
  "feedback",
] as const;
export type ClientSyncOperationType = (typeof CLIENT_SYNC_OPERATION_TYPES)[number];

export const CLIENT_SYNC_STATUSES = ["processed", "duplicate", "conflict", "failed"] as const;
export type ClientSyncStatus = (typeof CLIENT_SYNC_STATUSES)[number];

export const EMAIL_PURPOSES = ["magic_link", "admin_reset", "export_ready", "deliverability_test"] as const;
export type EmailPurpose = (typeof EMAIL_PURPOSES)[number];

export const EMAIL_DELIVERY_STATUSES = ["queued", "sent", "failed", "skipped"] as const;
export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUSES)[number];
```

---

## Entity Shapes

These are API-facing shapes, not Prisma models. Server-only fields such as password hashes, raw token hashes, private storage object keys, IP addresses, and raw QR payloads must not be exposed through shared public entities.

```ts
export interface Option {
  id: UUID;
  name: string;
  displayName?: string;
  isActive: boolean;
}

export interface CityOption extends Option {
  stateOrUt: string;
  displayName: string;
}

export interface MediaRef {
  id: UUID;
  url: string | null;
  widthPx?: number;
  heightPx?: number;
  mimeType?: string;
}

export interface EventPublic {
  id: UUID;
  name: string;
  slug: string;
  venueName: string | null;
  venueLat: number | null;
  venueLng: number | null;
  checkinRadiusM: number;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  feedbackPromptAt: ISODateTime | null;
  status: EventStatus;
}

export interface EventAdmin extends EventPublic {
  updatedAt?: ISODateTime;
}

export interface AdminUserPublic {
  id: UUID;
  name: string;
  email: EmailAddress;
  role: AdminRole;
}

export interface AttendeeCard {
  id: UUID;
  name: string;
  businessName: string;
  businessCategory: Option | null;
  chapter: Option | null;
  city: CityOption | null;
  tableNumber: string | null;
  photo: MediaRef | null;
  checkedIn: boolean;
  checkedInAt: ISODateTime | null;
  bookmarkedByMe: boolean;
  metByMe: boolean;
}

export interface AttendeeProfile extends AttendeeCard {
  email: EmailAddress;
  phone: E164Phone;
  bio: string | null;
  lookingFor: Option[];
  offering: Option[];
  goals: Option[];
  noteByMe: string | null;
  metAt: ISODateTime | null;
  matchReason: string | null;
  isMe: boolean;
}

export interface CurrentAttendeeProfile {
  id: UUID;
  name: string;
  email: EmailAddress;
  phone: E164Phone;
  businessName: string;
  businessCategory: Option | null;
  chapter: Option | null;
  city: CityOption | null;
  tableNumber: string | null;
  bio: string | null;
  lookingFor: Option[];
  offering: Option[];
  goals: Option[];
  photo: MediaRef | null;
  profileCompletedAt: ISODateTime | null;
  tutorialCompletedAt: ISODateTime | null;
}

export interface CheckIn {
  id: UUID;
  checkedInAt: ISODateTime;
  method: CheckInMethod;
}

export interface Meeting {
  id: UUID;
  metAt: ISODateTime;
}

export interface FeedAuthor {
  id: UUID;
  name: string;
  businessName?: string;
  photo?: MediaRef | null;
}

export interface FeedPost {
  id: UUID;
  author: FeedAuthor;
  photo: MediaRef;
  caption: string | null;
  status?: FeedPostStatus;
  createdAt: ISODateTime;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  canDelete: boolean;
}

export interface FeedComment {
  id: UUID;
  author: Pick<FeedAuthor, "id" | "name">;
  comment: string;
  createdAt: ISODateTime;
  canDelete: boolean;
}

export interface ImportBatch {
  id: UUID;
  fileName?: string;
  status: ImportBatchStatus;
  successCount: number;
  duplicateCount: number;
  errorCount: number;
  flaggedCount: number;
  createdAt?: ISODateTime;
  completedAt?: ISODateTime | null;
}

export interface ImportRowResult {
  id: UUID;
  rowNumber: number;
  status: ImportRowStatus;
  reason: string | null;
  normalizedEmail: EmailAddress | null;
  normalizedPhone: E164Phone | null;
  attendeeId: UUID | null;
}

export interface ExportJob {
  id: UUID;
  kind: ExportKind;
  status: JobStatus;
  downloadUrl?: string;
  filename?: string;
  expiresAt?: ISODateTime | null;
  errorMessage?: string | null;
  createdAt?: ISODateTime;
}
```

---

## API Common Types

```ts
export interface PageInfo {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: PageInfo;
}

export type ApiErrorCode =
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "payload_too_large"
  | "unsupported_media_type"
  | "business_rule_violation"
  | "rate_limited"
  | "server_error"
  | "token_expired_or_used"
  | "invalid_credentials"
  | "account_locked"
  | "idempotency_conflict"
  | "profile_incomplete"
  | "outside_radius"
  | "event_not_open"
  | "invalid_qr"
  | "self_scan"
  | "self_checkin_not_allowed"
  | "self_bookmark"
  | "note_too_long"
  | "caption_too_long"
  | "comment_too_long"
  | "rating_required"
  | "sync_pending"
  | "summary_not_ready"
  | "invalid_coordinates"
  | "invalid_radius"
  | "missing_required_columns"
  | "duplicate_email_or_phone"
  | "invalid_reference_value"
  | "unsupported_export_kind"
  | "export_expired"
  | "export_not_ready";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: JsonObject;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface ActorContext {
  type: ActorType;
  id: UUID;
  eventId?: UUID;
  role?: AdminRole;
}

export interface NavigationItem {
  key: FeatureFlagKey;
  label: string;
  href: string;
  enabled: boolean;
}
```

State-changing browser requests should include `X-CSRF-Token`. Offline-replayable writes should also include `Idempotency-Key`.

```ts
export interface MutatingRequestHeaders {
  "X-CSRF-Token": string;
  "Idempotency-Key"?: IdempotencyKey;
}
```

---

## API Request And Response Types

### Auth

```ts
export interface RequestMagicLinkBody {
  email: EmailAddress;
}

export interface RequestMagicLinkResponse {
  status: "sent";
  message: string;
  retryAfterSeconds: number;
  devLink?: string;
}

export interface VerifyMagicLinkBody {
  token: string;
}

export interface VerifyMagicLinkResponse {
  status: "ok";
  nextRoute: "/onboarding" | "/home" | "/install";
  attendee: {
    id: UUID;
    name: string;
    profileCompleted: boolean;
    eventId: UUID;
  };
}

export interface AttendeeSessionResponse {
  authenticated: true;
  actor: ActorContext & { type: "attendee"; eventId: UUID };
  profileCompleted: boolean;
  nextRoute: "/onboarding" | "/home" | "/install";
}

export interface AdminLoginBody {
  email: EmailAddress;
  password: string;
  rememberMe: boolean;
}

export interface AdminLoginResponse {
  status: "ok";
  admin: AdminUserPublic;
  csrfToken: string;
}

export interface AdminMeResponse {
  authenticated: true;
  admin: AdminUserPublic;
  csrfToken: string;
}

export interface LogoutResponse {
  status: "logged_out";
}

export interface CsrfResponse {
  csrfToken: string;
  expiresAt: ISODateTime;
}
```

### App Shell, Reference Data, And Profile

```ts
export interface AppBootstrapResponse {
  attendee: {
    id: UUID;
    name: string;
    businessName: string;
    photo: MediaRef | null;
    profileCompleted: boolean;
    tutorialCompleted: boolean;
  };
  event: Pick<EventPublic, "id" | "name" | "status" | "startsAt" | "endsAt" | "feedbackPromptAt">;
  navigation: NavigationItem[];
  prompts: {
    showTutorial: boolean;
    showFeedback: boolean;
    showSummary: boolean;
  };
}

export interface CompleteTutorialBody {
  completed: boolean;
  lastStepSeen: number;
}

export interface CompleteTutorialResponse {
  tutorialCompletedAt: ISODateTime;
}

export interface ProfileOptionsResponse {
  businessCategories: Option[];
  businessTags: Option[];
  goals: Option[];
  chapters: Option[];
  citySearchMinChars: number;
}

export interface CitySearchQuery {
  q: string;
  limit?: number;
}

export interface CitySearchResponse {
  items: CityOption[];
}

export interface DirectoryFiltersResponse {
  businessCategories: Option[];
  chapters: Option[];
  cities: CityOption[];
  companies: Array<{ value: string; count: number }>;
  checkInStatuses: ["all", "checked_in", "not_checked_in"];
}

export interface CurrentAttendeeResponse {
  attendee: CurrentAttendeeProfile;
  stats: {
    metCount: number;
    leaderboardRank: number | null;
    bookmarkCount: number;
    photoPostCount: number;
  };
}

export interface UpdateProfileBody {
  name?: string;
  businessCategoryOptionId: UUID;
  cityOptionId: UUID;
  lookingForTagIds: UUID[];
  offeringTagIds: UUID[];
  goalOptionIds: UUID[];
  bio?: string | null;
  consentAccepted: boolean;
}

export interface UpdateProfileResponse {
  attendee: AttendeeProfile;
  profileCompleted: boolean;
  nextRoute: "/install" | "/home";
}

export interface OwnQrResponse {
  qrPayload: string;
  payloadVersion: number;
  displayName: string;
  expiresAt: ISODateTime | null;
}
```

### Directory, Matches, Check-In, And Meetings

```ts
export interface AttendeeDirectoryQuery {
  q?: string;
  businessCategoryId?: UUID;
  chapterId?: UUID;
  cityId?: UUID;
  company?: string;
  checkedIn?: "all" | "checked_in" | "not_checked_in";
  sort?: "name" | "business_name" | "checked_in_at_desc";
  limit?: number;
  offset?: number;
}

export interface AttendeeDirectoryResponse extends PaginatedResponse<AttendeeCard> {
  facets: {
    businessCategories: Option[];
    chapters: Option[];
    cities: CityOption[];
    companies: Array<{ value: string; count: number }>;
  };
}

export interface AttendeeProfileResponse {
  attendee: AttendeeProfile;
}

export interface MatchSuggestion {
  rank: number;
  score: number;
  reason: string;
  attendee: AttendeeCard;
}

export interface MatchesResponse extends PaginatedResponse<MatchSuggestion> {
  computedAt: ISODateTime;
  algorithmVersion: "rules_v1" | string;
}

export interface CheckInStatusResponse {
  checkedIn: boolean;
  checkedInAt: ISODateTime | null;
  method: CheckInMethod | null;
  confirmationSource: CheckInConfirmationSource | null;
  syncSource: SyncSource;
}

export interface GeolocationCheckInBody {
  latitude: number;
  longitude: number;
  accuracyM: number;
  distanceFromVenueM: number;
  clientCheckedInAt: ISODateTime;
  syncSource: SyncSource;
}

export interface ManualCheckInBody {
  clientCheckedInAt: ISODateTime;
  syncSource: SyncSource;
}

export interface CheckInResponse {
  status: "checked_in";
  alreadyCheckedIn: boolean;
  checkIn: CheckIn;
}

export interface ScanMeetingBody {
  qrPayload: string;
  scannedAt: ISODateTime;
  syncSource: SyncSource;
}

export interface ScanMeetingResponse {
  result: "success";
  duplicate: boolean;
  meeting: Meeting;
  attendee: AttendeeProfile;
  leaderboardDelta: number;
}
```

### Connections, Feed, Feedback, And Summary

```ts
export interface ConnectionsQuery {
  tab?: ConnectionTab;
  q?: string;
  sort?: "met_at_desc" | "name" | "company";
  limit?: number;
  offset?: number;
}

export interface ConnectionListItem {
  attendee: AttendeeCard;
  connectionType: ConnectionType;
  bookmarked: boolean;
  metAt: ISODateTime | null;
  note: string | null;
}

export interface ConnectionsResponse extends PaginatedResponse<ConnectionListItem> {
  counts: {
    wantToMeet: number;
    alreadyMet: number;
  };
}

export interface BookmarkBody {
  targetAttendeeId: UUID;
}

export interface BookmarkResponse {
  status: "bookmarked";
  bookmark: {
    id: UUID;
    targetAttendeeId: UUID;
    createdAt: ISODateTime;
  };
}

export interface UnbookmarkResponse {
  status: "unbookmarked";
  targetAttendeeId: UUID;
}

export interface SaveNoteBody {
  note: string;
}

export interface SaveNoteResponse {
  status: "saved";
  note: {
    targetAttendeeId: UUID;
    note: string;
    updatedAt: ISODateTime;
  };
}

export interface DeleteNoteResponse {
  status: "deleted";
  targetAttendeeId: UUID;
}

export interface FileDownloadResponse {
  contentType: string;
  filename: string;
  body: string;
}

export interface FeedPostsResponse extends PaginatedResponse<FeedPost> {}

export interface CreateFeedPostBody {
  photo: UploadFileLike;
  caption?: string;
  clientCreatedAt: ISODateTime;
}

export interface CreateFeedPostResponse {
  status: "published";
  post: Pick<FeedPost, "id" | "caption" | "photo" | "createdAt">;
}

export interface DeleteFeedPostResponse {
  status: "deleted";
  postId: UUID;
}

export interface FeedLikeResponse {
  status: "liked" | "unliked";
  postId: UUID;
  likeCount: number;
  likedByMe: boolean;
}

export interface FeedCommentsResponse extends PaginatedResponse<FeedComment> {}

export interface CreateFeedCommentBody {
  comment: string;
}

export interface CreateFeedCommentResponse {
  status: "created";
  comment: Pick<FeedComment, "id" | "comment" | "createdAt">;
  commentCount: number;
}

export interface DeleteFeedCommentResponse {
  status: "deleted";
  commentId: UUID;
}

export interface FeedbackMeResponse {
  promptEnabled: boolean;
  promptAt: ISODateTime | null;
  submitted: boolean;
  response: {
    rating: 1 | 2 | 3 | 4 | 5;
    comment: string | null;
    submittedAt: ISODateTime;
  } | null;
}

export interface SubmitFeedbackBody {
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string | null;
}

export interface SubmitFeedbackResponse {
  status: "submitted";
  feedback: {
    rating: 1 | 2 | 3 | 4 | 5;
    comment: string | null;
    submittedAt: ISODateTime;
  };
}

export interface AttendeeSummaryResponse {
  status: "ready";
  event: {
    id: UUID;
    name: string;
    date: ISODate;
  };
  stats: {
    peopleMetCount: number;
    cardsCollectedCount: number;
    leaderboardRank: number | null;
  };
  topConnections: AttendeeCard[];
  generatedAt: ISODateTime;
}
```

### Leaderboard And Admin

```ts
export interface LeaderboardItem {
  rank: number;
  attendee: Pick<AttendeeCard, "id" | "name" | "businessName" | "photo">;
  metCount: number;
}

export interface LeaderboardResponse {
  items: LeaderboardItem[];
  myRank: {
    rank: number;
    metCount: number;
  } | null;
  totalAttendees: number;
  computedAt: ISODateTime;
}

export interface UpdateEventBody {
  venueName: string;
  venueLat: number;
  venueLng: number;
  checkinRadiusM: number;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  feedbackPromptAt: ISODateTime | null;
  status: EventStatus;
}

export interface AdminImportBody {
  file: UploadFileLike;
  columnMapping: Record<string, string>;
  dryRun: boolean;
}

export interface AdminImportResponse {
  batch: ImportBatch;
  previewRows: ImportRowResult[];
}

export interface AdminAttendeeListItem {
  id: UUID;
  name: string;
  email: EmailAddress;
  phone: E164Phone;
  businessName: string;
  chapter: Option | null;
  tableNumber: string | null;
  profileCompleted: boolean;
  checkedIn: boolean;
  checkedInAt: ISODateTime | null;
  importFlags: string[];
}

export interface AdminAttendeesResponse extends PaginatedResponse<AdminAttendeeListItem> {}

export interface StaffQrCheckInBody {
  qrPayload: string;
  scannedAt: ISODateTime;
  syncSource: SyncSource;
}

export interface StaffManualCheckInBody {
  checkedInAt: ISODateTime;
}

export interface AdminCheckInResponse {
  result: "checked_in";
  alreadyCheckedIn: boolean;
  attendee: {
    id: UUID;
    name: string;
    businessName?: string;
  };
  checkIn: CheckIn;
}

export interface AdminAnalyticsOverviewResponse {
  checkIns: {
    checkedInCount: number;
    expectedCount: number;
    methodBreakdown: Record<CheckInMethod, number>;
  };
  meetings: {
    totalMeetings: number;
    averageMeetingsPerCheckedInAttendee: number;
  };
  engagement: {
    openedAppCount: number;
    completedProfileCount: number;
    scannedQrCount: number;
    postedPhotoCount: number;
    submittedFeedbackCount: number;
  };
  feed: {
    postCount: number;
    likeCount: number;
    commentCount: number;
  };
  feedback: {
    averageRating: number;
    totalCount: number;
  };
  computedAt: ISODateTime;
}

export interface AdminAnalyticsTimelineQuery {
  metric: "checkins" | "meetings";
  bucketMinutes: number;
}

export interface AdminAnalyticsTimelineResponse {
  metric: "checkins" | "meetings";
  bucketMinutes: number;
  items: Array<{
    bucketStart: ISODateTime;
    count: number;
  }>;
  computedAt: ISODateTime;
}

export interface CreateExportBody {
  kind: ExportKind;
  format: ExportFormat;
  parameters: JsonObject;
}

export interface ExportJobResponse {
  job: ExportJob;
}

export interface HealthResponse {
  status: "ok";
  time: ISODateTime;
}
```

---

## Validation Rules

Shared validation should be exposed both as constants and as small pure helper functions. Backend DTO validators may wrap these values; frontend forms should use the same values for immediate feedback.

```ts
export const VALIDATION = {
  email: {
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    normalize: "trim_lowercase",
  },
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: false,
    requireLowercase: false,
    requireNumber: false,
    requireSymbol: false,
    note: "Admin passwords are required only for admin users. Attendees use magic links only.",
  },
  name: {
    minLength: 1,
    maxLength: 100,
  },
  businessName: {
    minLength: 1,
    maxLength: 120,
  },
  businessCategoryName: {
    minLength: 1,
    maxLength: 100,
  },
  cityName: {
    minLength: 1,
    maxLength: 100,
  },
  tableNumber: {
    maxLength: 20,
  },
  bio: {
    maxLength: 200,
  },
  profileTags: {
    maxLookingFor: 6,
    maxOffering: 6,
    maxGoals: 6,
  },
  note: {
    maxLength: 500,
  },
  feedCaption: {
    maxLength: 200,
  },
  feedComment: {
    minLength: 1,
    maxLength: 500,
  },
  feedbackComment: {
    maxLength: 500,
  },
  feedbackRating: {
    min: 1,
    max: 5,
  },
  latitude: {
    min: -90,
    max: 90,
  },
  longitude: {
    min: -180,
    max: 180,
  },
  checkinRadiusM: {
    min: 100,
    max: 5000,
    default: 500,
  },
  geolocationAccuracyM: {
    min: 0,
    max: 5000,
  },
  citySearch: {
    minChars: 2,
    maxChars: 100,
  },
  idempotencyKey: {
    format: "uuid_v4_recommended",
    maxLength: 100,
  },
} as const;
```

Normalization rules:

- Email: trim, lowercase, validate format, then use normalized email for login, imports, rate limits, and dedupe.
- Phone: normalize to E.164-ish text when possible; preserve raw phone only in import row audit data.
- Names and labels: trim whitespace; collapse repeated internal whitespace for matching/dedupe keys.
- Reference selections: profile edits must use active option IDs for city, business category, business tags, and goals. Imported legacy values may be preserved as inactive or `import_legacy` reference records.
- Attendee email and phone are read-only to attendees in v1.
- QR payloads must be opaque signed strings and must never include email, phone, or sequential IDs.
- Magic-link tokens are raw only at the edge; store and compare hashes only.

---

## Shared Constants

```ts
export const HTTP_HEADERS = {
  csrfToken: "X-CSRF-Token",
  idempotencyKey: "Idempotency-Key",
  deviceId: "X-Device-Id",
} as const;

export const COOKIES = {
  attendeeSession: "evento_session",
  adminSession: "evento_admin_session",
} as const;

export const AUTH = {
  magicLinkTtlMinutes: 30,
  attendeeSessionMaxAgeDays: 30,
  maxMagicLinkSendsPerEmailPerHour: 5,
  maxMagicLinkSendsPerDevicePerHour: 3,
  maxMagicLinkSendsPerIpPerHourCurrentApiFallback: 15,
  neutralMagicLinkMessage: "If that email is on the guest list, we've sent a link.",
} as const;

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
  directoryDefaultLimit: 50,
  directoryMaxLimit: 100,
  connectionsDefaultLimit: 50,
  feedDefaultLimit: 20,
  commentsDefaultLimit: 50,
  adminListDefaultLimit: 100,
  leaderboardDefaultLimit: 20,
  leaderboardMaxLimit: 100,
  offsetDefault: 0,
} as const;

export const FILE_UPLOADS = {
  adminImportMaxBytes: 5 * 1024 * 1024,
  feedPhotoMaxBytes: 10 * 1024 * 1024,
  profilePhotoMaxBytes: 5 * 1024 * 1024,
  allowedImportMimeTypes: [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  allowedImageMimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export const POLLING = {
  leaderboardMs: 5_000,
  adminDashboardMs: 30_000,
  adminCheckInFastMs: 5_000,
  exportJobMinMs: 2_000,
  exportJobMaxMs: 5_000,
} as const;

export const CACHE_HINTS = {
  appBootstrapSeconds: 60,
  eventConfigSeconds: 300,
  referenceDataSeconds: 86_400,
  ownQrPayload: "cache_until_payload_version_changes",
} as const;

export const OFFLINE_QUEUE = {
  maxAttempts: 5,
  retryBaseMs: 1_000,
  retryMaxMs: 60_000,
  replayableOperationTypes: CLIENT_SYNC_OPERATION_TYPES,
} as const;

export const MATCHING = {
  algorithmVersion: "rules_v1",
  defaultLimit: 10,
} as const;
```

---

## Event And Message Names

The pilot uses polling for live UI updates. Queue names and job names are still shared so the API and any worker process agree on payloads. Use these names if BullMQ/Redis is enabled; an in-process worker should keep the same identifiers.

```ts
export const QUEUES = {
  email: "evento.email",
  imports: "evento.imports",
  media: "evento.media",
  exports: "evento.exports",
  analytics: "evento.analytics",
  cleanup: "evento.cleanup",
  sync: "evento.sync",
} as const;

export const JOB_NAMES = {
  sendMagicLinkEmail: "email.send_magic_link",
  sendExportReadyEmail: "email.send_export_ready",
  processAttendeeImport: "imports.process_attendee_file",
  seedReferenceData: "imports.seed_reference_data",
  generateBadgesPdf: "exports.generate_badges_pdf",
  generateExportFile: "exports.generate_file",
  processImage: "media.process_image",
  finalizeFeedPost: "media.finalize_feed_post",
  refreshAnalyticsSnapshot: "analytics.refresh_snapshot",
  refreshLeaderboardCache: "analytics.refresh_leaderboard",
  generateAttendeeSummary: "analytics.generate_attendee_summary",
  cleanupExpiredMagicLinks: "cleanup.expired_magic_links",
  cleanupAbandonedUploads: "cleanup.abandoned_uploads",
  auditSyncConflict: "sync.audit_conflict",
} as const;

export interface QueuePayloads {
  "email.send_magic_link": {
    attendeeId: UUID;
    email: EmailAddress;
    link: string;
    eventId: UUID;
  };
  "imports.process_attendee_file": {
    batchId: UUID;
    eventId: UUID;
    uploadedByAdminId: UUID;
  };
  "exports.generate_badges_pdf": {
    jobId: UUID;
    eventId: UUID;
    attendeeIds?: UUID[];
    includeAll: boolean;
  };
  "exports.generate_file": {
    jobId: UUID;
    eventId: UUID;
    requestedByAdminId?: UUID;
    requestedByAttendeeId?: UUID;
    kind: ExportKind;
    format: ExportFormat;
    parameters: JsonObject;
  };
  "media.process_image": {
    mediaAssetId: UUID;
    eventId: UUID;
    kind: Extract<MediaKind, "profile_photo" | "feed_photo_original" | "feed_photo_processed">;
  };
  "media.finalize_feed_post": {
    postId: UUID;
    eventId: UUID;
  };
  "analytics.refresh_snapshot": {
    eventId: UUID;
    snapshotType: AnalyticsSnapshotType;
  };
  "analytics.refresh_leaderboard": {
    eventId: UUID;
  };
  "analytics.generate_attendee_summary": {
    eventId: UUID;
    attendeeId: UUID;
  };
  "sync.audit_conflict": {
    eventId: UUID;
    attendeeId: UUID | null;
    operationType: ClientSyncOperationType;
    idempotencyKey: IdempotencyKey;
  };
}
```

If WebSockets are added after v1, use these message names:

```ts
export const SOCKET_EVENTS = {
  checkInUpdated: "checkin.updated",
  leaderboardUpdated: "leaderboard.updated",
  feedPostCreated: "feed.post_created",
  feedPostRemoved: "feed.post_removed",
  exportJobUpdated: "export.job_updated",
  feedbackPromptUpdated: "feedback.prompt_updated",
} as const;
```

---

## Import Rules For Apps

Frontend imports should use only shared API, validation, constants, and display-safe entity types:

```ts
import { AttendeeCard, PAGINATION, VALIDATION } from "@evento/shared";
```

Backend imports may additionally use queue payload contracts and enum arrays for DTO validation:

```ts
import { ADMIN_ROLES, QUEUES, QueuePayloads, VALIDATION } from "@evento/shared";
```

The shared package should be versioned with the repo and changed in the same PR as any API, DB, or UI behavior that depends on it.
