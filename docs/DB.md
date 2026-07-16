# EVENTO - Database Specification

Database design for the single-day Evento pilot described in [`PRD_v1.md`](./PRD_v1.md), [`SCREENS.md`](./SCREENS.md), and [`BACKEND.md`](./BACKEND.md).

The schema is intentionally event-scoped even though v1 runs one pilot event. That keeps the build simple today while avoiding a painful rewrite if a second event is added later.

---

## Database Choice and Justification

**Choice: Supabase as the managed backend platform, using Supabase Postgres for relational data and Supabase Storage for files. The NestJS API remains the business-logic layer and accesses Postgres through Prisma.**

Why PostgreSQL:
- Evento data is relationship-heavy: events, attendees, chapters, check-ins, meetings, bookmarks, feed posts, likes, comments, feedback, imports, and exports all need joins and constraints.
- The pilot requires strong integrity rules: dedupe attendees by email/phone, prevent duplicate meeting points, enforce one check-in per attendee per event, and support idempotent offline sync replay.
- PostgreSQL gives useful native features for this product: `jsonb` for raw import rows and metadata, join-table constraints for profile tags/goals, full-text indexes for directory search, partial indexes for soft-delete visibility, case-insensitive email via `citext`, and generated/check-constrained fields where needed.
- Supabase gives managed Postgres, connection pooling, backups, dashboard operations, and Storage while still letting the app use Prisma as a normal PostgreSQL database.
- Supabase Auth is not used for the pilot. Attendee auth stays in Evento's NestJS magic-link module so login remains registration-list-bound, enumeration-safe, and controlled by the API.

Why not NoSQL:
- Most reads are filtered relational lists or aggregates: directory, leaderboard, check-in dashboard, feedback analytics, and admin exports. Modeling these in a document store would push too much consistency logic into application code.

Why not SQLite:
- SQLite is excellent locally, but the event-day API needs hosted concurrent access, backups, pooling, and operational visibility.

---

## Naming and Type Conventions

- Physical table and column names use `snake_case`.
- IDs use `uuid` with `gen_random_uuid()`.
- Timestamps use `timestamptz`.
- Email columns use `citext` when uniqueness is case-insensitive.
- Phone numbers are stored in normalized E.164-ish text where possible, plus raw values only inside import row `raw_data`.
- Reference data is database-backed: business categories, business tags, goals, chapters, and the nationwide city catalogue. Reference records are deactivated rather than hard-deleted.
- Binary files are not stored in PostgreSQL. The database stores object keys, URLs, dimensions, size, MIME type, and moderation/deletion state.
- Leaderboard ranks and admin analytics are computed from source tables. Cached snapshots are allowed for polling performance but are not source of truth.
- Every attendee/admin state-changing write that can be replayed from the offline queue should carry an `idempotency_key`.

---

## Audit / Timestamp Field Convention

