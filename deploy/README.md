# Deployment

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR: install → build shared →
typecheck → test → validate Prisma schema → build apps. On `main`, it builds the
API and web Docker images (push + `kubectl set image` deploy steps are stubbed
for your registry/cluster).

## Kubernetes (`deploy/k8s`)

```
namespace.yaml     riscly namespace
config.yaml        ConfigMap (non-secret) + Secret template
api.yaml           API Deployment + Service + HPA (CPU 70%) + PodDisruptionBudget
worker.yaml        BullMQ worker Deployment + HPA (scale to 20)
web.yaml           Next.js Deployment + Service + Ingress (TLS via cert-manager)
migrate-job.yaml   prisma migrate deploy (pre-deploy)
```

PostgreSQL is managed (Supabase) and Redis is a managed instance — only the
stateless apps run in-cluster. Provide the real `riscly-secrets` via
sealed-secrets or external-secrets (never commit secrets).

### Apply

```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/config.yaml        # after filling in secrets
kubectl apply -f deploy/k8s/migrate-job.yaml   # wait for completion
kubectl apply -f deploy/k8s/api.yaml -f deploy/k8s/worker.yaml -f deploy/k8s/web.yaml
```

## Observability

Set `OTEL_EXPORTER_OTLP_ENDPOINT` to your collector; the API and worker export
traces (HTTP, Express, queue, and a custom `scan.run` span) — see
`apps/api/src/observability/tracing.ts`. Without the env var, tracing is a
no-op.

## Local

```bash
docker compose up -d            # postgres, redis, api, worker, web
# or: npm run dev               # api + web with the inline queue (no Redis)
```
