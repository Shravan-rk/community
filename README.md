# GRAMA SAHAY

AI-powered government scheme awareness and livelihood assistance platform for rural citizens in India. Kannada-first, mobile-first, built for Karnataka with support for English and Hindi.

> **Status:** Early development. The backend foundation and a React citizen/admin client are implemented. Scheme monitoring is demo-only; AI assistance, live government integrations and several assistance features remain unbuilt. See [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).

## Repository layout

```
grama-sahay/
├─ client/               React + TypeScript + Vite citizen/admin application
├─ docs/                 Project, architecture, API, database, integration and test docs
└─ server/               Express + TypeScript API, Prisma + SQLite
   ├─ prisma/            Schema, migrations, seed data
   ├─ src/               Application source
   └─ tests/             Vitest + Supertest API tests
```

## Requirements

- Node.js 20+ (tested on 26)
- npm 10+
- No PostgreSQL/Redis/Docker required for local development (SQLite + optional in-process scheduler)

## Quick start

```bash
cd server
npm install
copy .env.example .env      # then edit secrets
npm run db:push             # create local SQLite schema
npm run seed                # categories, sources, demo schemes, demo users
npm run dev                 # http://localhost:4000/api/health
```

In a second terminal, start the client from the repository root:

```bash
npm run dev:client          # http://localhost:5173
```

The Vite development server proxies `/api` to `http://localhost:4000`. `VITE_API_URL` can be set
when the client needs a different API base URL. Install both workspaces with `npm run install:all`;
build or typecheck the client with `npm run build:client` and `npm run typecheck:client`.

Check the API is up:

```bash
curl http://localhost:4000/api/health
```

Monitoring is admin-triggered and only the clearly labelled `demo-feed` source has an adapter
(`POST /api/admin/monitoring/sources/:id/run`). No government source is fetched. Set
`MONITORING_WORKER_ENABLED=true` to check due demo sources on an interval.

## Demo accounts (after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| SUPER_ADMIN | superadmin@gramasahay.local | from `SEED_SUPER_ADMIN_PASSWORD` (default `ChangeMe!123`) |
| ADMIN | admin@gramasahay.local | from `SEED_ADMIN_PASSWORD` (default `ChangeMe!123`) |
| SCHEME_VERIFIER | verifier@gramasahay.local | from `SEED_STAFF_PASSWORD` (default `ChangeMe!123`) |
| VILLAGE_FACILITATOR | facilitator@gramasahay.local | from `SEED_STAFF_PASSWORD` |
| CITIZEN | citizen@gramasahay.local | from `SEED_CITIZEN_PASSWORD` (default `ChangeMe!123`) |

> These are development-only credentials. Never use them in production. Change every secret before deploying.

## Important data note

Seeded schemes are **illustrative demo records** (`isDemoData = true`) based on real public schemes with links to official portals. They are **not** a substitute for the official notification. Citizens must always confirm details on the official government source. The verification workflow exists precisely to stop unverified data from being published.

## Documentation

- [PROJECT_STATUS.md](docs/PROJECT_STATUS.md)
- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)
- [DATABASE_DOCUMENTATION.md](docs/DATABASE_DOCUMENTATION.md)
- [INTEGRATIONS.md](docs/INTEGRATIONS.md)
- [TEST_REPORT.md](docs/TEST_REPORT.md)

## Roadmap

Phases follow the master instruction: UI → backend APIs → discovery → monitoring → AI extraction/translation → admin verification → eligibility → voice → applications/notifications → analytics/offline → security/testing → deployment.
