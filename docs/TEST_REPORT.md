# TEST REPORT

Date: 2026-11-15
Environment: Windows (win32), Node v26.13.1, npm 11.20.0
Database under test: SQLite `server/prisma/dev.db` (smoke) and dedicated `server/prisma/test.db` (automated tests)

## Summary

| Check | Command | Result |
|---|---|---|
| TypeScript typecheck | `npm run typecheck` | **PASS** (0 errors) |
| Production build | `npm run build` | **PASS** (`dist/index.js` emitted) |
| Seed (first run) | `npm run seed` | **PASS** — 16 categories, 7 sources, 5 users, 12 schemes created |
| Seed (second run, idempotency) | `npm run seed` | **PASS** — 0 created, 12 updated |
| Automated API tests | `npm run test` | **PASS** — 49/49 tests, 3 files |
| Live API smoke test | start server + HTTP calls | **PASS** (Phase 2 baseline; later phases exercised through Supertest) |
| Prisma schema validation | implicit in `generate`/`migrate`/`db push` | **PASS** |

## Automated tests (Vitest 2.1.9 + Supertest)

```
✓ tests/schemes.test.ts (14 tests) 1204ms
✓ tests/eligibility.test.ts (17 tests) 1018ms
✓ tests/auth.test.ts (18 tests) 538ms
Test Files  3 passed (3)
Tests       49 passed (49)
Duration    7.61s
```

Coverage of behaviour:

1. Health endpoint reports OK with a reachable database.
2. `/api/meta` exposes all five roles.
3. Unknown API routes return a structured `NOT_FOUND` error.
4. Registration rejects invalid input with field-level errors.
5. Registration creates user + citizen profile + notification preferences + data-processing consent.
6. Duplicate email registration returns `409 CONFLICT`.
7. Login with a wrong password returns `401`.
8. Login succeeds and returns token, user and profile.
9. `/auth/me` without a token returns `401`.
10. `/auth/me` returns user, profile and notification preferences.
11. A malformed JWT is rejected with `401`.
12. Profile PATCH validates and persists changes.
13. Invalid profile values (bad Aadhaar suffix, negative income) return `400`.
14. Notification preferences update (channels, categories, quiet hours).
15. Consent upsert works.
16. Citizens are blocked from `/api/admin/*` with `403`.
17. Staff registration rejects a wrong invite code with `403`.
18. Staff registration accepts the correct code; admins can read stats but cannot change roles (`403`).
19. Public scheme list returns only published schemes, defaults to Kannada and localizes categories.
20. Category/level filters and English text search return the expected schemes.
21. Popularity sorting works and invalid pagination (`pageSize` > 50) is rejected.
22. Scheme detail returns parsed rules/documents/source and increments `views` once.
23. Missing Hindi content falls back to English with explicit `fallbacks` metadata.
24. Unpublished schemes are hidden from detail, related and comparison endpoints.
25. Compare enforces 2–3 slugs and reports `missingSlugs`.
26. Category listing exposes published-only scheme counts and Kannada names.
27. Bookmarks save idempotently, list with `savedAt`, reject unpublished schemes and remove safely.
28. Citizens are blocked from admin scheme APIs; verifiers can read all statuses and status counts.
29. Admin create generates a unique slug, persists rules/documents and writes version 1 atomically.
30. Duplicate slugs return `409`; unknown categories return `400`.
31. Content edits reset a published scheme to `PENDING_VERIFICATION`, clear `publishedAt`, bump the
    version and store a snapshot; no-op edits do not bump versions.
32. Verification decisions, publish/expire permissions and transitions are enforced; translation
    updates merge fields and record review quality/reviewer.
33. Age derivation respects birthday boundaries; missing/invalid dates do not produce an age.
34. All operators (`GTE`, `LTE`, `EQ`, `NEQ`, `IN`, `CONTAINS`, `EXISTS`) behave as documented,
    including numeric strings and case-insensitive strings.
35. Required rule failures yield `NOT_ELIGIBLE`; optional failures do not block eligibility.
36. Missing required data yields `NEEDS_INFORMATION` with the field named; filling the profile
    upgrades the assessment without a restart.
37. Schemes without required rules are `NOT_ASSESSABLE` (no invented eligibility).
38. Malformed rule JSON and unsupported operators become `UNKNOWN`/`INVALID_RULE`, never a guess.
39. `profileJson` custom fields work without overriding explicit profile columns.
40. Eligibility APIs require auth, hide unpublished schemes, return localized explanations and the
    disclaimer, and matching supports filters, ranking, pagination, summary counts and missing-field
    hints (including the no-profile case). `/api/meta` exposes fields/operators/assessments.

Test isolation: the global setup runs `prisma db push --force-reset` **only** against the dedicated
`prisma/test.db`. The development database is never reset by tests. Every test calls the shared
`resetDatabase()` helper, which deletes all tables in FK-safe order and reseeds deterministic
fixtures.

## Live smoke test (against built server + seeded dev database)

```
HEALTH: {"ok":true,"service":"GRAMA SAHAY API","version":"0.1.0","database":"ok",...}
CITIZEN LOGIN: role=CITIZEN name=Lakshmi Devi lang=kn district=Bengaluru Urban
ME: consents=1 notifPrefs=True
RBAC: citizen blocked with HTTP 403
ADMIN STATS: {"users":5,"schemes":12,"notifications":0,"savedSchemes":0,"auditToday":2}
             roles={"ADMIN":1,"CITIZEN":1,"SCHEME_VERIFIER":1,"SUPER_ADMIN":1,"VILLAGE_FACILITATOR":1}
META: languages=kn,en,hi roles=CITIZEN,VILLAGE_FACILITATOR,SCHEME_VERIFIER,ADMIN,SUPER_ADMIN
```

Seeded database verification: `schemes=12, published=10, pending=2, categories=16, users=5,
translations=12, eligibilityRules=18`.

## Not yet tested (features not built)

- Citizen/admin UI (no frontend exists yet).
- Monitoring pipeline, OCR/AI extraction, automated translation, notifications, analytics, voice
  assistant.
- Load/performance testing, penetration testing, accessibility audit.
- Multi-instance rate limiting / shared cache behaviour.

## Known test limitations

- Eligibility tests use synthetic rules and profiles; real government criteria may need new
  operators/fields when verified notices are ingested.
- Matching evaluates every published scheme in memory (fine at the current catalogue size).
- Tests run sequentially in a single fork for deterministic database state.
- No coverage threshold configured yet.
