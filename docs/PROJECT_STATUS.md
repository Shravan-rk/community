# PROJECT_STATUS

Last updated: 2026-11-16

## Current development phase

**Phases 0–5 complete**: foundation (safety, database, auth/RBAC), public discovery plus admin
scheme management, the eligibility assessment engine, and a monitoring/extraction review pipeline
that runs against a clearly labelled local demo feed.

> The master plan lists UI as Phase 2 and database as Phase 3. Based on the approved audit
> decisions (empty repository, no PostgreSQL/Redis), work started with safety, database and
> backend auth so that UI is built against real, persisted APIs instead of placeholder pages.

## Completed

### Phase 0 — Safety & scaffolding
- New sibling project `grama-sahay` created; `rideops` was **not modified**.
- Git repository initialised, `.gitignore` protects `.env`, databases, logs and uploads.
- `server/.env.example` documents every required variable; secrets generated locally.
- README, docs skeleton, root convenience scripts.

### Phase 1 — Database
- Prisma schema with **21 models** (the "MonitoringSource" concept is unified into `SchemeSource` to
  avoid duplicate source registries): User, CitizenProfile, UserConsent, AuditLog, SchemeCategory,
  SchemeSource, Scheme, SchemeVersion, SchemeTranslation, EligibilityRule, SchemeDocument,
  SavedScheme, ApplicationRecord, Notification, NotificationPreference, AssistanceCentre,
  AssistanceRequest, Feedback, MonitoringJob, ExtractionResult, VerificationRecord (plus
  relation coverage for all required entities).
- Safe initial migration `20261115172938_init` (no destructive operations; fresh database).
- Idempotent seed: 16 categories, 7 monitored-source registry entries, 12 demo schemes
  (10 published, 2 pending verification), 12 Kannada draft translations, 18 eligibility rules,
  5 demo accounts across all five roles.
- Every seeded scheme is flagged `isDemoData = true` and links to an official portal.

### Phase 2 — Backend auth & RBAC
- Express + TypeScript server with strict compilation.
- JWT authentication (issuer/audience bound, 12h default), bcrypt password hashing (cost 12).
- Five roles enforced server-side: CITIZEN, VILLAGE_FACILITATOR, SCHEME_VERIFIER, ADMIN, SUPER_ADMIN.
- Citizen registration (auto-creates profile, notification preferences, data-processing consent).
- Staff/admin registration gated by invite codes (constant-time comparison).
- Citizen profile CRUD, notification preferences, consent management.
- Admin user listing, role changes (SUPER_ADMIN only), activation/deactivation, audit logs, stats.
- Zod request validation, Helmet, CORS allowlist, rate limiting, structured error responses.
- Audit logging for registrations, logins, profile/preference/consent changes and admin actions.
- 18 automated API tests (Vitest + Supertest) — all passing.

### Phase 3 — Scheme discovery & management
- Public `GET /api/categories`: active categories with published-scheme counts, localized names.
- Public `GET /api/schemes`: paginated search/filter/sort over published schemes only
  (`q`, category, department, level, state; sort by newest, popularity, deadline or title).
  `pageSize` is capped at 50.
- Public `GET /api/schemes/compare?slugs=a,b,c` (2–3 published schemes), `GET /api/schemes/:slug`
  (increments views, includes parsed rules/documents/source) and
  `GET /api/schemes/:slug/related`.
- Kannada-first localization with explicit `fallbacks` and `availableLanguages`; no runtime
  machine translation. English is returned only as a labelled fallback.
- Citizen bookmarks: list/save/remove published schemes, idempotent saves, audit trail.
- Admin scheme API under `/api/admin/schemes` (SCHEME_VERIFIER+):
  list all statuses with counts, create (auto-slug, category/source resolution, rules),
  detail with versions/verifications/translation reviews, diff-based PATCH with automatic
  version snapshots, verification decisions, publish/expire (ADMIN+), version history and
  translation editing with review quality.
- Content edits to `PUBLISHED`/`VERIFIED` schemes force `PENDING_VERIFICATION` (publication
  stamp cleared) so unverified changes never reach citizens.
- 32 automated API tests total across 2 files — all passing.

### Phase 4 — Eligibility assessment engine
- Pure evaluator (`src/lib/eligibility.ts`) with no framework or database coupling; supports
  `GTE`, `LTE`, `EQ`, `NEQ`, `IN`, `CONTAINS` and `EXISTS`, case-insensitive strings, numeric
  normalisation, derived `age`, and custom `profileJson` fields (explicit columns win).
- Four honest outcomes: `LIKELY_ELIGIBLE`, `NOT_ELIGIBLE`, `NEEDS_INFORMATION` and
  `NOT_ASSESSABLE`. Required vs optional rules are separated; optional failures never block.
- Per-rule explanations include expected/actual values, status (`MET`/`NOT_MET`/`UNKNOWN`) and
  reason codes (`MISSING_PROFILE_DATA`, `INVALID_RULE`, `INCOMPATIBLE_VALUE`, …), localized
  Kannada/English descriptions, and a localized "estimate only" disclaimer. No approval claims.
