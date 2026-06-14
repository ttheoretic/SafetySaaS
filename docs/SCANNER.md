# Architecture Scanner

The scanner turns a project's connected providers into a single, analyzable
`SystemGraph`. It is split into two layers along the I/O boundary so the
interesting logic stays pure and testable.

```
 Connections ──▶ Collectors (I/O) ──▶ Signals ──▶ Adapters (pure) ──▶ Fragments
                                                                          │
                                                            mergeFragments │ + connectOrphans
                                                                          ▼
                                                                    SystemGraph ──▶ Engines
```

## 1. Collectors (`apps/api/src/scanner/collectors`)

A `ProviderCollector` does the provider I/O and reduces raw data to normalized
**signals**. `fetch` is injected so collectors are testable without the
network, and every collector is resilient — a failing provider is logged and
skipped, never aborting the whole scan.

* **GithubCollector** — reads each repo's `package.json` via the GitHub
  contents API, extracts dependencies + dev-dependencies, detects frameworks
  (Next.js, NestJS, Express, …) and probes for `Dockerfile` / Kubernetes. With
  no token it falls back to signals pre-declared in the connection metadata, so
  scans are useful offline and in tests.
* **MetadataCollector** — the declarative fallback for billing (Stripe),
  managed databases (Neon, Supabase) and cloud accounts (AWS/GCP/Azure/Vercel/
  Railway/Render), driven by the connection's `metadata`. Live cloud-inventory
  APIs slot in here per provider over time.

`ScannerService.scan()` picks a collector per connection, runs them in
parallel, merges the signals and hands them to the pure scanner.

## 2. Adapters & merge (`packages/shared/src/scanner`)

Pure, deterministic, unit-tested:

* **`SERVICE_HINTS`** — the dependency/env-var → node inference table. This is
  how the scanner "understands an architecture from its code": `pg`/`prisma` →
  PostgreSQL (database), `ioredis` → Redis (cache), `bullmq` → queue, `stripe`
  → Stripe (external API), `openai`/`@anthropic-ai` → LLM provider, etc.
* **`repoFragment`** — builds a frontend and/or API node from detected
  frameworks, wires `frontend → api`, then attaches every inferred backing
  service with a sensible criticality (`database` 1.0, `cache` 0.6, `queue`
  0.7, …). Rate limiting / auth are only asserted when a concrete signal exists
  (a throttler/auth dependency); otherwise they're left **unknown** rather than
  falsely reported as missing.
* **`cloudFragment` / `databaseFragment` / `billingFragment`** — turn the other
  signal types into nodes.
* **`mergeFragments`** — dedupes nodes by id and edges by `(from,to)`. On
  conflict, risk-relevant booleans take the **less-safe** value (a node is only
  `redundant`/`hasBackup` if every source agrees) so a scan never hides a risk;
  edges keep the highest criticality.
* **`buildSystemGraph` → `connectOrphans`** — composes all fragments, then
  wires standalone backing services (e.g. a managed DB discovered by its own
  adapter) into the primary API node so nothing floats disconnected.

The resulting graph drops straight into the reliability, simulation, revenue
and security engines.

## Extending

Adding a provider = one collector (I/O) + optionally extending `SERVICE_HINTS`
or adding a `*Fragment` for a new signal type. The pure layer is covered by
`packages/shared/src/scanner/scanner.test.ts`; the orchestration + a mocked
GitHub API by `apps/api/src/scanner/scanner.service.test.ts`.
