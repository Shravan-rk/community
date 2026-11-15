# PROJECT_STATUS

Last updated: 2026-11-15

## Current development phase

**Phases 0–2 complete** (foundation): safety/scaffolding, database schema + seed, backend authentication & RBAC.

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

## Not started

- Citizen web UI (Kannada-first React application).
- Scheme discovery API (search/filter/sort/bookmark/compare) and public scheme endpoints.
- Government monitoring engine, OCR/AI extraction, translation pipeline, admin verification workflow.
- Eligibility engine, AI voice assistant, application assistant.
- Notification delivery (in-app/Web Push/SMS/WhatsApp), analytics, village assistance, PWA/offline.

## Known issues / limitations

1. Local database is SQLite. Enums and JSON payloads are stored as validated `String` columns and
   enforced in the API layer; the schema is PostgreSQL-ready but requires a documented provider switch.
2. Staff invite-code registration is enabled whenever the server runs. Rotate codes and consider an
   environment flag before production.
3. No email/phone verification (OTP) yet; accounts are verified by possession of the email only.
4. Access tokens are stateless and cannot be revoked individually before expiry (no refresh/denylist yet).
5. Rate limiting is in-memory; multi-instance deployments need a shared store (e.g. Redis).
6. No background job runner yet — monitoring jobs are modelled but not executed.
7. Seeded scheme content is illustrative (`isDemoData`), translations are AI drafts (`quality = DRAFT`).
8. Prisma 6 emits a deprecation warning for `package.json#prisma` (seed config); migrate to
   `prisma.config.ts` before Prisma 7.
9. The repository has no CI pipeline yet.

## Next actions (approved sequence)

1. **Phase 3:** Public scheme discovery API — published schemes, categories, search/filter/sort,
   Kannada/English/Hindi payloads, bookmarks, comparison; admin scheme CRUD with versioning.
2. **Phase 4:** Eligibility engine (rule evaluation + explanations, no approval guarantees).
3. **Phase 5:** Monitoring engine + extraction/translation pipeline + verification workflow
   (enables the end-to-end acceptance scenario).
4. **Phase 6:** Citizen UI (Kannada-first) and admin dashboard.
5. Subsequent phases: voice assistant, applications/notifications, analytics/offline, security
   hardening, deployment.
