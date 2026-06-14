# FailSafe AI — System Architecture

## 1. Goals & non-goals

**Goal:** ingest a customer's real system (code, infra, billing), build a
model of it, and *simulate* how it fails under outages, load, security attacks
and business shocks — quantifying reliability, revenue and security risk, and
producing prioritized, actionable recommendations.

**Non-goals (v1):** we do not run live chaos experiments against customer
production. All simulation is performed against the *model* we build, not the
live system. This keeps the product safe, fast and multi-tenant friendly.

## 2. High-level architecture

```
                         ┌─────────────────────────────────────────┐
                         │                Browser                   │
                         │   Next.js 14 dashboard (App Router)      │
                         │   React Query · Zustand · Tailwind       │
                         └───────────────┬─────────────────────────┘
                                         │ HTTPS (JWT via Supabase Auth)
                                         ▼
                    ┌──────────────────────────────────────────────┐
                    │                NestJS API                     │
                    │  REST · Guards (org + RBAC) · OpenTelemetry   │
                    │                                               │
                    │  Modules:                                     │
                    │   auth  orgs  projects  connections           │
                    │   scanner  reliability  simulations           │
                    │   revenue  security  recommendations          │
                    │   scenarios  reports  audit  billing          │
                    └───┬───────────────┬──────────────────┬────────┘
                        │               │                  │
            ┌───────────▼──┐   ┌────────▼────────┐  ┌──────▼───────────┐
            │  PostgreSQL  │   │  Redis + BullMQ │  │  Object storage  │
            │ (multi-tenant│   │   job queues    │  │  (reports/PDFs)  │
            │  via org_id) │   └────────┬────────┘  └──────────────────┘
            └──────────────┘            │
                                        ▼
                    ┌──────────────────────────────────────────────┐
                    │                  Workers                      │
                    │  scan · simulate · predict (LLM) · report     │
                    │  Pure engines from packages/shared            │
                    └───┬───────────────────────────────┬──────────┘
                        │                                │
              ┌─────────▼─────────┐            ┌─────────▼──────────┐
              │ Provider adapters │            │   AI providers     │
              │ GitHub GitLab AWS │            │ OpenAI · Anthropic │
              │ GCP Stripe Vercel │            │  (+ RAG vector DB) │
              └───────────────────┘            └────────────────────┘
```

### Request path vs. work path

* **Request path (synchronous):** dashboard → API → Postgres. Reads, CRUD,
  starting jobs, fetching results. Must be fast (<200ms p95).
* **Work path (asynchronous):** API enqueues a BullMQ job → a worker picks it
  up → runs an engine (scan / simulate / predict / report) → writes results to
  Postgres → emits progress events. Long-running and retryable.

This split is the central architectural decision: scanning a repo or running a
100x-traffic simulation can take seconds-to-minutes and must never block an
HTTP request or be lost on a deploy.

## 3. The engine core (`packages/shared`)

The five analytical engines are implemented as **pure functions** over plain
data models — no I/O, no framework. This is deliberate:

* deterministic → trivially unit-testable and reproducible for reports;
* reusable → same code runs in the API (preview), the workers (full runs), and
  the test suite;
* portable → could later run client-side or at the edge.

```ts
reliabilityScore(graph)            -> ReliabilityResult
simulateFailure(graph, scenario)   -> SimulationResult
revenueImpact(graph, scenario, biz)-> RevenueImpactResult
securitySimulation(graph, attack)  -> SecurityResult
buildRecommendations(findings)     -> Recommendation[]
```

Everything downstream (Postgres rows, API DTOs, PDF reports) is a *projection*
of these result objects.

### System model

A scanned system is represented as a **directed dependency graph**:

```
SystemGraph {
  nodes: SystemNode[]   // service | frontend | api | database | cache |
                        // queue | external_api | cdn | dns | storage
  edges: SystemEdge[]   // from -> to, with a criticality weight
}
```