- `GET /api/schemes/:slug/eligibility` (Bearer) evaluates one published scheme against the
  caller's own profile; unpublished schemes stay hidden.
- `GET /api/citizens/me/eligible-schemes` evaluates all published schemes in memory, ranks them,
  filters by assessment, reports missing profile fields, paginates and exposes assessment counts.
- `/api/meta` publishes eligible fields, operators and assessment values for clients.
- 49 automated tests total across 3 files (17 new eligibility tests, including operator and
  missing-data edge cases) — all passing.

### Phase 5 — Monitoring engine & extraction pipeline
- Source adapters are explicit: only the labelled `DEMO` source has an adapter today. Admin runs
  against real sources are refused with a clear reason instead of attempting untested scraping.
- Local demo feed (`src/lib/demoFeed.ts`) with two clearly illustrative items, authored Kannada
  fields, a feed version and per-item provenance. No external network calls are made.
- Admin monitoring API under `/api/admin/monitoring` (SCHEME_VERIFIER+; run is ADMIN+):
  source availability, synchronous runs, job list/detail, extraction queue/detail and review.
- Each run stores a `MonitoringJob` and `ExtractionResult` records with source URL, external ID,
  adapter/model, fetched timestamp and provenance. Repeat runs skip already-ingested items.
- Approving an extraction creates a `PENDING_VERIFICATION` scheme (never auto-published) with a
  version-1 snapshot, eligibility rules, demo flag inherited from the source, and a
  `provider: DEMO`, `quality: DRAFT` Kannada translation when authored Kannada exists.
  Rejections record the reviewer, timestamp and notes; reviewed items cannot be processed twice.
- Optional in-process scheduler controlled by `MONITORING_WORKER_ENABLED` (default off) and
  `MONITORING_POLL_MINUTES`; it only checks due demo sources. Manual runs always remain available.
- 59 automated tests total across 4 files (10 new monitoring tests) — all passing.

## Not started

- Citizen web UI (Kannada-first React application).
- Government source retrieval, OCR/AI extraction and machine translation (only the demo adapter and
  human/demo-authored extraction review exist; real integrations are not configured).
- AI voice assistant, application assistant.
- Notification delivery (in-app/Web Push/SMS/WhatsApp), analytics, village assistance, PWA/offline.

## Known issues / limitations

1. Local database is SQLite. Enums and JSON payloads are stored as validated `String` columns and
   enforced in the API layer; the schema is PostgreSQL-ready but requires a documented provider switch.
2. Staff invite-code registration is enabled whenever the server runs. Rotate codes and consider an
   environment flag before production.
3. No email/phone verification (OTP) yet; accounts are verified by possession of the email only.
4. Access tokens are stateless and cannot be revoked individually before expiry (no refresh/denylist yet).
5. Rate limiting is in-memory; multi-instance deployments need a shared store (e.g. Redis).
6. The monitoring scheduler is opt-in and in-process (`MONITORING_WORKER_ENABLED=false` by default).
   Only the labelled `DEMO` source has an adapter; no government source is fetched, and multiple
   instances would need an external job queue/lock.
7. Seeded scheme content is illustrative (`isDemoData`), translations are AI drafts (`quality = DRAFT`).
   Public responses expose `isDemoData`; UI must never present demo records as official notices.
8. Scheme `views` increments on every public detail request without deduplication; treat it as a
   rough popularity signal, not analytics.
9. Localized payloads prefer canonical Kannada/English columns over `SchemeTranslation` values.
   Reviewed translations currently enrich fields missing from the base columns (e.g. descriptions);
   they do not overwrite `titleKn`/`summaryKn`.
10. Version snapshots capture scheme fields and eligibility rules; they do not yet include documents
    or translations.
11. Eligibility matching loads and evaluates every published scheme in memory. This is deliberate for
    correctness while the catalogue is small; add database-side pre-filtering when it grows.
12. Eligibility depends on profile completeness and rule quality. Unknown fields, malformed rule
    JSON and type mismatches surface as `NEEDS_INFORMATION`, never as a guess. `EXISTS` only checks
    that the profile has a value; it cannot express "must be false".
13. Hindi rule descriptions fall back to English (rule records store only English and Kannada
    descriptions); Hindi UI copy/disclaimer is provided.
14. Prisma 6 emits a deprecation warning for `package.json#prisma` (seed config); migrate to
    `prisma.config.ts` before Prisma 7.
15. The repository has no CI pipeline yet.
16. Monitoring runs are synchronous and have no retry/backoff or conditional-request support yet.
    Failures are stored on the job and source (when an adapter is configured), but the scheduler
    simply tries again on the next due interval.
17. Extraction approval is a human review step, not verification. Created schemes remain
    `PENDING_VERIFICATION`; demo-authored extractions inherit `isDemoData = true` and must never be
    presented as official notices.
18. Extraction deduplication uses source + external item ID. A changed document that reuses the
    same ID is not re-ingested automatically.

## Next actions (approved sequence)

1. **Phase 6:** Citizen UI (Kannada-first) and admin dashboard (including monitoring/extraction
   review screens backed by the existing APIs).
2. Subsequent phases: voice assistant, applications/notifications, analytics/offline, security
   hardening, deployment.
