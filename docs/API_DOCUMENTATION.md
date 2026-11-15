# API DOCUMENTATION

Base URL (local): `http://localhost:4000/api`

## Conventions

- Content type: `application/json` for all request bodies.
- Authentication: `Authorization: Bearer <jwt>` (HS256, issuer `grama-sahay`, audience `grama-sahay-app`, 12h default).
- Success responses return the named payload object(s) directly.
- Error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are invalid or missing.",
    "details": { "fields": [{ "path": "email", "message": "Enter a valid email address." }] }
  }
}
```

Common codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `CONFLICT` (409), `PAYLOAD_TOO_LARGE` (413), `RATE_LIMITED` (429),
`INTERNAL_ERROR` (500). Rate-limit headers follow `draft-7` (`RateLimit-*`).

Roles: `CITIZEN`, `VILLAGE_FACILITATOR`, `SCHEME_VERIFIER`, `ADMIN`, `SUPER_ADMIN`.

## Public

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service + database health. Returns 503 if the database is unreachable. |
| GET | `/meta` | Service metadata: languages, roles, scheme statuses, levels. |
| GET | `/auth/roles` | List role identifiers. |
| GET | `/categories` | Active scheme categories with live published-scheme counts. |
| GET | `/schemes` | Published scheme search/filter/sort with pagination. |
| GET | `/schemes/compare` | 2–3 published schemes side by side. |
| GET | `/schemes/:slug` | Published scheme detail; increments the view counter. |
| GET | `/schemes/:slug/related` | Other published schemes in the same category. |

### GET /categories

Query: `language=kn|en|hi` (default `kn`).

```json
{
  "language": "kn",
  "categories": [
    { "slug": "agriculture", "name": "ಕೃಷಿ", "nameEn": "Agriculture", "nameKn": "ಕೃಷಿ", "nameHi": "कृषि", "icon": "…", "schemeCount": 3 }
  ]
}
```

`schemeCount` counts only `PUBLISHED` schemes; inactive categories are omitted.

### GET /schemes

Query parameters:

| Name | Values | Notes |
|---|---|---|
| `page` | integer ≥ 1 | Default 1 |
| `pageSize` | 1–50 | Default 12 |
| `q` | ≤120 chars | Searches English/Kannada/Hindi titles, English summary and department |
| `category` | category slug | Exact category slug |
| `department` | text | Substring match |
| `level` | `CENTRAL`, `STATE` | Scheme level |
| `state` | text | Exact state; seeded schemes use `Karnataka` |
| `sort` | `newest`, `popular`, `deadline`, `title` | Default `newest`; `deadline` returns only future deadlines |
| `language` | `kn`, `en`, `hi` | Default `kn` |

Only `PUBLISHED` schemes are returned. Response:

```json
{
  "schemes": [
    {
      "id": "…", "slug": "pm-kisan", "title": "ಪಿಎಂ ಕಿಸಾನ್", "summary": "…",
      "benefits": "…", "eligibility": "…", "department": "…", "level": "CENTRAL",
      "state": "Karnataka", "status": "PUBLISHED", "isDemoData": true,
      "applicationDeadline": null, "officialUrl": "https://…",
      "lastVerifiedAt": "…", "publishedAt": "…", "views": 12, "version": 1,
      "category": { "slug": "agriculture", "name": "ಕೃಷಿ", "icon": null },
      "language": "kn", "availableLanguages": ["en", "kn"], "fallbacks": []
    }
  ],
  "pagination": { "page": 1, "pageSize": 12, "total": 10, "totalPages": 1 },
  "filters": { "q": null, "category": null, "department": null, "level": null, "state": null, "sort": "newest", "language": "kn" }
}
```

Localization: Kannada is the default. When a requested field is unavailable in the requested
language, the API returns the English value and lists the field name in `fallbacks` (e.g.
`["title", "summary"]`). Nothing is machine-translated at request time. `availableLanguages`
reports which languages have stored content.

### GET /schemes/compare

Query: `slugs=slug-a,slug-b[,slug-c]` (comma separated, 2–3 unique slugs) and optional `language`.

- Non-published or unknown slugs are omitted and listed in `missingSlugs`.
- Returns `400` if fewer than 2 or more than 3 slugs are supplied.
- Each entry is a list summary plus `requiredDocuments`.

### GET /schemes/:slug

Query: `language=kn|en|hi`.

Returns a list summary plus `description`, `applicationProcess`, `requiredDocuments`,
`notificationNumber`, dates, `source`, parsed `eligibilityRules` (`field`, `operator`, `value`,
localized `description`), `documents` and available translation qualities. `404` if the scheme is
not published. Every successful call increments `views` by one.

### GET /schemes/:slug/related

Query: `limit` (1–8, default 4), `language`. Same-category published schemes ordered by views.

### GET /schemes/:slug/eligibility

**Auth: Bearer required.** Evaluates the published scheme's eligibility rules against the caller's
own citizen profile. Query: `language=kn|en|hi` (default `kn`). Never evaluates unpublished schemes
(`404`).

```json
{
  "scheme": { "slug": "pm-kisan", "title": "…", "…": "…" },
  "profile": { "hasProfile": true, "onboardingCompleted": true },
  "eligibility": {
    "assessment": "NEEDS_INFORMATION",
    "label": "ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಅಗತ್ಯ",
    "likelyEligible": false,
    "counts": { "total": 3, "required": 3, "optional": 0, "met": 2, "notMet": 0, "unknown": 1 },
    "missingProfileFields": ["annualIncome"],
    "disclaimer": "ಇದು ಕೇವಲ ಮಾಹಿತಿಗಾಗಿ ನೀಡುವ ಅಂದಾಜು; …",
    "language": "kn",
    "rules": [
      {
        "field": "age",
        "operator": "GTE",
        "required": true,
        "status": "MET",
        "reason": "MATCH",
        "expected": 18,
        "actual": 31,
        "description": "ಅರ್ಜಿದಾರರಿಗೆ 18 ವರ್ಷ ಅಥವಾ ಹೆಚ್ಚು ವಯಸ್ಸು",
        "descriptionLanguage": "kn",
        "sortOrder": 0
      },
      {
        "field": "annualIncome",
        "operator": "LTE",
        "required": true,
        "status": "UNKNOWN",
        "reason": "MISSING_PROFILE_DATA",
        "expected": 300000,
        "actual": null,
        "description": "…",
        "descriptionLanguage": "kn",
        "sortOrder": 1
      }
    ]
  }
}
```

Assessments:

| Value | Meaning |
|---|---|
| `LIKELY_ELIGIBLE` | Every required rule is met. Informational only — not an approval. |
| `NOT_ELIGIBLE` | At least one required rule is not met. |
| `NEEDS_INFORMATION` | No required rule failed, but some required data is missing or a rule/value type is invalid. |
| `NOT_ASSESSABLE` | The scheme has no required machine-readable rules; read the official guidelines. |

Rule statuses are `MET`, `NOT_MET` or `UNKNOWN`; reasons are `MATCH`, `MISMATCH`,
`MISSING_PROFILE_DATA`, `INVALID_RULE` or `INCOMPATIBLE_VALUE`. Optional rules are reported but never
block eligibility. The `actual` value is the caller's own profile-derived value (age is derived from
`dateOfBirth`); it is never exposed to other users.

Supported profile fields (`/api/meta` → `eligibilityFields`): `age`, `annualIncome`, `occupation`,
`gender`, `education`, `landHoldingAcres`, `socialCategory`, `disabilityStatus`, `state`, `district`,
`familySize`. Custom fields may be supplied via `CitizenProfile.profileJson`; explicit columns take
precedence. Operators: `GTE`, `LTE`, `EQ`, `NEQ`, `IN`, `CONTAINS`, `EXISTS` (`EXISTS` means the
profile has a value for the field; missing data is `UNKNOWN`). String comparisons are
case-insensitive; numeric strings are normalised to numbers.

> The API never claims guaranteed eligibility. Every assessment includes a localized disclaimer;
> final decisions rest with the official department.

## Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register a CITIZEN. Creates profile, notification preferences and data-processing consent. |
| POST | `/auth/register/staff` | — | Register staff/admin using an invite code. |
| POST | `/auth/login` | — | Email + password; returns JWT, user and profile. |
| GET | `/auth/me` | Bearer | Current user, profile, notification preferences, consents. |
| POST | `/auth/logout` | Bearer | Records an audit entry. Stateless token; client discards it. |

### POST /auth/register

```json
{
  "fullName": "Lakshmi Devi",
  "email": "lakshmi@example.com",
  "phone": "+91 98450 12345",
  "password": "Farmer1234",
  "preferredLanguage": "kn"
}
```

Validation: name 2–120 chars; valid email; optional phone (8–20 chars, `+`, digits, spaces, `-`);
password 8–72 chars with at least one letter and one digit; language `kn|en|hi`.

Response `201`:

```json
{ "token": "<jwt>", "user": { "id": "…", "email": "…", "role": "CITIZEN", "preferredLanguage": "kn", "…": "…" } }
```

The password hash is never returned.

### POST /auth/register/staff

Same fields plus `role` and `inviteCode`.
- `VILLAGE_FACILITATOR` and `SCHEME_VERIFIER` require `STAFF_INVITE_CODE`.
- `ADMIN` requires `ADMIN_INVITE_CODE`.
- `SUPER_ADMIN` cannot be created through the API (seeded / database only).
Response `201` as above.

### POST /auth/login

```json
{ "email": "citizen@gramasahay.local", "password": "ChangeMe!123" }
```

Response `200`: `{ "token": "<jwt>", "user": {…}, "profile": {…} | null }`.

## Citizen (authenticated; own data only)

| Method | Path | Description |
|---|---|---|
| GET | `/citizens/me/profile` | Read own profile. |
| PATCH | `/citizens/me/profile` | Update profile fields (all optional). |
| GET | `/citizens/me/notification-preferences` | Read preferences (creates defaults on first call). |
| PATCH | `/citizens/me/notification-preferences` | Update channels, categories, districts, quiet hours. |
| GET | `/citizens/me/consents` | List consent records. |
| PUT | `/citizens/me/consents` | Upsert consents (`DATA_PROCESSING`, `NOTIFICATIONS_SMS`, `NOTIFICATIONS_WHATSAPP`, `ANALYTICS`). |
| GET | `/citizens/me/saved-schemes` | List saved schemes (newest first) with `savedAt`; query `language`. |
| POST | `/citizens/me/saved-schemes` | Save a published scheme. Body: `{ "slug": "pm-kisan" }`. Idempotent: repeat calls return `200` with `alreadySaved: true`. |
| DELETE | `/citizens/me/saved-schemes/:slug` | Remove a saved scheme. `404` if it was not saved. |
| GET | `/citizens/me/eligible-schemes` | Ranked published schemes evaluated against the caller's profile. Query: `page`, `pageSize` (≤50), `filter`, `language`. |

Profile fields (all optional, nullable where noted): `dateOfBirth` (ISO date, not future),
`gender` (`MALE|FEMALE|OTHER|PREFER_NOT_TO_SAY`), `state`, `district`, `taluk`, `village`,
`gramPanchayat`, `occupation`, `annualIncome` (0–100,000,000), `education`,
`landHoldingAcres` (0–10,000), `familySize` (1–50), `disabilityStatus`,
`socialCategory` (`GENERAL|OBC|SC|ST|EWS|MINORITY`), `aadhaarLast4` (exactly 4 digits),
`profileJson` (object), `onboardingCompleted` (boolean).

> Aadhaar: only the last four digits may be stored. Never send a full Aadhaar number or banking credentials.

### GET /citizens/me/eligible-schemes

Evaluates every `PUBLISHED` scheme against the caller's profile. `filter` is one of
`LIKELY_ELIGIBLE` (default), `NEEDS_INFORMATION`, `NOT_ELIGIBLE`, `NOT_ASSESSABLE` or `ALL`.
Results are ranked likely eligible → needs information → not assessable → not eligible, then by
newest publication. Only list summaries are returned (no per-rule details); call
`/schemes/:slug/eligibility` for explanations.

```json
{
  "language": "kn",
  "filter": "LIKELY_ELIGIBLE",
  "profile": { "hasProfile": true, "onboardingCompleted": true, "missingFields": ["district"] },
  "summary": {
    "totalPublished": 12,
    "countsByAssessment": { "LIKELY_ELIGIBLE": 3, "NEEDS_INFORMATION": 6, "NOT_ELIGIBLE": 2, "NOT_ASSESSABLE": 1 }
  },
  "schemes": [
    {
      "slug": "pm-kisan", "title": "…", "…": "…",
      "eligibility": {
        "assessment": "LIKELY_ELIGIBLE", "label": "ಸಂಭಾವ್ಯ ಅರ್ಹತೆ", "likelyEligible": true,
        "counts": { "total": 3, "required": 3, "optional": 0, "met": 3, "notMet": 0, "unknown": 0 },
        "missingProfileFields": []
      }
    }
  ],
  "pagination": { "page": 1, "pageSize": 12, "total": 3, "totalPages": 1 },
  "disclaimer": "…"
}
```

`profile.missingFields` is the union of required fields missing across all published schemes, so the
client can guide profile completion. A new registration has a profile row (`hasProfile: true`) but
`onboardingCompleted` remains false until the citizen fills it in. Staff accounts without a citizen
profile simply receive `NEEDS_INFORMATION` assessments.

## Admin (ADMIN or SUPER_ADMIN unless noted)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/users` | ADMIN+ | Paginated users. Query: `page`, `pageSize` (≤100), `role`, `q`, `isActive=true|false`. |
| PATCH | `/admin/users/:id/role` | **SUPER_ADMIN** | Change a user's role. Cannot remove the last active super admin. |
| PATCH | `/admin/users/:id/status` | ADMIN+ | Activate/deactivate. Cannot deactivate yourself; super admins can only be modified by a super admin. |
| GET | `/admin/audit-logs` | ADMIN+ | Paginated audit trail. Query: `page`, `pageSize`, `action`, `entityType`, `actorId`. |
| GET | `/admin/stats` | ADMIN+ | Totals, users by role, schemes by status. |