Each node carries reliability-relevant attributes (`redundant`, `hasBackup`,
`hasRateLimit`, `region`, `provider`, `isSinglePointOfFailure`,
`requestsPerMinute`, …). The engines reason purely over this graph, so the
quality of analysis is a function of how richly the scanner populates it.

## 4. Module responsibilities

| Module | Responsibility |
|--------|----------------|
| **auth** | Verify Supabase JWTs, resolve the user + active org membership. |
| **orgs** | Organizations, members, roles (RBAC), invitations, audit logs. |
| **connections** | OAuth/token storage for providers; encrypted at rest. |
| **scanner** | Provider adapters → normalized `SystemGraph`. Async job. |
| **reliability** | Score 0–100 + risk findings from the graph. |
| **simulations** | Failure / load / business scenarios → impact timelines. |
| **revenue** | €-loss, churn, SLA impact for a scenario. |
| **security** | DDoS / credential-stuffing / abuse simulations + score. |
| **recommendations** | Map findings → prioritized, quantified fixes. |
| **scenarios** | User-defined "what-if" lab, composing the engines. |
| **reports** | Render Executive / CTO / Security PDFs from results. |
| **billing** | Stripe subscriptions, plan limits, usage metering. |

## 5. Multi-tenancy & security

* **Tenant key:** every domain row carries `org_id`. A global Nest guard
  resolves the caller's org from the JWT + membership and a repository layer
  scopes all queries by `org_id`. Postgres **Row-Level Security** policies are
  defined as defense-in-depth (see `docs/DATABASE.md`).
* **RBAC:** roles `owner` / `admin` / `member` / `viewer`. Permissions checked
  by a `@RequirePermission()` decorator + guard.
* **Secrets:** provider tokens are encrypted with envelope encryption
  (AES-256-GCM, KMS-managed key) before storage; never returned to the client.
* **Audit:** every mutating action writes an `audit_log` entry (actor, org,
  action, target, ip, metadata).
* **Isolation of analysis:** we analyze a *model*, never execute customer code.
  Scanning fetches metadata/IaC/manifests, not arbitrary execution.

## 6. AI layer

* **Architecture understanding & prediction:** the scanned graph + repo
  signals are summarized and passed to an LLM (Anthropic Claude / OpenAI) to
  surface non-obvious bottlenecks and future scaling cliffs. Outputs are
  validated against a JSON schema and merged with deterministic heuristics so
  the product degrades gracefully if the LLM is unavailable.
* **RAG:** cloud best-practices, security standards (OWASP, CIS) and the
  customer's own docs are embedded into a vector store; recommendations cite
  retrieved guidance.
* **Default model:** Anthropic `claude-opus-4-8` for deep analysis, a smaller
  model for cheap classification. Provider is abstracted behind an
  `AiProvider` interface.

## 7. Observability & SRE

* **OpenTelemetry** traces across API → queue → worker, exported to an OTLP
  collector. Each job carries a trace context.
* **Metrics:** request latency, queue depth, job duration, engine timings.
* **Health:** `/health` (liveness) and `/health/ready` (DB + Redis checks).
* **SLOs:** API availability 99.9%, p95 read latency < 200ms, scan job success
  rate > 99%. Error budgets tracked per SLO.

## 8. Deployment

* **Containers:** API, web and worker images built from a multi-stage
  `Dockerfile`. Local dev via `docker-compose` (Postgres + Redis).
* **Kubernetes:** Deployments for `api`, `web`, `worker`; HPA on CPU + queue
  depth; PodDisruptionBudgets; Postgres via managed Supabase, Redis managed.
* **CI/CD:** lint → typecheck → test → build images → deploy. Migrations run as
  a pre-deploy job. Blue/green for the API.

## 9. Tech stack

Frontend: Next.js · TypeScript · Tailwind · React Query · Zustand.
Backend: NestJS · TypeScript · Prisma. Data: PostgreSQL. Queue: Redis +
BullMQ. Infra: Docker · Kubernetes. Auth: Supabase. Billing: Stripe.
AI: OpenAI · Anthropic. Observability: OpenTelemetry.
