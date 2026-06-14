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
| 4 | AI Failure Prediction     | scaffolded  |
| 5 | Revenue Impact Engine     | implemented |
| 6 | Security Simulation       | implemented |
| 7 | Scenario Laboratory       | scaffolded  |
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
AI-prediction module has a working interface with clearly marked extension
points for the LLM calls.

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

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/DATABASE.md`](docs/DATABASE.md) for the full design.

## License

Proprietary — © FailSafe AI.