Paginated response shape:

```json
{ "users": [...], "pagination": { "page": 1, "pageSize": 25, "total": 5, "totalPages": 1 } }
```

## Scheme management (`/admin/schemes`)

All endpoints require `SCHEME_VERIFIER`, `ADMIN` or `SUPER_ADMIN` unless marked otherwise.
Content can be edited by verifiers; publication and expiry are admin-only.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/schemes` | Verifier+ | All statuses. Query: `page`, `pageSize` (≤100), `q`, `status`, `category`, `level`, `language`. Returns `countsByStatus`. |
| POST | `/admin/schemes` | Verifier+ | Create a scheme (status `DRAFT` or `PENDING_VERIFICATION`, default pending). |
| GET | `/admin/schemes/:id` | Verifier+ | Full record plus versions, verifications, translation reviews and counts. |
| PATCH | `/admin/schemes/:id` | Verifier+ | Partial content update with automatic versioning. |
| POST | `/admin/schemes/:id/verify` | Verifier+ | Record `APPROVED`, `REJECTED` or `REQUEST_CHANGES`. |
| POST | `/admin/schemes/:id/publish` | **ADMIN+** | Publish a `VERIFIED` scheme. |
| POST | `/admin/schemes/:id/expire` | **ADMIN+** | Expire a `PUBLISHED` scheme. |
| GET | `/admin/schemes/:id/versions` | Verifier+ | Version history with parsed snapshots (paginated). |
| GET | `/admin/schemes/:id/versions/:version` | Verifier+ | A single version snapshot. |
| PUT | `/admin/schemes/:id/translations/:language` | Verifier+ | Merge translated fields for `kn`, `en` or `hi`. |

### POST /admin/schemes

Required: `titleEn`, `summaryEn`, `benefitsEn`, `department`, `categorySlug`.
Optional: `titleKn`, `titleHi`, `summaryKn`, `summaryHi`, `descriptionEn`, `descriptionKn`,
`benefitsKn`, `eligibilityEn`, `eligibilityKn`, `level` (`CENTRAL|STATE`, default `STATE`),
`state` (default `Karnataka`), `requiredDocuments` (array of strings, max 40), `applicationProcessEn`,
`applicationProcessKn`, `applicationUrl`, `officialUrl`, `notificationNumber`,
`applicationDeadline`, `startDate`, `endDate`, `sourceSlug`, `slug`, `status`, `rules`.

- `slug` is generated from `titleEn` when omitted (lowercase, hyphenated, unique suffix added on
  collision). Explicit slugs must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` and be unique (`409`).
