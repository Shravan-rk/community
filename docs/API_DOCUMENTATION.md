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

Profile fields (all optional, nullable where noted): `dateOfBirth` (ISO date, not future),
`gender` (`MALE|FEMALE|OTHER|PREFER_NOT_TO_SAY`), `state`, `district`, `taluk`, `village`,
`gramPanchayat`, `occupation`, `annualIncome` (0–100,000,000), `education`,
`landHoldingAcres` (0–10,000), `familySize` (1–50), `disabilityStatus`,
`socialCategory` (`GENERAL|OBC|SC|ST|EWS|MINORITY`), `aadhaarLast4` (exactly 4 digits),
`profileJson` (object), `onboardingCompleted` (boolean).

> Aadhaar: only the last four digits may be stored. Never send a full Aadhaar number or banking credentials.

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

## Planned endpoints (not implemented yet)

`GET /schemes`, `GET /schemes/:slug`, `GET /categories`, bookmark and comparison endpoints,
eligibility evaluation, notifications, analytics, assistance centres, monitoring administration.
These are tracked in `PROJECT_STATUS.md` and will be added phase by phase.
