# FailSafe AI — Data Model & Schema Design

PostgreSQL, multi-tenant by `org_id`. Modeled with Prisma
(`prisma/schema.prisma`). This document explains the *why*; the schema file is
the source of truth.

## 1. Tenancy model

```
User ──< Membership >── Organization ──< Project >── Connection
                              │             │
                              │             ├──< Scan >── SystemGraph (JSON)
                              │             ├──< Simulation
                              │             ├──< Finding
                              │             ├──< Recommendation
                              │             ├──< Scenario
                              │             └──< Report
                              ├──< Invitation
                              ├──< AuditLog
                              └──< Subscription (Stripe)
```

* A **User** (mirrored from Supabase Auth) can belong to many **Organizations**
  via **Membership**, which carries the `role`.
* An **Organization** owns **Projects**. Every tenant-scoped row carries
  `org_id` for query scoping and Row-Level Security.
* A **Project** is one analyzed system. It has provider **Connections** and a
  history of **Scans**, each producing a `SystemGraph`, **Findings** and
  derived **Recommendations**, plus **Simulations** and **Reports**.

## 2. Core entities

### User
`id, supabaseId (unique), email, name, avatarUrl, createdAt`
Authoritative identity lives in Supabase; this is a local projection for joins.

### Organization
`id, name, slug (unique), plan (enum), createdAt`
Billing + tenancy boundary.

### Membership
`id, orgId, userId, role (owner|admin|member|viewer), createdAt`
Unique on `(orgId, userId)`. Drives RBAC.

### Project
`id, orgId, name, slug, environment (production|staging|dev), createdAt`
Unique on `(orgId, slug)`.

### Connection
`id, orgId, projectId, provider (enum: github…stripe), status, encryptedToken,
externalAccountId, metadata (JSON), createdAt`
Tokens are stored **encrypted** (envelope encryption); never selected into API
responses. `metadata` holds non-secret provider details (repo list, region…).

### Scan
`id, orgId, projectId, status (queued|running|succeeded|failed), graph (JSON
SystemGraph), startedAt, finishedAt, error, createdAt`
The immutable record of one analysis run. The `graph` JSON is the input to
every engine, so scans are reproducible.

### Finding
`id, orgId, projectId, scanId, category (enum: spof|database|api|backup|
rate_limit|redundancy|security|vendor_lock_in), severity (low|medium|high|
critical), title, description, nodeId, weight (float), createdAt`
Atomic risk facts produced by the reliability/security engines.

### Reliability snapshot
Stored on the Scan as `reliabilityScore (int 0–100)` plus the Findings above,
so the score is always traceable to the findings that produced it.

### Simulation
`id, orgId, projectId, scanId, type (enum: infra_server|infra_region|dns|
db_lock|cache|queue|stripe_down|openai_down|aws_down|cloudflare_down|
traffic_10x|traffic_100x|viral_peak|churn_wave|payment_failure|refund_spike),
params (JSON), status, result (JSON SimulationResult), revenueImpact (JSON),
createdAt`
One simulated scenario and its computed impact.

### Scenario  (Scenario Laboratory)
`id, orgId, projectId, name, prompt, definition (JSON), createdAt`
User-defined "what-if" experiments, possibly composing several simulation
types. `prompt` keeps the natural-language question for AI parsing.

### Recommendation
`id, orgId, projectId, findingId?, title, description, priority (enum),
probability (float 0–1), businessImpact (text), fix (text),
riskReductionPct (int), status (open|planned|done|dismissed), createdAt`
Actionable output; links back to the Finding it resolves.

### Report
`id, orgId, projectId, type (executive|cto|security|full), format (pdf|json),
storageKey, generatedById, createdAt`
Generated artifacts; the rendered file lives in object storage at `storageKey`.

### Subscription
`id, orgId (unique), stripeCustomerId, stripeSubscriptionId, plan, status,
currentPeriodEnd`
Mirrors Stripe state for plan-limit enforcement.

### AuditLog
`id, orgId, actorUserId, action, targetType, targetId, ip, metadata (JSON),
createdAt`
Append-only; powers the Team → Audit Logs page and security reviews.

### Invitation
`id, orgId, email, role, token (unique), invitedById, acceptedAt, createdAt`

## 3. Enumerations

Plans: `starter | growth | pro | enterprise`.
Roles: `owner | admin | member | viewer`.
Severity: `low | medium | high | critical`.
Finding categories, simulation types and providers as listed above. These are
modeled as Prisma `enum`s so they're enforced at the DB level.

## 4. Indexing strategy

* Every tenant-scoped table: composite index leading with `org_id`
  (e.g. `@@index([orgId, projectId, createdAt])`) — every query filters by org.
* `Scan(projectId, createdAt desc)` to fetch latest scan fast.
* `Finding(scanId)`, `Simulation(scanId)` for result fan-out.
* `Membership(orgId, userId)` unique; `Connection(projectId, provider)`.
* JSON `graph` / `result` columns are `jsonb` for partial indexing if needed.

## 5. Row-Level Security (defense in depth)

Application code always scopes by `org_id`, but we additionally enable Postgres
RLS so a bug can't leak across tenants:

```sql
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Project"
  USING (org_id = current_setting('app.current_org', true)::uuid);
```

The API sets `SET LOCAL app.current_org = '<orgId>'` at the start of each
request transaction. The policies ship in `prisma/rls/enable-rls.sql` (an
`app_current_org()` helper + `ENABLE ROW LEVEL SECURITY` + a `tenant_isolation`
policy per tenant table).

**They are intentionally not auto-applied**: enabling RLS before the
per-request GUC is wired would deny all rows. Enablement order is therefore:
(1) wrap each request's DB work in a transaction that runs
`SET LOCAL app.current_org = '<orgId>'` (a request-scoped Prisma client /
interactive transaction in `PrismaStore`), then (2) apply `enable-rls.sql`.
Until then, the application-layer `orgId` scoping (enforced in every controller
and covered by the tenant-isolation e2e test) is the active guarantee.

## 6. Retention & lifecycle

* Scans / simulations are immutable history; pruned per plan (Starter: 30 days,
  Pro+: unlimited) by a scheduled worker.
* `audit_log` retained ≥ 1 year (compliance).
* Reports in object storage expire via lifecycle policy unless pinned.

## 7. Migrations

Prisma Migrate produces SQL migrations checked into `prisma/migrations` (the
initial `0001_init` migration is included). RLS policies and partial indexes
that Prisma can't express are added as raw-SQL migration steps. Migrations run
as a pre-deploy Kubernetes Job (`deploy/k8s/migrate-job.yaml`).

## 8. Repository layer

The API talks to an async `Store` interface (`apps/api/src/store`) with two
implementations selected by `DATABASE_URL`:

- **`PrismaStore`** — PostgreSQL via the generated Prisma client. Maps domain
  records (ISO-string timestamps, JSON result caches on `Scan`/`Scenario`) to
  the rows above.
- **`InMemoryStore`** — used in dev/tests, no database required.

Because both implement the same async contract, controllers are backend-
agnostic and the test suite runs hermetically against the in-memory store.
