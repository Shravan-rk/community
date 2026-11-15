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

Planned services (later phases):
  Scheduler / worker ──► source fetcher ──► OCR ──► LLM extraction ──► translation
        │                                              │
        └──► monitoring jobs / retries                  └──► verification queue (admin)
```

## Frontend (planned, Phase 6)

- React 18 + TypeScript + Vite + Tailwind CSS + React Router + Lucide icons.
- Kannada-first copy with English/Hindi switching; mobile-first, large touch targets.
- Green primary theme on warm neutral surfaces; accessible contrast.
- No placeholder pages: every route is backed by the API built in earlier phases.
- PWA/offline strategy and low-bandwidth mode in a later phase.

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

## Background jobs (planned, Phase 5)

- No Redis is installed; the first implementation will use a database-backed scheduler/worker
  with retry counters (`MonitoringJob.attempt`, `status`), behind a queue interface so BullMQ/Redis
  can be added for scale.
- Jobs will respect robots.txt/terms of service, use conditional requests, and never claim
  real-time updates that the source does not provide.

## External integrations

See `INTEGRATIONS.md`. Nothing is configured or live yet; the source registry is seeded with
official portals plus one explicitly labelled demo source.

## Deployment (planned)

- Server: container or Node process + PostgreSQL; environment variables via secret manager.
- Migrations: `prisma migrate deploy` in release step (never `migrate reset` in production).
- Backups: nightly PostgreSQL dump with tested restore; uploaded government documents in
  object storage with retention rules.
- Monitoring: health endpoint `/api/health`, structured logs, error tracking service.