- `rules` replace the eligibility rule set. Each rule: `field`, `operator`
  (`GTE|LTE|EQ|NEQ|IN|CONTAINS|EXISTS`), `value` (any JSON value), optional `descriptionEn`,
  `descriptionKn`, `isRequired`, `sortOrder`.
- A version-1 snapshot is written in the same transaction. Created schemes are never marked
  `isDemoData`.
- Unknown category/source slugs return `400`.

### PATCH /admin/schemes/:id

Send any subset of the create fields (except `slug`, `status`, `isDemoData`). Behaviour:

- The response includes `changed`, a list of changed field names; a no-op patch returns
  `changed: []` without a version bump.
- Any real content change increments `version` and writes a `SchemeVersion` snapshot with a
  change summary.
- Editing a `PUBLISHED` or `VERIFIED` scheme resets it to `PENDING_VERIFICATION` and clears
  `publishedAt`, forcing re-verification before it can be public again.

### Verification and publication

- `POST /:id/verify` accepts `{ "action": "APPROVED" | "REJECTED" | "REQUEST_CHANGES", "notes"?, "sourceEvidenceUrl"? }`.
  Only `PENDING_VERIFICATION` schemes can be reviewed.
  - `APPROVED` → `VERIFIED`, sets `lastVerifiedAt`.
  - `REJECTED` → `REJECTED`.
  - `REQUEST_CHANGES` → stays `PENDING_VERIFICATION`.
  Every decision creates a `VerificationRecord`.
- `POST /:id/publish` requires `VERIFIED`; sets `PUBLISHED` and stamps `publishedAt`.
- `POST /:id/expire` requires `PUBLISHED`; sets `EXPIRED` (hidden from public endpoints).

### PUT /admin/schemes/:id/translations/:language

```json
{ "fields": { "description": "…", "summary": "…" }, "provider": "HUMAN", "quality": "REVIEWED" }
```

Fields are merged into the existing translation object. `provider` is `HUMAN|AI|MACHINE`
(default `HUMAN` on first write); `quality` is `DRAFT|REVIEWED|VERIFIED`. Setting quality to
`REVIEWED` or `VERIFIED` records the reviewing user and timestamp. Seeded AI translations start
as `DRAFT`.

## Not yet implemented

Notifications, analytics, assistance centres, monitoring administration, document upload/OCR,
application tracking and the AI voice assistant. These are tracked in `PROJECT_STATUS.md`.