For normal mutable entities:
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null` when the entity is soft-deletable

For append-only event logs:
- Use `created_at` only.
- Do not update or soft-delete except for retention cleanup.

For actor tracking:
- Use `created_by_admin_id`, `updated_by_admin_id`, `deleted_by_admin_id` on admin-managed entities when useful.
- Feed self-deletes and moderator deletes are captured on the row and also in `admin_audit_logs` for admin actions.

Implementation note: Prisma should update `updated_at` with `@updatedAt`; raw SQL migrations can also add triggers if direct SQL writes become common.

---

## Full Schema

## events
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Event display name |
| slug | text | No | - | Unique URL/admin identifier |
| description | text | Yes | null | Optional event copy |
| venue_name | text | Yes | null | Human-readable venue name |
| venue_latitude | numeric(9,6) | Yes | null | Required for geolocation check-in; valid -90 to 90 |
| venue_longitude | numeric(9,6) | Yes | null | Required for geolocation check-in; valid -180 to 180 |
| checkin_radius_m | integer | No | 500 | Valid 100 to 5000 |
| starts_at | timestamptz | No | - | Event start |
| ends_at | timestamptz | No | - | Event end |
| feedback_prompt_at | timestamptz | Yes | null | When the app should show feedback prompt |
| directory_visibility | text | No | 'all_registered' | `all_registered`, `checked_in`; latest PRD resolves pilot to full pre-registered visibility with check-in filters |
| status | text | No | 'draft' | `draft`, `importing`, `ready`, `live`, `ended`, `archived` |
| created_at | timestamptz | No | now() | Audit timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |
| deleted_at | timestamptz | Yes | null | Soft delete only for accidental event setup |

## chapters
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | RMB chapter name |
| normalized_name | text | No | - | Lower/trimmed unique key |
| is_active | boolean | No | true | Active reference option for filters/import mapping |
| sort_order | integer | No | 0 | UI ordering |
| created_at | timestamptz | No | now() | Audit timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |
| deleted_at | timestamptz | Yes | null | Soft delete if a chapter value is merged/retired |

## business_category_options
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Display name, e.g. `Manufacturer` |
| normalized_name | text | No | - | Lower/trimmed unique key |
| sort_order | integer | No | 0 | UI ordering |
| is_active | boolean | No | true | Hide old options without deleting old profile data |
| source | text | No | 'seed' | `seed`, `import_legacy`, `admin` |
| created_at | timestamptz | No | now() | Audit timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |

## business_tag_options
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Shared option for both looking-for and offering |
| normalized_name | text | No | - | Lower/trimmed unique key |
| sort_order | integer | No | 0 | UI ordering |
| is_active | boolean | No | true | Hide old options without deleting old profile data |
| source | text | No | 'seed' | `seed`, `import_legacy`, `admin` |
| created_at | timestamptz | No | now() | Audit timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |

## goal_options
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Goal display label |
| normalized_name | text | No | - | Lower/trimmed unique key |
| sort_order | integer | No | 0 | UI ordering |
| is_active | boolean | No | true | Hide old options without deleting old profile data |
| source | text | No | 'seed' | `seed`, `admin` |
| created_at | timestamptz | No | now() | Audit timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |

## city_options
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | City name |
| state_or_ut | text | No | - | Indian state/UT name; use `Legacy / Imported` for preserved imports |
| display_name | text | No | - | `City, State/UT` label shown in UI |
| normalized_name | text | No | - | Lower/trimmed city key |
| normalized_display_name | text | No | - | Lower/trimmed display key |
| sort_order | integer | No | 0 | UI ordering/typeahead priority |
| is_active | boolean | No | true | Active reference option for profile/directory filters |
| source | text | No | 'seed' | `seed`, `import_legacy`, `admin` |
| created_at | timestamptz | No | now() | Audit timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |

## attendees
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| name | text | No | - | Imported from registration; attendee-editable only if product allows |
| email | citext | No | - | Canonical attendee login identity |
| phone | text | No | - | Normalized phone for dedupe/contact |
| business_name | text | No | - | Registration business/profession name |
| chapter_id | uuid | Yes | null | FK to `chapters.id`; null means non-RMBian/no chapter |
| photo_media_id | uuid | Yes | null | FK to `media_assets.id`; imported profile photo |
| table_number | text | Yes | null | Optional fixed table assignment |
| city_option_id | uuid | Yes | null | FK to `city_options.id`; required for new profile completion |
| city_label | text | Yes | null | Display/cache value, including preserved legacy imported city values |
| business_category_option_id | uuid | Yes | null | FK to `business_category_options.id`; required for new profile completion |
| business_category_label | text | Yes | null | Display/cache value, including preserved legacy imported category values |
| bio | text | Yes | null | Optional, max 200 chars in app |
| consent_accepted_at | timestamptz | Yes | null | Required before full app usage if consent copy is added |
| profile_completed_at | timestamptz | Yes | null | Null means route to profile setup |
| tutorial_completed_at | timestamptz | Yes | null | Null means show first-time tutorial |
| app_first_opened_at | timestamptz | Yes | null | Engagement metric |
| last_seen_at | timestamptz | Yes | null | Engagement/support metric |
| qr_token_hash | text | No | - | Hash of signed opaque QR payload; raw token never logged |
| qr_payload_version | integer | No | 1 | Supports future QR rotation |
| import_batch_id | uuid | Yes | null | FK to `import_batches.id` that created/last updated row |
| import_row_id | uuid | Yes | null | FK to `import_rows.id` for traceability |
| import_flags | text[] | No | '{}' | Example: `email_mismatch`, `photo_missing` |
| created_at | timestamptz | No | now() | Audit timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |
| deleted_at | timestamptz | Yes | null | Soft delete for privacy/removal requests |

## attendee_looking_for_tags
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_id | uuid | No | - | FK to `attendees.id` |
| business_tag_option_id | uuid | No | - | FK to `business_tag_options.id` |
| created_at | timestamptz | No | now() | Selection timestamp |

## attendee_offering_tags
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_id | uuid | No | - | FK to `attendees.id` |
| business_tag_option_id | uuid | No | - | FK to `business_tag_options.id` |
| created_at | timestamptz | No | now() | Selection timestamp |

## attendee_goal_selections
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_id | uuid | No | - | FK to `attendees.id` |
| goal_option_id | uuid | No | - | FK to `goal_options.id` |
| created_at | timestamptz | No | now() | Selection timestamp |

## admin_users
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| email | citext | No | - | Unique admin login email |
| name | text | No | - | Admin/staff display name |
| password_hash | text | No | - | Argon2 or bcrypt hash |
| role | text | No | 'viewer' | `organizer`, `staff`, `viewer` |
| is_active | boolean | No | true | Disable account without deleting audit history |
| last_login_at | timestamptz | Yes | null | Admin audit/support |
| failed_login_count | integer | No | 0 | Lockout/progressive delay support |
| locked_until | timestamptz | Yes | null | Temporary lockout |
| created_at | timestamptz | No | now() | Audit timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |
| deleted_at | timestamptz | Yes | null | Soft delete/deactivate only |

## feature_flags
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | Yes | null | FK to `events.id`; null means global default |
| key | text | No | - | Example: `people_to_meet`, `directory`, `feed`, `feedback`, `summary` |
| label | text | No | - | Human-readable name for admin/dev inspection |
| is_enabled | boolean | No | false | Production hides disabled destinations |
| show_disabled_in_dev | boolean | No | false | Development may show disabled item as `Soon` |
| metadata | jsonb | No | '{}' | Optional route/order/capability metadata |
| created_at | timestamptz | No | now() | Audit timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |

## sessions
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| actor_type | text | No | - | `attendee` or `admin` |
| attendee_id | uuid | Yes | null | FK to `attendees.id`; set when actor_type is attendee |
| admin_user_id | uuid | Yes | null | FK to `admin_users.id`; set when actor_type is admin |
| event_id | uuid | Yes | null | FK to `events.id`; required for attendee sessions |
| token_hash | text | No | - | Hash of cookie/JWT session identifier for revocation |
| user_agent | text | Yes | null | Support/security audit |
| ip_address | inet | Yes | null | Security audit; avoid exposing in UI |
| created_at | timestamptz | No | now() | Session issued at |
| expires_at | timestamptz | No | - | Absolute expiry |
| last_seen_at | timestamptz | Yes | null | Idle timeout support |
| revoked_at | timestamptz | Yes | null | Logout/admin revocation |

## magic_link_tokens
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| attendee_id | uuid | No | - | FK to `attendees.id` |
| event_id | uuid | No | - | FK to `events.id` |
| token_hash | text | No | - | Unique hash only; never store raw token |
| requested_email | citext | No | - | Email typed into login screen |
| request_ip | inet | Yes | null | Rate limiting/security |
| request_user_agent | text | Yes | null | Rate limiting/security |
| expires_at | timestamptz | No | - | 30 minutes after creation |
| used_at | timestamptz | Yes | null | Single-use enforcement |
| created_at | timestamptz | No | now() | Audit timestamp |

## email_delivery_logs
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | Yes | null | FK to `events.id` when event-specific |
| attendee_id | uuid | Yes | null | FK to `attendees.id` for attendee mail |
| admin_user_id | uuid | Yes | null | FK to `admin_users.id` for admin mail |
| purpose | text | No | - | `magic_link`, `admin_reset`, `export_ready`, `deliverability_test` |
| recipient_email | citext | No | - | Recipient address |
| provider | text | No | 'smtp' | `smtp`, `gmail_smtp`, future provider name |
| provider_message_id | text | Yes | null | Provider response ID if available |
| status | text | No | 'queued' | `queued`, `sent`, `failed`, `skipped` |
| error_message | text | Yes | null | Failure reason without raw tokens |
| metadata | jsonb | No | '{}' | Safe delivery metadata; no magic-link token |
| queued_at | timestamptz | No | now() | Queued timestamp |
| sent_at | timestamptz | Yes | null | Sent timestamp |
| created_at | timestamptz | No | now() | Insert timestamp |

## rate_limit_events
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| scope | text | No | - | Example: `magic_link_email`, `magic_link_device`, `admin_login` |
| key_hash | text | No | - | Hash of email/IP/device key |
| event_count | integer | No | 1 | Count within bucket |
| window_starts_at | timestamptz | No | - | Rate limit bucket start |
| window_ends_at | timestamptz | No | - | Rate limit bucket end |
| created_at | timestamptz | No | now() | Audit timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |

## import_batches
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| file_name | text | No | - | Uploaded CSV/XLSX filename |
| file_type | text | No | - | `csv`, `xlsx`, or `xls` |
| file_media_id | uuid | Yes | null | FK to `media_assets.id` if raw file retained |
| uploaded_by_admin_id | uuid | Yes | null | FK to `admin_users.id` |
| status | text | No | 'pending' | `pending`, `processing`, `completed`, `failed` |
| column_mapping | jsonb | No | '{}' | Raw header to Evento field mapping |
| parser_version | text | No | 'import_v1' | Import parser/normalizer version |
| success_count | integer | No | 0 | Imported/updated rows |
| duplicate_count | integer | No | 0 | Skipped duplicate email/phone rows |
| error_count | integer | No | 0 | Failed rows |
| flagged_count | integer | No | 0 | Imported but needs admin review |
| started_at | timestamptz | Yes | null | Processing start |
| completed_at | timestamptz | Yes | null | Processing completion |
| created_at | timestamptz | No | now() | Upload timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |

## import_rows
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| import_batch_id | uuid | No | - | FK to `import_batches.id` |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_id | uuid | Yes | null | FK to `attendees.id` when imported/updated |
| row_number | integer | No | - | Original file row number |
| raw_data | jsonb | No | - | Full raw row for audit/debug; includes ignored payment columns if present |
| normalized_email | citext | Yes | null | Parsed form-question email |
| normalized_phone | text | Yes | null | Parsed phone |
| mapped_city_option_id | uuid | Yes | null | FK to `city_options.id` if city matched or legacy option created |
| mapped_business_category_option_id | uuid | Yes | null | FK to `business_category_options.id` if category matched or legacy option created |
| mapped_chapter_id | uuid | Yes | null | FK to `chapters.id` if chapter matched or created |
| reference_mapping | jsonb | No | '{}' | Details of matched, preserved legacy, or missing reference values |
| status | text | No | - | `ok`, `duplicate`, `error`, `flagged` |
| reason | text | Yes | null | Human-readable result/review reason |
| created_at | timestamptz | No | now() | Audit timestamp |

## media_assets
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | Yes | null | FK to `events.id`; null for global/static assets |
| owner_attendee_id | uuid | Yes | null | FK to `attendees.id` for attendee uploads |
| uploaded_by_admin_id | uuid | Yes | null | FK to `admin_users.id` for admin uploads/exports |
| kind | text | No | - | `profile_photo`, `feed_photo_original`, `feed_photo_processed`, `badge_pdf`, `export`, `import_file` |
| storage_bucket | text | No | - | Supabase Storage bucket |
| object_key | text | No | - | Generated Supabase Storage object key |
| public_url | text | Yes | null | CDN/public URL when safe |
| signed_url_expires_at | timestamptz | Yes | null | Only for short-lived generated URLs; never log raw signed URLs |
| mime_type | text | No | - | Server-validated MIME type |
| byte_size | bigint | No | - | File size |
| width_px | integer | Yes | null | Images only |
| height_px | integer | Yes | null | Images only |
| checksum_sha256 | text | Yes | null | Dedup/integrity |
| processing_status | text | No | 'ready' | `pending`, `processing`, `ready`, `failed` |
| metadata | jsonb | No | '{}' | Extra upload/export metadata |
| created_at | timestamptz | No | now() | Audit timestamp |
| deleted_at | timestamptz | Yes | null | Soft delete/hide; object cleanup can be delayed |

## check_ins
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_id | uuid | No | - | FK to `attendees.id` |
| method | text | No | - | `geolocation`, `manual`, `staff_qr`; `geolocation` means attendee tapped after in-radius arrival detection |
| confirmation_source | text | No | 'attendee_tap' | `attendee_tap`, `staff_scan`, `offline_replay` |
| checked_in_at | timestamptz | No | now() | Source-of-truth timestamp |
| latitude | numeric(9,6) | Yes | null | Present for geolocation attempts if available |
| longitude | numeric(9,6) | Yes | null | Present for geolocation attempts if available |
| accuracy_m | integer | Yes | null | Browser geolocation accuracy |
| distance_from_venue_m | integer | Yes | null | Calculated server/client value |
| staff_admin_id | uuid | Yes | null | FK to `admin_users.id` for staff QR check-in |
| idempotency_key | text | Yes | null | Offline replay safety |
| sync_source | text | No | 'online' | `online`, `offline_replay`, `admin` |
| created_at | timestamptz | No | now() | Insert timestamp |

## qr_scan_events
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| scanner_attendee_id | uuid | Yes | null | FK to attendee who scanned; null for staff scanner |
| scanner_admin_id | uuid | Yes | null | FK to staff/admin scanner |
| scanned_attendee_id | uuid | Yes | null | FK resolved from QR, if valid |
| purpose | text | No | - | `meeting`, `staff_checkin` |
| result | text | No | - | `success`, `duplicate`, `self_scan`, `invalid_qr`, `not_found`, `already_checked_in` |
| meeting_id | uuid | Yes | null | FK to `meetings.id` when a new meeting was created |
| check_in_id | uuid | Yes | null | FK to `check_ins.id` when staff check-in created |
| qr_payload_version | integer | Yes | null | Parsed QR version |
| idempotency_key | text | Yes | null | Offline replay safety |
| raw_error | text | Yes | null | Debug only; no raw token/PII |
| scanned_at | timestamptz | No | now() | Client/server scan time |
| created_at | timestamptz | No | now() | Insert timestamp |

## meetings
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_a_id | uuid | No | - | Lower UUID of the pair for unordered uniqueness |
| attendee_b_id | uuid | No | - | Higher UUID of the pair for unordered uniqueness |
| initiated_by_attendee_id | uuid | Yes | null | FK to scanner attendee, if attendee-created |
| first_scan_event_id | uuid | Yes | null | FK to first successful `qr_scan_events.id` |
| met_at | timestamptz | No | now() | Meeting time |
| idempotency_key | text | Yes | null | Offline replay safety |
| created_at | timestamptz | No | now() | Insert timestamp |
| deleted_at | timestamptz | Yes | null | Rare admin correction only; excludes from leaderboard |

## bookmarks
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_id | uuid | No | - | FK to bookmarking attendee |
| target_attendee_id | uuid | No | - | FK to attendee they want to meet |
| idempotency_key | text | Yes | null | Offline replay safety |
| created_at | timestamptz | No | now() | Bookmark timestamp |
| deleted_at | timestamptz | Yes | null | Soft delete enables undo/history |

## connection_notes
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_id | uuid | No | - | FK to note owner |
| target_attendee_id | uuid | No | - | FK to note subject |
| note | text | No | - | Private note; app should enforce length |
| idempotency_key | text | Yes | null | Offline replay safety |
| created_at | timestamptz | No | now() | Audit timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |
| deleted_at | timestamptz | Yes | null | Soft delete if user removes note |

## match_suggestions
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_id | uuid | No | - | FK to attendee receiving suggestion |
| target_attendee_id | uuid | No | - | FK to suggested attendee |
| rank | integer | No | - | 1-based rank for display |
| score | numeric(8,3) | No | 0 | Rule-based score snapshot |
| reason | text | No | - | One-line reason, including chapter relationship when applicable |
| algorithm_version | text | No | 'rules_v1' | Matching engine version |
| computed_at | timestamptz | No | now() | Cache generation timestamp |
| expires_at | timestamptz | Yes | null | Optional cache expiry |

## feed_posts
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_id | uuid | No | - | FK to creator |
| media_asset_id | uuid | No | - | FK to processed display image |
| original_media_asset_id | uuid | Yes | null | FK to original image if retained |
| caption | text | Yes | null | Max 200 chars in app |
| status | text | No | 'published' | `pending_upload`, `processing`, `published`, `failed`, `removed` |
| idempotency_key | text | Yes | null | Offline upload replay safety |
| created_at | timestamptz | No | now() | Post timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |
| deleted_at | timestamptz | Yes | null | Soft delete for self/admin removal |
| deleted_by_attendee_id | uuid | Yes | null | FK for self-delete |
| deleted_by_admin_id | uuid | Yes | null | FK for moderation |
| delete_reason | text | Yes | null | Optional moderation note |

## feed_likes
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| post_id | uuid | No | - | FK to `feed_posts.id` |
| attendee_id | uuid | No | - | FK to liker |
| idempotency_key | text | Yes | null | Offline replay safety |
| created_at | timestamptz | No | now() | Like timestamp |
| deleted_at | timestamptz | Yes | null | Soft delete for unlike |

## feed_comments
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| post_id | uuid | No | - | FK to `feed_posts.id` |
| attendee_id | uuid | No | - | FK to commenter |
| comment | text | No | - | Flat comments only; app should enforce length |
| idempotency_key | text | Yes | null | Offline replay safety |
| created_at | timestamptz | No | now() | Comment timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |
| deleted_at | timestamptz | Yes | null | Soft delete for self/admin removal |
| deleted_by_attendee_id | uuid | Yes | null | FK for self-delete |
| deleted_by_admin_id | uuid | Yes | null | FK for moderation |

## feedback_responses
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_id | uuid | No | - | FK to attendee |
| rating | integer | No | - | 1 to 5 |
| comment | text | Yes | null | Optional, max 500 chars in app |
| idempotency_key | text | Yes | null | Offline/retry safety |
| submitted_at | timestamptz | No | now() | Feedback submission time |
| created_at | timestamptz | No | now() | Insert timestamp |
| updated_at | timestamptz | No | now() | Allows latest-response-wins updates if desired |
| deleted_at | timestamptz | Yes | null | Soft delete for privacy/moderation |

## export_jobs
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| requested_by_attendee_id | uuid | Yes | null | FK for attendee connection exports |
| requested_by_admin_id | uuid | Yes | null | FK for admin exports/badges |
| kind | text | No | - | `connections_csv`, `connections_vcard`, `feedback_csv`, `analytics_csv`, `analytics_pdf`, `badges_pdf` |
| status | text | No | 'queued' | `queued`, `processing`, `completed`, `failed`, `expired` |
| parameters | jsonb | No | '{}' | Filters/options, e.g. selected attendee IDs for badges |
| result_media_id | uuid | Yes | null | FK to `media_assets.id` |
| error_message | text | Yes | null | Failure reason |
| created_at | timestamptz | No | now() | Request timestamp |
| started_at | timestamptz | Yes | null | Job start |
| completed_at | timestamptz | Yes | null | Job completion |
| expires_at | timestamptz | Yes | null | Temporary export retention |

## analytics_snapshots
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| snapshot_type | text | No | - | `dashboard`, `leaderboard`, `checkin_timeline`, `meeting_timeline` |
| data | jsonb | No | - | Cached aggregate output |
| computed_at | timestamptz | No | now() | Snapshot time |
| expires_at | timestamptz | Yes | null | Cache expiry |

## attendee_event_summaries
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_id | uuid | No | - | FK to `attendees.id` |
| people_met_count | integer | No | 0 | Count from `meetings` |
| cards_collected_count | integer | No | 0 | Usually same as people met for v1 |
| leaderboard_rank | integer | Yes | null | Cached rank after event end |
| top_connections | jsonb | No | '[]' | Top 5 connection snapshot for fast summary display |
| data | jsonb | No | '{}' | Extra generated summary data |
| generated_at | timestamptz | No | now() | Summary generation timestamp |
| created_at | timestamptz | No | now() | Audit timestamp |
| updated_at | timestamptz | No | now() | Audit timestamp |

## client_sync_operations
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | FK to `events.id` |
| attendee_id | uuid | Yes | null | FK to attendee that replayed a write |
| operation_type | text | No | - | `check_in`, `meeting_scan`, `bookmark`, `note`, `feed_post`, `feed_like`, `feed_comment`, `feedback` |
| idempotency_key | text | No | - | Unique per event/attendee/operation |
| request_hash | text | Yes | null | Detect conflicting replay payloads |
| status | text | No | 'processed' | `processed`, `duplicate`, `conflict`, `failed` |
| response_summary | jsonb | No | '{}' | Small safe response/debug summary |
| created_at | timestamptz | No | now() | Insert timestamp |

## admin_audit_logs
| Field | Type | Nullable | Default | Notes |
|---|---|---:|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | Yes | null | FK to `events.id` when event-specific |
| admin_user_id | uuid | Yes | null | FK to `admin_users.id` |
| action | text | No | - | Example: `import_attendees`, `delete_feed_post`, `resend_magic_link`, `update_event_settings` |
| target_type | text | Yes | null | Table/entity name |
| target_id | uuid | Yes | null | Target row ID when available |
| metadata | jsonb | No | '{}' | Safe audit details |
| ip_address | inet | Yes | null | Security audit |
| user_agent | text | Yes | null | Security audit |
| created_at | timestamptz | No | now() | Append-only audit timestamp |

---

## Relationships and Foreign Keys

- `attendees.event_id -> events.id`
- `attendees.chapter_id -> chapters.id` with `ON DELETE SET NULL`
- `attendees.photo_media_id -> media_assets.id` with `ON DELETE SET NULL`
- `attendees.city_option_id -> city_options.id` with `ON DELETE SET NULL`
- `attendees.business_category_option_id -> business_category_options.id` with `ON DELETE SET NULL`
- `attendees.import_batch_id -> import_batches.id` with `ON DELETE SET NULL`
- `attendees.import_row_id -> import_rows.id` with `ON DELETE SET NULL`
- `attendee_looking_for_tags.event_id -> events.id` with `ON DELETE CASCADE`
- `attendee_looking_for_tags.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `attendee_looking_for_tags.business_tag_option_id -> business_tag_options.id` with `ON DELETE RESTRICT`
- `attendee_offering_tags.event_id -> events.id` with `ON DELETE CASCADE`
- `attendee_offering_tags.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `attendee_offering_tags.business_tag_option_id -> business_tag_options.id` with `ON DELETE RESTRICT`
- `attendee_goal_selections.event_id -> events.id` with `ON DELETE CASCADE`
- `attendee_goal_selections.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `attendee_goal_selections.goal_option_id -> goal_options.id` with `ON DELETE RESTRICT`
- `feature_flags.event_id -> events.id` with `ON DELETE CASCADE`
- `sessions.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `sessions.admin_user_id -> admin_users.id` with `ON DELETE CASCADE`
- `sessions.event_id -> events.id` with `ON DELETE CASCADE`
- `magic_link_tokens.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `magic_link_tokens.event_id -> events.id` with `ON DELETE CASCADE`
- `email_delivery_logs.event_id -> events.id` with `ON DELETE SET NULL`
- `email_delivery_logs.attendee_id -> attendees.id` with `ON DELETE SET NULL`
- `email_delivery_logs.admin_user_id -> admin_users.id` with `ON DELETE SET NULL`
- `import_batches.event_id -> events.id` with `ON DELETE CASCADE`
- `import_batches.file_media_id -> media_assets.id` with `ON DELETE SET NULL`
- `import_batches.uploaded_by_admin_id -> admin_users.id` with `ON DELETE SET NULL`
- `import_rows.import_batch_id -> import_batches.id` with `ON DELETE CASCADE`
- `import_rows.event_id -> events.id` with `ON DELETE CASCADE`
- `import_rows.attendee_id -> attendees.id` with `ON DELETE SET NULL`
- `import_rows.mapped_city_option_id -> city_options.id` with `ON DELETE SET NULL`
- `import_rows.mapped_business_category_option_id -> business_category_options.id` with `ON DELETE SET NULL`
- `import_rows.mapped_chapter_id -> chapters.id` with `ON DELETE SET NULL`
- `media_assets.event_id -> events.id` with `ON DELETE CASCADE`
- `media_assets.owner_attendee_id -> attendees.id` with `ON DELETE SET NULL`
- `media_assets.uploaded_by_admin_id -> admin_users.id` with `ON DELETE SET NULL`
- `check_ins.event_id -> events.id` with `ON DELETE CASCADE`
- `check_ins.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `check_ins.staff_admin_id -> admin_users.id` with `ON DELETE SET NULL`
- `qr_scan_events.event_id -> events.id` with `ON DELETE CASCADE`
- `qr_scan_events.scanner_attendee_id -> attendees.id` with `ON DELETE SET NULL`
- `qr_scan_events.scanner_admin_id -> admin_users.id` with `ON DELETE SET NULL`
- `qr_scan_events.scanned_attendee_id -> attendees.id` with `ON DELETE SET NULL`
- `qr_scan_events.meeting_id -> meetings.id` with `ON DELETE SET NULL`
- `qr_scan_events.check_in_id -> check_ins.id` with `ON DELETE SET NULL`
- `meetings.event_id -> events.id` with `ON DELETE CASCADE`
- `meetings.attendee_a_id -> attendees.id` with `ON DELETE CASCADE`
- `meetings.attendee_b_id -> attendees.id` with `ON DELETE CASCADE`
- `meetings.initiated_by_attendee_id -> attendees.id` with `ON DELETE SET NULL`
- `bookmarks.event_id -> events.id` with `ON DELETE CASCADE`
- `bookmarks.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `bookmarks.target_attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `connection_notes.event_id -> events.id` with `ON DELETE CASCADE`
- `connection_notes.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `connection_notes.target_attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `match_suggestions.event_id -> events.id` with `ON DELETE CASCADE`
- `match_suggestions.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `match_suggestions.target_attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `feed_posts.event_id -> events.id` with `ON DELETE CASCADE`
- `feed_posts.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `feed_posts.media_asset_id -> media_assets.id` with `ON DELETE RESTRICT`
- `feed_posts.original_media_asset_id -> media_assets.id` with `ON DELETE SET NULL`
- `feed_posts.deleted_by_attendee_id -> attendees.id` with `ON DELETE SET NULL`
- `feed_posts.deleted_by_admin_id -> admin_users.id` with `ON DELETE SET NULL`
- `feed_likes.event_id -> events.id` with `ON DELETE CASCADE`
- `feed_likes.post_id -> feed_posts.id` with `ON DELETE CASCADE`
- `feed_likes.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `feed_comments.event_id -> events.id` with `ON DELETE CASCADE`
- `feed_comments.post_id -> feed_posts.id` with `ON DELETE CASCADE`
- `feed_comments.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `feed_comments.deleted_by_attendee_id -> attendees.id` with `ON DELETE SET NULL`
- `feed_comments.deleted_by_admin_id -> admin_users.id` with `ON DELETE SET NULL`
- `feedback_responses.event_id -> events.id` with `ON DELETE CASCADE`
- `feedback_responses.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `export_jobs.event_id -> events.id` with `ON DELETE CASCADE`
- `export_jobs.requested_by_attendee_id -> attendees.id` with `ON DELETE SET NULL`
- `export_jobs.requested_by_admin_id -> admin_users.id` with `ON DELETE SET NULL`
- `export_jobs.result_media_id -> media_assets.id` with `ON DELETE SET NULL`
- `analytics_snapshots.event_id -> events.id` with `ON DELETE CASCADE`
- `attendee_event_summaries.event_id -> events.id` with `ON DELETE CASCADE`
- `attendee_event_summaries.attendee_id -> attendees.id` with `ON DELETE CASCADE`
- `client_sync_operations.event_id -> events.id` with `ON DELETE CASCADE`
- `client_sync_operations.attendee_id -> attendees.id` with `ON DELETE SET NULL`
- `admin_audit_logs.event_id -> events.id` with `ON DELETE SET NULL`
- `admin_audit_logs.admin_user_id -> admin_users.id` with `ON DELETE SET NULL`

Relationship rules:
- Meeting uniqueness is enforced on unordered pairs: store the smaller UUID in `attendee_a_id` and larger UUID in `attendee_b_id`; reject `attendee_a_id = attendee_b_id`.
- Duplicate QR scans are logged in `qr_scan_events` with `result = 'duplicate'`, but do not create a second `meetings` row.
- A contact appears in "My Connections" if there is a `meetings` row involving the attendee, a live `bookmarks` row, or a `connection_notes` row.
- Feed likes use soft delete for unlike so repeat likes are idempotent and engagement history remains auditable.

---

## Indexes for Performance

Recommended indexes and constraints:

- `events(slug)` unique where `deleted_at is null`
- `chapters(normalized_name)` unique where `deleted_at is null`
- `chapters(is_active, sort_order, name)`
- `business_category_options(normalized_name)` unique
- `business_category_options(is_active, sort_order, name)`
- `business_tag_options(normalized_name)` unique
- `business_tag_options(is_active, sort_order, name)`
- `goal_options(normalized_name)` unique
- `goal_options(is_active, sort_order, name)`
- `city_options(normalized_display_name)` unique
- `city_options(normalized_name, state_or_ut)` unique
- `city_options(is_active, state_or_ut, name)` for city picker
- `city_options using gin(to_tsvector('simple', display_name))` for typeahead search if needed
- `attendees(event_id, email)` unique where `deleted_at is null`
- `attendees(event_id, phone)` unique where `deleted_at is null`
- `attendees(event_id, qr_token_hash)` unique where `deleted_at is null`
- `attendees(event_id, profile_completed_at)`
- `attendees(event_id, business_category_option_id)`
- `attendees(event_id, chapter_id)`
- `attendees(event_id, city_option_id)`
- `attendees(event_id, table_number)`
- `attendees using gin(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(business_name,'')))` for directory search
- `attendee_looking_for_tags(event_id, attendee_id, business_tag_option_id)` unique
- `attendee_looking_for_tags(event_id, business_tag_option_id)`
- `attendee_offering_tags(event_id, attendee_id, business_tag_option_id)` unique
- `attendee_offering_tags(event_id, business_tag_option_id)`
- `attendee_goal_selections(event_id, attendee_id, goal_option_id)` unique
- `attendee_goal_selections(event_id, goal_option_id)`
- `admin_users(email)` unique where `deleted_at is null`
- `feature_flags(event_id, key)` unique
- `feature_flags(key)` where `event_id is null`
- `sessions(token_hash)` unique
- `sessions(actor_type, attendee_id, expires_at)`
- `sessions(actor_type, admin_user_id, expires_at)`
- `magic_link_tokens(token_hash)` unique
- `magic_link_tokens(attendee_id, created_at desc)`
- `magic_link_tokens(requested_email, created_at desc)` for rate limiting and support
- `email_delivery_logs(event_id, purpose, created_at desc)`
- `email_delivery_logs(recipient_email, created_at desc)`
- `email_delivery_logs(status, created_at desc)`
- `rate_limit_events(scope, key_hash, window_ends_at)`
- `import_batches(event_id, created_at desc)`
- `import_rows(import_batch_id, row_number)` unique
- `import_rows(event_id, status)`
- `import_rows(event_id, mapped_city_option_id)`
- `import_rows(event_id, mapped_business_category_option_id)`
- `media_assets(event_id, kind, created_at desc)`
- `media_assets(object_key)` unique
- `check_ins(event_id, attendee_id)` unique
- `check_ins(event_id, checked_in_at desc)`
- `check_ins(event_id, method)`
- `check_ins(event_id, idempotency_key)` unique where `idempotency_key is not null`
- `qr_scan_events(event_id, scanner_attendee_id, scanned_at desc)`
- `qr_scan_events(event_id, scanned_attendee_id, scanned_at desc)`
- `qr_scan_events(event_id, result, scanned_at desc)`
- `qr_scan_events(event_id, idempotency_key)` unique where `idempotency_key is not null`
- `meetings(event_id, attendee_a_id, attendee_b_id)` unique where `deleted_at is null`
- `meetings(event_id, attendee_a_id, met_at desc)`
- `meetings(event_id, attendee_b_id, met_at desc)`
- `meetings(event_id, met_at desc)` for admin timelines
- `bookmarks(event_id, attendee_id, target_attendee_id)` unique where `deleted_at is null`
- `bookmarks(event_id, attendee_id, created_at desc)` where `deleted_at is null`
- `connection_notes(event_id, attendee_id, target_attendee_id)` unique where `deleted_at is null`
- `match_suggestions(event_id, attendee_id, rank)` unique
- `match_suggestions(event_id, attendee_id, score desc)`
- `feed_posts(event_id, created_at desc)` where `deleted_at is null and status = 'published'`
- `feed_posts(event_id, attendee_id, created_at desc)`
- `feed_likes(post_id, attendee_id)` unique where `deleted_at is null`
- `feed_likes(post_id, created_at desc)` where `deleted_at is null`
- `feed_comments(post_id, created_at asc)` where `deleted_at is null`
- `feedback_responses(event_id, attendee_id)` unique where `deleted_at is null` if "latest response wins"; otherwise unique always
- `feedback_responses(event_id, rating)`
- `feedback_responses(event_id, submitted_at desc)`
- `export_jobs(event_id, requested_by_attendee_id, created_at desc)`
- `export_jobs(event_id, requested_by_admin_id, created_at desc)`
- `analytics_snapshots(event_id, snapshot_type, computed_at desc)`
- `attendee_event_summaries(event_id, attendee_id)` unique
- `attendee_event_summaries(event_id, leaderboard_rank)`
- `client_sync_operations(event_id, attendee_id, operation_type, idempotency_key)` unique
- `admin_audit_logs(event_id, created_at desc)`
- `admin_audit_logs(admin_user_id, created_at desc)`

Leaderboard query:
- Source of truth is `meetings`.
- Count meetings where `deleted_at is null` and attendee appears in either pair column.
- For 200 attendees, a live aggregate is fine. If needed, cache top 20 in `analytics_snapshots` every 5-10 seconds during event hours.

---

## Soft Delete vs Hard Delete

| Entity | Policy | Reason |
|---|---|---|
| events | Soft delete | Avoid accidental loss; preserve operational history |
| chapters | Deactivate first, soft delete only for cleanup | Preserve attendee history and import traceability |
| business_category_options | Do not delete; deactivate with `is_active=false` | Old profile data/imported legacy values may reference previous options |
| business_tag_options | Do not delete; deactivate with `is_active=false` | Old profile tags and match history remain understandable |
| goal_options | Do not delete; deactivate with `is_active=false` | Old profile goals remain understandable |
| city_options | Do not delete; deactivate with `is_active=false` | Old profile/import city labels remain understandable |
| attendees | Soft delete | Privacy/removal requests should hide attendee while preserving aggregate/audit paths until retention cleanup |
| attendee_looking_for_tags | Hard delete/reinsert on profile save | Current profile selection state; history not required |
| attendee_offering_tags | Hard delete/reinsert on profile save | Current profile selection state; history not required |
| attendee_goal_selections | Hard delete/reinsert on profile save | Current profile selection state; history not required |
| admin_users | Soft delete/deactivate | Preserve admin audit trail |
| feature_flags | Hard delete or disable | Configuration; not attendee data |
| sessions | Hard delete after expiry/retention | Security cleanup; source value expires |
| magic_link_tokens | Hard delete after expiry/retention | Security cleanup; no long-term value |
| email_delivery_logs | Hard delete after operational retention | Useful for deliverability support, but should not keep mail metadata forever |
| rate_limit_events | Hard delete after retention window | Operational temporary data |
| import_batches | Keep during event/post-event retention; hard delete with event archive if approved | Needed for import audit/debugging |
| import_rows | Keep during event/post-event retention; hard delete with event archive if approved | Needed for row-level troubleshooting |
| media_assets | Soft delete first, then object cleanup job | Feed/admin UI must hide immediately; storage can lag safely |
| check_ins | Append-only; no normal delete | Attendance analytics source of truth |
| qr_scan_events | Append-only; hard delete only after retention | Security/offline duplicate diagnostics |
| meetings | Soft delete only for admin correction | Leaderboard and summaries should exclude corrected rows without losing audit |
| bookmarks | Soft delete | Supports unbookmark/undo/offline idempotency |
| connection_notes | Soft delete | User can remove notes; avoid accidental hard loss |
| match_suggestions | Hard delete/recompute | Cache, not source of truth |
| feed_posts | Soft delete | Required for self-delete/admin moderation history |
| feed_likes | Soft delete on unlike | Idempotent like/unlike behavior |
| feed_comments | Soft delete | Moderation and self-delete history |
| feedback_responses | Soft delete | Privacy/moderation; analytics can exclude deleted rows |
| export_jobs | Hard delete after file expiry/retention | Generated artifacts are temporary |
| analytics_snapshots | Hard delete/recompute | Cache only |
| attendee_event_summaries | Hard delete/recompute | Post-event cache over source tables |
| client_sync_operations | Hard delete after diagnostics retention | Operational log |
| admin_audit_logs | Append-only; no delete except legal retention purge | Accountability |

---

## Seed Data Requirements

Minimum required seeds for local/staging:
- One pilot `events` row with name, slug, start/end time, feedback prompt time, and default radius.
- Business categories in `business_category_options`: `Manufacturer`, `Trader / Distributor`, `Service Provider`, `Retailer`, `Professional (CA, Lawyer, Consultant...)`, `Startup / Founder`, `Other`, plus any final organizer-approved categories.
- Business tag examples in `business_tag_options`: `Real Estate Builders`, `Interior Designer`, `Digital Marketing`, plus the final organizer-provided shared looking-for/offering reference set before profile launch.
- Goal examples in `goal_options`: `Find customers`, `Find suppliers`, `Find partners`, `Explore collaborations`, `Learn from peers`.
- Nationwide Indian city catalogue in `city_options`, displayed as `City, State/UT`; preserve imported unknown city values as `Legacy / Imported` options rather than silently dropping them.
- Feature flags in `feature_flags` for the authenticated drawer destinations: `home`, `people_to_meet`, `directory`, `connections`, `leaderboard`, `profile`, `show_qr`, plus contextual flags for `feed`, `feedback`, and `summary`.
- Admin users:
  - One `organizer` account for the event owner.
  - One `staff` account for check-in testing.
  - Optional `viewer` account for venue display/stakeholder review.
- Chapters can be seeded from the attendee import distinct values. Optionally preload known RMB chapter names if the organizer provides a canonical list.
- Staging should seed 20-30 realistic test attendees with varied categories, chapters, tags, table numbers, and profile completion states.
- Local development should seed a very small dataset with:
  - A completed attendee.
  - An incomplete attendee.
  - A checked-in attendee.
  - A meeting pair.
  - A bookmark.
  - A feed post with like/comment.
  - A feedback response.

Production seed rules:
- Do not seed fake attendees in production.
- Create only the production event, reference data, admin users, and any known chapters before final import.
- Seed production reference data before opening profile setup; attendees cannot complete onboarding without active category, city, tag, and goal options.
- Run final attendee import only after staging rehearsal passes with the real Google Form export shape.

---

## Migration Strategy

Use Prisma Migrate with PostgreSQL SQL migrations.

Environment rules:
- Local: run migrations freely against Docker Postgres.
- Staging: run every migration before production; test import, auth, QR, check-in, feed, exports, and rollback plan.
- Production: run migrations from CI/CD or a controlled terminal using `DIRECT_URL`; API runtime uses pooled `DATABASE_URL`.

Recommended rollout:
1. Keep existing tables while introducing event-scoped columns and new tables.
2. Enable required PostgreSQL extensions: `pgcrypto` for `gen_random_uuid()` and `citext` for case-insensitive email.
3. Add/keep the pilot `events` row and backfill existing rows to it.
4. Backfill existing `Attendee` rows with `event_id`, then convert global attendee uniqueness to `(event_id, email)` and `(event_id, phone)`.
5. Keep existing `BusinessCategoryOption`, `CityOption`, and `Chapter` data, then migrate/map them to the target `business_category_options`, `city_options`, and `chapters` shape if physical snake_case renames are adopted.
6. Add missing reference tables for `business_tag_options` and `goal_options`, then migrate existing attendee `lookingFor`, `offering`, and `goals` arrays into join tables.
7. Rename/map Prisma models to snake_case physical tables using `@@map`/`@map` or perform explicit table renames in SQL.
8. Add source-of-truth operational tables in dependency order: auth/session, feature flags, media, scan events, meetings, bookmarks/notes, match cache, feed, feedback, exports, analytics snapshots, audit logs.
9. Add indexes after bulk backfills where possible to keep migrations fast.
10. Use expand/contract migrations for breaking changes:
   - Expand: add nullable/new column or table.
   - Backfill.
   - Deploy app reading both old/new if needed.
   - Contract: make non-null/drop old field in a later migration.
11. Never drop production data in the same migration that introduces replacement columns unless the backfill has already been verified.
12. Before final production import and before event day, take a managed Supabase backup.

Current repo alignment:
- The current Prisma schema already has `Chapter`, `BusinessCategoryOption`, `CityOption`, `Attendee`, `Event`, `CheckIn`, `MagicLinkToken`, `OnboardingToken`, `ImportBatch`, and `ImportRow`.
- The current schema already removed the old `industry` field, added `city`, `businessCategory`, `tableNumber`, event settings, check-ins, and initial dropdown reference data.
- This spec expands that foundation to include event-scoped attendee uniqueness, normalized profile tag/goal joins, full operational event-day tables, Supabase Storage metadata, feature flags, and audit/sync tables.
- `OnboardingToken` is not part of the target schema because the current product docs specify a generic group link plus email magic-link login only. Once no code path depends on it, migrate any useful audit data and drop the table.

Migration safety checks:
- Verify no duplicate `(event_id, lower(email))` or `(event_id, phone)` before adding unique indexes.
- Verify every attendee has a `qr_token_hash`.
- Verify every completed profile has active or preserved-legacy city/category references and migrated looking-for/offering/goal selections.
- Verify `attendee_a_id < attendee_b_id` ordering before adding meeting uniqueness.
- Verify feed/media rows hide deleted records through `deleted_at` filters.
- Verify leaderboard counts exclude soft-deleted meetings.
