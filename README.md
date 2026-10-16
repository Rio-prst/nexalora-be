# Nexalora — Backend

[![CI](https://github.com/Rio-prst/nexalora-be/actions/workflows/ci.yml/badge.svg)](https://github.com/Rio-prst/nexalora-be/actions/workflows/ci.yml)

Backend REST API for **Nexalora** — a study and career exploration tool that helps senior
high school students (grades XI–XII) make informed decisions about university majors,
campuses, and career paths.

Built for the JOINTS UGM 2026 hackathon (Education track).

---

## Table of Contents

- [What is Nexalora](#what-is-nexalora)
- [What it is not](#what-it-is-not)
- [Tech Stack](#tech-stack)
- [Architecture at a Glance](#architecture-at-a-glance)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Available Scripts](#available-scripts)
- [Testing Strategy](#testing-strategy)
- [Project Structure](#project-structure)
- [Project Status](#project-status)
- [Documentation](#documentation)

---

## What is Nexalora

Nexalora connects four stages of study exploration into one continuous journey:

1. **Know Yourself** — map activity interests (a 12-item instrument), optional academic
   records, and honest cost/location boundaries.
2. **Feel the Learning** — try short simulations of real problems from the perspective
   of three majors: Informatics, Industrial Engineering, and Visual Communication Design.
3. **Reconsider the Options** — reflect after each mission and preview how the
   recommendation order changes; test *what-if* cost and location scenarios.
4. **Plan the Next Step** — connect study choices to career roles and generate a
   measurable 30-day action plan.

The core value proposition is **transparent reasoning**, not black-box scoring. Every
recommendation comes with an explicit reason, the data completeness status, and the
practical cost feasibility — each returned as a **separate dimension**, never merged
into a single "match percentage".

## What it is not

These are hard product constraints, not disclaimers:

| Not this | Why |
|---|---|
| Not a psychological or IQ test | No validated psychometrics are used |
| Not an admission predictor | `admissionProbability` is always `null` — never computed |
| Not a talent diagnosis | Simulations inform exploration, they do not diagnose ability |
| Not an automated scholarship application portal | |
| Not a nationwide campus catalogue | MVP scope only: 3 majors, ~6 program-campus pairs |

The system **never** merges interest, grades, and cost into one "match percentage" score,
and never claims a student is "unsuited" for a major. Interest relevance, academic
readiness, and cost feasibility are always reported as independent dimensions.

---

## Tech Stack

| Area | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5.9 (ESM, strict mode) |
| Runtime | Node.js 22 |
| Package manager | pnpm 11 |
| Validation | [Zod](https://zod.dev) 4 — used instead of `class-validator` |
| ORM | [Prisma](https://www.prisma.io) 7 with the `prisma-client` generator |
| Database driver | `@prisma/adapter-pg` (Prisma 7 requires an explicit driver adapter) |
| Database | PostgreSQL (Supabase Cloud) |
| Auth | Supabase JWT, HS256 verification, global `JwtAuthGuard` |
| Validation of HTTP output | `@nestjs/swagger` (OpenAPI, served at `/docs`) |
| Unit tests | Jest 30 + ts-jest (ESM mode) |
| Integration tests | Jest against a real PostgreSQL test schema |
| API tests | Supertest 7 |
| Lint / format | ESLint 9 + Prettier 3 |

### Why these choices

- **ESM over CommonJS** — `package.json` sets `"type": "module"`. Import specifiers use
  explicit `.js` extensions under `moduleResolution: "nodenext"` so emitted code is valid
  for Node's ESM loader at runtime.
- **Prisma `prisma-client` generator** — generates plain TypeScript into
  `src/generated/prisma`, which is then compiled together with the rest of the app.
  The generator is configured with `importFileExtension = "ts"` so the `tsx`-run seed
  script can resolve its imports; `allowImportingTsExtensions` and
  `rewriteRelativeImportExtensions` in `tsconfig.json` are the matching compiler flags.
- **Driver adapters** — Prisma 7 dropped `datasourceUrl` / `datasources.db.url`. The
  runtime connection is created via `new PrismaPg({ connectionString })`.

---

## Architecture at a Glance

A **modular monolith**. Each product capability is a NestJS module directly under
`src/<module-name>/`.

```
HTTP request
    ↓
ZodValidationPipe          validates input at the system boundary
    ↓
Controller                 HTTP adapter only — no business rules
    ↓
Service                    use cases, business rules, orchestration, transactions
    ↓
Repository (interface)     I<Entity>Repository + DI token
    ↓
PrismaService              the only layer that touches PostgreSQL
```

Dependencies flow in one direction only. Services depend on repository **interfaces**,
never on Prisma implementations. Deterministic calculations (recommendation scoring,
cost modelling, simulation runners, the 30-day planner) live as pure TypeScript
functions inside their own module and are unit-tested without any database access.

Planned modules: `auth`, `profile`, `interests`, `catalog`, `recommendations`,
`simulations`, `reflections`, `comparisons`, `careers`, `plans`, `passports`, `audit`,
`health`, plus `common/` and `infra/prisma`.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full specification.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 20.19 (22.x recommended) | Prisma 7 minimum is 20.19.0 |
| pnpm | ≥ 9 (11 recommended) | This is a pnpm workspace |
| PostgreSQL | 14+ | Supabase Cloud or local |
| Supabase project | — | Required for authentication (JWT issuing) |

Verified working combination: Node v22.14.0, pnpm 11.9.0, TypeScript 5.9.3.

### Supabase-specific notes

- `DIRECT_URL` points at the **direct** connection because the Prisma CLI needs advisory
  locks, which are incompatible with connection pooling. If the direct host is
  IPv6-only and unreachable from your machine, use the Session Pooler on port `5432`
  for migrations as well.
- Prisma 7 uses `node-pg` instead of the Rust engine, so TLS certificate validation is
  stricter than in Prisma 6. If you hit `P1010 User was denied access`, configure
  `ssl: { rejectUnauthorized: false }` on the `PrismaPg` adapter, or set
  `NODE_EXTRA_CA_CERTS`.
- A fresh Supabase project ships pre-existing enums in the `public` schema. This causes
  Prisma's first `migrate dev` to report schema drift — run `pnpm db:reset` once to
  clear it.

---

## Installation

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd nexalora-be
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in the placeholders in `.env`:

| Placeholder | Replace with |
|---|---|
| `PROJECT_REF` | Your Supabase project reference (e.g. `abcdefghijklmnop`) |
| `PASSWORD` | Your database password |
| `REGION` | Your Supabase region (e.g. `ap-southeast-1`) |
| `JWT_SECRET` | Your project's JWT secret from the Supabase dashboard |

### 3. Set up the database

```bash
pnpm run prisma:migrate      # applies migrations (creates the 25 tables)
pnpm run prisma:generate     # generates the Prisma client into src/generated/prisma
```

Both are required. Prisma 7 no longer runs `generate` automatically after `migrate dev`.

### 4. Seed reference data

```bash
pnpm run prisma:seed
```

Seeds the public catalogue: sources, majors, universities, programs, cost profiles,
curricula, scholarships, missions, careers, and skills. Safe to run repeatedly —
every insert is an upsert.

Seeded rows are marked `publicationStatus = DRAFT`, so `GET /api/catalog` stays
empty until a curator verifies them. Tuition figures in the seed are **placeholders**,
not verified data. For a local demo, override the status when seeding:

```bash
# PowerShell
$env:SEED_PUBLICATION_STATUS='PUBLISHED'; pnpm run prisma:seed

# bash
SEED_PUBLICATION_STATUS=PUBLISHED pnpm run prisma:seed
```

---

## Environment Variables

`.env.example` documents every variable. Summary:

| Variable | Used by | Purpose |
|---|---|---|
| `NODE_ENV` | app | Runtime environment |
| `PORT` | app | HTTP port (default `3000`) |
| `DATABASE_URL` | **runtime app** | PostgreSQL connection string used by the Prisma driver adapter |
| `DIRECT_URL` | **Prisma CLI only** | Migration connection; direct or Session Pooler |
| `DATABASE_URL_TEST` | `pnpm test:integration` | Isolated schema (e.g. `?schema=test`) for repository integration tests |
| `JWT_SECRET` | auth | Supabase JWT secret used for HS256 verification |
| `JWT_EXPIRES_IN` | auth | Token lifetime |
| `SEED_PUBLICATION_STATUS` | `prisma:seed` | Publication status for seeded catalogue rows (default `DRAFT`) |
| `SEED_REVIEW_STATUS` | `prisma:seed` | Review status written to seeded `sources` rows (default `PENDING`) |

`.env` is git-ignored and must never be committed.

---

## Database Setup

The schema is defined in [`prisma/schema.prisma`](prisma/schema.prisma) and documented in
[`docs/DATABASE.md`](docs/DATABASE.md).

**25 tables across two zones:**

- **Public catalogue (13)** — sources, majors, universities, programs, cost profiles,
  curricula, scholarships, missions, careers, skills, and two junction tables.
  Every campus fact must reference a `source` with a verifiable year and check date.
- **Private student data (12)** — profiles, consents, academic records, interest
  submissions, recommendation runs, attempts, reflections, shortlists, scenarios,
  plans, tasks, passports.
- **Audit (1)** — `audit_logs`.

Key design decisions:

- **Ownership cascade** — every private table has `ON DELETE CASCADE` to
  `profiles.user_id`, so deleting a student's data is a single transaction.
- **Optimistic locking** — `version` / `revision` columns on profiles, attempts,
  reflections, plans, tasks, and shortlists; stale writes are rejected with
  `409 VERSION_CONFLICT`.
- **Idempotency** — `@@unique([user_id, idempotency_key])` on `attempts` and `plans`
  makes retried `POST` requests safe.
- **Null is not zero** — unknown costs are stored as `null` and surface as
  `INSUFFICIENT_DATA`, never as Rp 0 or a false `WITHIN_BUDGET` result.

---

## Running the Application

```bash
pnpm run start:dev      # watch mode
pnpm run start:debug    # watch mode with debugger
pnpm run start:prod     # production build (requires pnpm run build first)
```

The server starts on `http://localhost:3000`.

| Endpoint | Description |
|---|---|
| `GET /api/health` | Liveness probe. Performs no database query. |
| `GET /api/health/ready` | Readiness probe. Runs `SELECT 1` against PostgreSQL. |
| `GET /api/catalog` | Published majors and programs. Public. |
| `GET /api/catalog/programs/:id` | One program with costs, curriculum, and sources. Public. |
| `GET /api/profile` | The authenticated student's profile, academic records, and consents. |
| `PATCH /api/profile` | Update profile, records, and consent. Requires `expectedVersion`. |
| `POST /api/interests` | Store an immutable 12-item activity-interest submission. |
| `DELETE /api/account-data` | Delete every private record for the authenticated account. |
| `GET /docs` | Interactive Swagger UI. |

All routes except `/api/health`, `/api/health/ready`, and `/api/catalog*`
require a Supabase access token. Authorize once in Swagger and the session
keeps it.

Every response uses the envelope from [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md):

```json
{ "data": {}, "meta": { "requestId": "req_..." } }
```

```json
{ "error": { "code": "VERSION_CONFLICT", "message": "...", "requestId": "req_..." } }
```

An `X-Request-Id` is always generated or preserved from the incoming request.

---

## Available Scripts

| Script | Description |
|---|---|
| `pnpm run build` | Compile TypeScript to `dist/` |
| `pnpm run start:dev` | Start in watch mode |
| `pnpm run start:prod` | Run the compiled build |
| `pnpm run lint` | Lint `src/` and `test/` |
| `pnpm run lint:fix` | Lint and auto-fix fixable issues |
| `pnpm run format` | Format with Prettier |
| `pnpm run typecheck` | Type-check without emitting |
| `pnpm test` | Unit tests only — never touches the database |
| `pnpm run test:watch` | Unit tests in watch mode |
| `pnpm run test:cov` | Unit tests with coverage |
| `pnpm run test:integration` | Repository integration tests against a real database |
| `pnpm run test:e2e` | End-to-end API tests with Supertest |
| `pnpm run prisma:migrate` | Create and apply a migration |
| `pnpm run prisma:deploy` | Apply migrations (production) |
| `pnpm run prisma:generate` | Generate the Prisma client |
| `pnpm run prisma:seed` | Load reference data |
| `pnpm run db:reset` | Drop and recreate the database schema |

---

## Testing Strategy

Three layers, each with a strict isolation rule:

| Layer | Location | Database | Command |
|---|---|---|---|
| **Unit** | `src/<module>/*.spec.ts`, beside the code | Never | `pnpm test` |
| **Integration** | `src/<module>/*.repository.integration-spec.ts` | Real PostgreSQL (`DATABASE_URL_TEST`) | `pnpm run test:integration` |
| **E2E** | `test/*.e2e-spec.ts` | Real PostgreSQL | `pnpm run test:e2e` |

Unit tests mock every repository interface and external dependency — the database must
never be touched. Integration tests hit a real database and are explicitly forbidden from
mocking `PrismaService`; they prove CRUD, ownership filters, unique constraints, optimistic
concurrency under races, and transactional rollback actually work.

Integration specs are excluded from `pnpm test` by `testPathIgnorePatterns`, so a plain
unit-test run never requires a database connection.

A mandatory suite of scenarios is defined in [`docs/BUSSINES-RULES.md`](docs/BUSSINES-RULES.md)
(codes `T01`–`T16`).

---

## Project Structure

```
.
├── prisma/
│   ├── schema.prisma           # 25 models, 8 enums
│   ├── migrations/             # versioned SQL migrations
│   ├── seed.ts                 # catalogue seed entrypoint
│   └── seed/                   # seed data per zone
├── src/
│   ├── main.ts                 # entrypoint: Swagger and the process bootstrap
│   ├── bootstrap.ts            # global prefix, CORS, filters — shared with e2e
│   ├── app.module.ts
│   ├── auth/                   # Supabase token verification (IAuthService)
│   ├── common/                 # cross-cutting: pipes, filters, guards, decorators
│   │   ├── types/              # AuthenticatedUser, Role, API envelopes
│   │   ├── errors/             # AppError and the documented error codes
│   │   ├── decorators/         # @Public, @Roles, @CurrentUser, @IdempotencyKey
│   │   ├── guards/             # JwtAuthGuard (Supabase HS256), RolesGuard
│   │   ├── filters/            # GlobalExceptionFilter
│   │   ├── middleware/         # request-id middleware
│   │   ├── openapi/            # Zod-to-OpenAPI schema projection
│   │   └── pipes/              # ZodValidationPipe
│   ├── infra/prisma/           # PrismaService + PrismaModule (driver adapter)
│   ├── health/                 # liveness and readiness probes
│   ├── generated/prisma/       # Prisma client output — git-ignored
│   └── <module-name>/          # one folder per product capability
│       ├── dto/                # Zod schemas
│       ├── interfaces/         # I<Entity>Repository / I<Entity>Service contracts
│       ├── <entity>.controller.ts
│       ├── <entity>.service.ts
│       ├── <entity>.repository.ts
│       └── *.spec.ts           # tests sit beside the code
├── test/
│   ├── health.e2e-spec.ts
│   ├── jest-e2e.json
│   └── jest-integration.json
├── docs/                       # product and engineering specifications
├── prisma.config.ts            # Prisma CLI configuration (Prisma 7)
└── .env.example
```

---

## Project Status

The core infrastructure is in place. Completed:

- [x] Product and engineering specifications (`docs/`)
- [x] NestJS 11 + TypeScript ESM foundation
- [x] Prisma 7 setup with driver adapter and `prisma.config.ts`
- [x] 25-table database schema, initial migration applied
- [x] Reference catalogue seed data (`prisma/seed.ts`)
- [x] `infra/prisma` - `PrismaService` and `PrismaModule`
- [x] `common/` - Zod validation, global exception filter, request ID, JWT/roles guards
- [x] `auth/` - Supabase HS256 token verification and principal resolution
- [x] `profile` module (`GET`/`PATCH /api/profile`, `DELETE /api/account-data`)
- [x] `interests` module (`POST /api/interests`, immutable submissions and dimension coverage)
- [x] `catalog` module (`GET /api/catalog`, `GET /api/catalog/programs/:id`, public and publication-gated)
- [x] `health` module and Swagger at `/docs`
- [x] Jest unit / integration / e2e test separation
- [x] GitHub Actions verification on every push

Not yet implemented:

- [ ] `recommendations`, `simulations`, `reflections`, `comparisons` modules
- [ ] `careers`, `plans`, `passports`, `audit` modules

Catalogue seed rows are written as `DRAFT`, so `GET /api/catalog` returns
nothing until you re-seed with `SEED_PUBLICATION_STATUS=PUBLISHED`.

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Product requirements, scope, user flows, acceptance tests |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layering, module responsibilities, naming conventions, testing rules |
| [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md) | All 22 endpoints, error codes, request/response payloads |
| [`docs/BUSSINES-RULES.md`](docs/BUSSINES-RULES.md) | Formulas, heuristics, business rules, test matrix `T01`–`T16` |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Every table, column, constraint, index, and design decision |
| [`docs/ERD.md`](docs/ERD.md) | Entity relationship diagrams |
| [`docs/DOMAIN-CONTEXT.md`](docs/DOMAIN-CONTEXT.md) | Glossary, roles, and hard product constraints |

> Note: `docs/BUSSINES-RULES.md` is misspelled in the filename; it is kept as-is to avoid
> breaking existing links in the other documents.

---