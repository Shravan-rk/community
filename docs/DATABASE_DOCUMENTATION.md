# DATABASE DOCUMENTATION

## Stack

- ORM: Prisma 6.
- Local development: SQLite (`server/prisma/dev.db`, gitignored).
- Production target: PostgreSQL.
- Migrations: `server/prisma/migrations/` (committed). Initial migration `20261115172938_init`.

## Models (21)

> `MonitoringSource` is represented by `SchemeSource` (single source registry used by both the
> scheme catalogue and the monitoring jobs), avoiding two divergent tables.

| # | Model | Purpose | Key constraints / indexes |
|---|---|---|---|
| 1 | `User` | Accounts for all roles | `email` unique, `phone` unique, index on `role`, `isActive`, `createdAt` |
| 2 | `CitizenProfile` | Demographic/eligibility profile | 1:1 `userId` unique; indexes on `state`, `district` |
| 3 | `UserConsent` | Consent records with version | unique `(userId, consentType)` |
| 4 | `AuditLog` | Security/audit trail | indexes on `actorId`, `(entityType, entityId)`, `createdAt`; actor `onDelete: SetNull` |
| 5 | `SchemeCategory` | 16 discovery categories | `slug` unique |
| 6 | `SchemeSource` | Official/demo source registry + monitoring config | `slug` unique; interval, last check/error fields |
| 7 | `Scheme` | Core scheme record + lifecycle | `slug` unique; indexes on `status`, `categoryId`, `(state, status)`, `department`, `publishedAt` |
| 8 | `SchemeVersion` | Immutable snapshots per version | unique `(schemeId, version)` |
| 9 | `SchemeTranslation` | Per-language translated content | unique `(schemeId, language)`; index on `quality` |
| 10 | `EligibilityRule` | Rule-based eligibility criteria | indexes on `schemeId`, `field` |
| 11 | `SchemeDocument` | Retrieved PDFs/pages + OCR state | indexes on `schemeId`, `ocrStatus` |
| 12 | `SavedScheme` | Citizen bookmarks | unique `(userId, schemeId)` |
| 13 | `ApplicationRecord` | Citizen application tracking | indexes on `userId`, `schemeId`, `status` |
| 14 | `Notification` | In-app/outbound notifications | `dedupeKey` unique; indexes on `(userId, status)`, `createdAt` |
| 15 | `NotificationPreference` | Per-user delivery preferences | 1:1 `userId` unique |
| 16 | `AssistanceCentre` | CSC/Panchayat/office directory | indexes on `(district, taluk)`, `type` |
| 17 | `AssistanceRequest` | Citizen support requests | indexes on `status`, `centreId` |
| 18 | `Feedback` | Scheme/citizen feedback | indexes on `schemeId`, `status` |
| 19 | `MonitoringJob` | Scheduled source checks + retries | indexes on `sourceId`, `status`, `createdAt` |
| 20 | `ExtractionResult` | AI extraction output + review flag | `schemeId` unique optional; index on `needsReview` |
| 21 | `VerificationRecord` | Admin approve/reject history | indexes on `schemeId`, `verifierId` |

## Key relationships

```
User 1─1 CitizenProfile
User 1─n UserConsent / SavedScheme / ApplicationRecord / Notification / AuditLog
User 1─1 NotificationPreference
User 1─n (as verifier) VerificationRecord
SchemeCategory 1─n Scheme
SchemeSource   1─n Scheme, 1─n MonitoringJob
Scheme 1─n SchemeVersion / SchemeTranslation / EligibilityRule / SchemeDocument
Scheme 1─n SavedScheme / ApplicationRecord / Notification / VerificationRecord / Feedback
Scheme 1─1 ExtractionResult (optional)
MonitoringJob 1─n ExtractionResult
AssistanceCentre 1─n AssistanceRequest
```

Delete behaviour is explicit: cascade for user-owned and scheme-owned child records; `SetNull`
for references that must outlive their parent (audit actor, extracted scheme link, assignments).

## Stored-JSON fields

SQLite has no native enum/JSON types, so these are `String` columns containing validated JSON:

| Field | Shape |
|---|---|
| `Scheme.requiredDocumentsJson` | `string[]` |
| `EligibilityRule.valueJson` | scalar or `string[]` |
| `SchemeTranslation.fieldsJson` | `{ title, summary, benefits, eligibility, applicationProcess }` |
| `SchemeVersion.snapshotJson` | flat snapshot object |
| `ExtractionResult.extractedJson` | field→value map with provenance |
| `CitizenProfile.profileJson` | free-form eligibility answers |
| `NotificationPreference.categoriesJson` / `districtsJson` | `string[]` |
| `AuditLog.metadataJson` | object |
| `Notification.metadataJson` | object |

Zod schemas in the API validate all incoming structured data. PostgreSQL migration can later
convert these to `jsonb`/native enums with a data migration.

## Local commands

```bash
cd server
npm run prisma:generate     # regenerate client after schema edits
npm run db:migrate -- --name <migration_name>   # create + apply a migration (dev)
npm run seed                # idempotent seed (demo data)
npm run db:studio           # inspect data in Prisma Studio
```

Never run `prisma migrate reset` or `db push --force-reset` against the development or production
database. The only exception is the dedicated test database (`server/prisma/test.db`) used by tests.

## Switching to PostgreSQL (production)

1. Install PostgreSQL and create a database/user.
2. In `prisma/schema.prisma`, change `datasource db.provider` from `sqlite` to `postgresql`.
3. Set `DATABASE_URL="postgresql://user:pass@host:5432/grama_sahay?schema=public"`.
4. Generate a fresh baseline migration for PostgreSQL (SQLite migration SQL is not portable):
   `prisma migrate dev --name postgres_baseline` on an empty database, then `prisma migrate deploy`
   in CI/production. Do not apply the SQLite migration history to PostgreSQL.
5. Optionally convert JSON/scalar columns to `jsonb` and strings to enums in a follow-up migration.
6. Keep `isDemoData = true` records out of production, or re-verify and clear the flag.

## Backup & retention

- Production: daily encrypted PostgreSQL dumps, 30-day retention, monthly restore test.
- Uploaded government documents belong in object storage (not the DB) with checksum verification.
- Audit logs are append-only in application code; no update/delete endpoints exist.
- Data minimisation: only `aadhaarLast4` may be stored; never full Aadhaar or banking credentials.
