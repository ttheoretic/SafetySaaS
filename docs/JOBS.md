# Background Jobs

Long-running work (scans, and later AI prediction and report rendering) runs
through a job queue so it never blocks an HTTP request or is lost on deploy.

```
POST /scans ──▶ create scan (queued) ──▶ queue.enqueue('scan', …) ──▶ 202-style response
                                                │
                                                ▼
                                         ScanProcessor.handle
                                   queued → running → succeeded / failed
                                                │
GET /scans/:id  ◀───────────── client polls for status ─────────────┘
```

## Driver abstraction (`apps/api/src/jobs`)

`JobQueue` has two implementations, selected by `REDIS_URL`:

- **`InlineJobQueue`** (default) — runs the handler in-process and awaits it, so
  a single-process dev/test deployment is correct without Redis (the scan is
  finished by the time `enqueue` resolves). This is why the e2e tests see a
  `succeeded` scan immediately.
- **`BullJobQueue`** (when `REDIS_URL` is set) — enqueues to Redis with retries
  (3 attempts, exponential backoff) and processes jobs in **Worker** processes,
  out of band and durable across deploys.

The handler code is identical in both modes — `ScanProcessor` registers a
`scan` handler at startup via `queue.process('scan', …)` and the controller
calls `queue.enqueue('scan', …)`.

## Running workers

The API process registers the same processors, so in a single-node or inline
setup nothing else is needed. For horizontal scaling, run dedicated workers:

```bash
npm run worker          # node dist/worker.js — boots the app context, no HTTP
```

`worker.ts` starts the Nest application context without an HTTP server; its
BullMQ workers consume jobs from Redis. `docker-compose.yml` includes a
`worker` service, and in Kubernetes it's a separate Deployment scaled on queue
depth.

## Tests

`apps/api/src/jobs/inline-queue.test.ts` covers handler execution, the
no-handler case and error isolation; the scan e2e test exercises the full
enqueue → process → poll path through the inline driver.
