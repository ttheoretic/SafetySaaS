# FailSafe AI

> **"Find problems before they happen."**

FailSafe AI analyzes SaaS products and simulates future outages, scaling
problems, revenue loss and infrastructure risks. It connects to a team's
code hosting, cloud and billing providers, builds a dependency graph of the
system, scores its reliability, and runs failure / load / security / business
simulations to surface risk **before** real customers are affected.

This repository is a **TypeScript monorepo**.

```
failsafe-ai/
├── apps/
│   ├── api/          # NestJS backend (REST API, engines, workers)
│   └── web/          # Next.js 14 dashboard (App Router)
├── packages/
│   └── shared/       # Shared types + the pure-domain engine logic
├── docs/
│   ├── ARCHITECTURE.md   # Full system architecture
│   └── DATABASE.md       # Data model + schema design
├── prisma/
│   └── schema.prisma     # Multi-tenant PostgreSQL schema
└── docker-compose.yml
```

## Modules

| # | Module                    | Status      |
|---|---------------------------|-------------|
| 1 | Architecture Scanner      | implemented |
| 2 | Reliability Score Engine  | implemented |
| 3 | Failure Simulation Engine | implemented |
| 4 | AI Failure Prediction     | implemented |
| 5 | Revenue Impact Engine     | implemented |
| 6 | Security Simulation       | implemented |
| 7 | Scenario Laboratory       | implemented |
| 8 | Recommendations Engine    | implemented |

The scanner, reliability, simulation, revenue, security and recommendations
engines are implemented as **pure, deterministic, fully-tested domain logic**
in `packages/shared` so they can be reused by the API, the workers and tested
in isolation.

The **Architecture Scanner** is split in two: pure graph-construction
(adapters + merge in `packages/shared/src/scanner`, fully unit-tested) and the
I/O **collectors** in `apps/api/src/scanner/collectors` that fetch real signals
from each provider (e.g. the GitHub collector reads `package.json` to infer the
frontend, API and every backing service). A scan composes all of a project's
connections into one `SystemGraph`, then feeds it straight to the engines. The
**AI Failure Prediction** runs in two layers: a deterministic heuristic
predictor in `packages/shared` (always on, fully tested) and an `AiProvider`
abstraction in the API whose Anthropic implementation (`claude-opus-4-8`,
adaptive thinking, schema-constrained output) augments it with non-obvious
predictions. With no `ANTHROPIC_API_KEY` it degrades gracefully to the
heuristics — the feature always works.

## Quick start

```bash
# 1. Install
npm install

# 2. Run the test suite (pure engines, no infra needed)
npm test -w packages/shared

# 3. Boot infra (Postgres + Redis) and the apps
docker compose up -d postgres redis
npm run dev          # api on :4000, web on :3000
```

## Platform features

Beyond the eight analytical modules, the API implements:

- **Auth + multi-tenancy + RBAC** — Supabase-JWT (HS256) verification with a
  dev-token fallback, just-in-time org provisioning, per-tenant data isolation,
  a role/permission matrix and audit logging. See [`docs/AUTH.md`](docs/AUTH.md).
- **Billing + plan limits** — Starter/Growth/Pro/Enterprise tiers with enforced
  limits, a Stripe provider (Checkout + webhooks) and a local fallback. See
  [`docs/BILLING.md`](docs/BILLING.md).
- **Reports** — Executive/CTO/Security/Full reports as JSON, HTML or PDF
  (dependency-free PDF writer).
- **Background jobs** — scans run through a job queue: BullMQ (Redis) in
  production, an in-process inline driver in dev/tests. See
  [`docs/JOBS.md`](docs/JOBS.md).
- **Persistence** — an async `Store` interface with two backends: `PrismaStore`
  (PostgreSQL, when `DATABASE_URL` is set) and `InMemoryStore` (dev/tests). An
  initial Prisma migration ships in `prisma/migrations`.
- **Observability** — OpenTelemetry tracing across API → queue → worker
  (no-op unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set).

## Documentation

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`docs/DATABASE.md`](docs/DATABASE.md), [`docs/SCANNER.md`](docs/SCANNER.md),
[`docs/AI_PREDICTION.md`](docs/AI_PREDICTION.md) and
[`docs/AUTH.md`](docs/AUTH.md) for the full design.

## License

Proprietary — © FailSafe AI.
