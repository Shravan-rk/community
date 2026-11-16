# ARCHITECTURE

## Overview

```
┌──────────────────────────────┐        ┌─────────────────────────────────────────┐
│  Citizen / Admin web client  │  HTTPS │  Express + TypeScript API (server/)     │
│  (React + Vite — planned)    │◄──────►│  JWT auth · RBAC · Zod · rate limiting  │
└──────────────────────────────┘        │  Audit log · REST /api/*                │
                                        └───────────────┬─────────────────────────┘
                                                        │ Prisma
                                        ┌───────────────▼─────────────────────────┐
                                        │ SQLite (dev) → PostgreSQL (production)  │
                                        └─────────────────────────────────────────┘

Monitoring (Phase 5: demo adapter only):
  optional scheduler ──► demo feed adapter ──► extraction queue ──► human review ──► scheme draft
                                                                        │
                                                                        └──► verify ──► publish (admin)
Planned later:
  real fetcher ──► OCR ──► LLM extraction ──► translation ──► verification queue
```

## Frontend (Phase 6 foundation implemented)

- React 18 + TypeScript + Vite + Tailwind CSS + React Router + Lucide icons.
- Kannada-first copy with English/Hindi switching; responsive layouts and role-gated routes.
- Citizen pages cover scheme discovery/details/compare, eligibility matches, profile, saved items,
  applications, notifications and assistance centres. Admin pages cover dashboard, schemes,
  monitoring review, operations and users.
- The client uses the existing REST API; API availability and supported integrations remain limited
  to what is implemented on the backend. Offline support is partial, not a complete offline workflow.
- The client currently has a production build/typecheck but no automated browser/component test suite.

## Backend (implemented, Phases 2+)
- Node.js + Express 4 + TypeScript (ESM, NodeNext resolution, strict mode).
- Layered structure:
  - `src/routes/*` — HTTP routing and request/response shaping.
  - `src/middleware/*` — authentication, role checks, validation, rate limiting, errors.
  - `src/lib/*` — password hashing, JWT, audit, error types, safe comparison, helpers.
  - `src/db.ts` — single Prisma client.
  - `src/env.ts` — validated configuration (Zod); the process refuses to start on invalid config.
- Security controls: Helmet headers, CORS allowlist, JSON body limit, per-IP rate limits,
  structured error envelopes without stack traces in production, audit trail.
- Eligibility assessment (`src/lib/eligibility.ts`) is a pure, database-agnostic evaluator over
  `EligibilityRule` rows and the citizen's own profile. It derives age, handles typed/operator edge
  cases, separates required from optional rules and returns honest outcomes
  (`LIKELY_ELIGIBLE`, `NOT_ELIGIBLE`, `NEEDS_INFORMATION`, `NOT_ASSESSABLE`) with explanations and
  a disclaimer. It never calls an external service at request time.
- Monitoring (`src/lib/monitoring.ts`) has an explicit adapter boundary. The only adapter is the
  local, labelled demo feed; unsupported real sources are refused before a job is created. A run
  records a `MonitoringJob` and provenance-rich `ExtractionResult` rows, deduplicated by source +
  external item ID. Review approval creates a `PENDING_VERIFICATION` scheme; publication remains a
  separate admin action. The optional scheduler is in-process and disabled by default.
- Output: JSON REST API under `/api`. OpenAPI/Swagger is a future addition.

## Database

- Prisma ORM. Local development uses SQLite for zero-install operation.
- Production target is PostgreSQL (schema uses portable types; provider switch documented).
- Enums/JSON are stored as validated strings because SQLite lacks native support; API-layer Zod
  schemas are the source of truth. See `DATABASE_DOCUMENTATION.md`.

## AI services (planned)

- Provider-agnostic adapters: OCR (PDF/image), structured extraction, translation (Kannada/Hindi).
- All extracted fields must carry provenance; missing values are left empty, never invented.
- Human review is mandatory before publication (`ExtractionResult.needsReview`,
  `SchemeTranslation.quality`, `VerificationRecord`).
- Without API keys the system must use a clearly labelled demo adapter, not a fake live integration.
  The Phase 5 demo feed supplies authored English/Kannada fields; approval stores Kannada as a
  `DEMO`/`DRAFT` translation, never as verified machine translation.

## Background jobs (Phase 5, opt-in)

- An in-process scheduler (`src/lib/monitoringScheduler.ts`) is gated by
  `MONITORING_WORKER_ENABLED` (default `false`) and `MONITORING_POLL_MINUTES`. It only checks due
  `DEMO` sources; admin-triggered runs work without it.
- Runs are synchronous. `MonitoringJob` records status/timestamps/errors, but retry/backoff and
  distributed locking are not implemented. Real adapters must add conditional requests and respect
  robots.txt/terms of service before being enabled.
- For scale, replace the interval with a queue (BullMQ/Redis or a database-backed worker) behind the
  same adapter boundary.

## External integrations

See `INTEGRATIONS.md`. Nothing is configured or live yet; the source registry is seeded with
official portals plus one explicitly labelled demo source.

## Deployment (planned)

- Server: container or Node process + PostgreSQL; environment variables via secret manager.
- Migrations: `prisma migrate deploy` in release step (never `migrate reset` in production).
- Backups: nightly PostgreSQL dump with tested restore; uploaded government documents in
  object storage with retention rules.
- Monitoring: health endpoint `/api/health`, structured logs, error tracking service.
