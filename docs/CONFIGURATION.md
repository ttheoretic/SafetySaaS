# Configuration & Credentials

Riscly is **fail-soft by design**: with no configuration it runs entirely
locally (in-memory storage, inline job queue, heuristic AI, local billing, dev
sign-in). Each credential you add switches that one subsystem to the real
provider — nothing else changes.

## Where do credentials go?

| Where | What | How it's loaded |
|-------|------|-----------------|
| **`/.env`** (repo root) | All backend (API + worker) variables | Loaded in dev via `node --env-file-if-exists`; in Docker via `env_file: .env`; in Kubernetes via the `riscly-secrets` Secret |
| **`apps/web/.env.local`** | Frontend `NEXT_PUBLIC_*` variables | Auto-loaded by Next.js |

Start from the template: `cp .env.example .env`. Never commit `.env` (it's
git-ignored).

## The full list

| Variable | Subsystem | Required? | Without it (fallback) | Where to get it |
|----------|-----------|-----------|-----------------------|-----------------|
| `DATABASE_URL` | Postgres (Prisma) | Prod | In-memory store | Supabase → Project Settings → Database → Connection string; or Neon |
| `REDIS_URL` | Jobs (BullMQ) | Prod | Inline in-process queue | Upstash / managed Redis / `redis://localhost:6379` |
| `SUPABASE_JWT_SECRET` | Auth | Prod | Dev sign-in (unsigned tokens) | Supabase → Project Settings → API → **JWT Secret** |
| `SUPABASE_URL` | Auth (optional) | No | — | Supabase → Project Settings → API → Project URL |
| `ANTHROPIC_API_KEY` | AI prediction | No | Heuristic predictions only | console.anthropic.com → API Keys |
| `ANTHROPIC_MODEL` | AI prediction | No | `claude-opus-4-8` | — |
| `OPENAI_API_KEY` | AI (alt) | No | — | platform.openai.com → API keys |
| `STRIPE_SECRET_KEY` | Billing | Prod | Local billing provider | dashboard.stripe.com → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Billing | Prod | — | Stripe → Developers → Webhooks → signing secret |
| `STRIPE_PRICE_STARTER` / `_GROWTH` / `_PRO` | Billing | Prod | — | Stripe → Products → each price's ID (`price_…`) |
| `CONNECTION_ENCRYPTION_KEY` | Secrets at rest | **Yes (prod)** | Ephemeral dev key (lost on restart) | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth | No | OAuth disabled (token connections still work) | github.com → Settings → Developer settings → OAuth Apps |
| `OAUTH_REDIRECT_BASE` | OAuth | If using OAuth | `http://localhost:4000` | Your API's public base URL |
| `APP_URL` | OAuth | If using OAuth | `http://localhost:3000` | Your web app's public URL |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Tracing | No | Tracing is a no-op | Your OTLP collector (Grafana/Honeycomb/…) |
| `API_PORT` | API | No | `4000` | — |
| `NEXT_PUBLIC_API_URL` | Web → API | No | `http://localhost:4000` | API base URL (in `apps/web/.env.local`) |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Web (future Supabase login) | No | Dev sign-in | Supabase → API (in `apps/web/.env.local`) |

## When do I need each one?

- **Just to try it locally:** nothing. `npm run dev` → web on `:3000`, API on `:4000`.
- **To persist data across restarts:** `DATABASE_URL` (+ run `npx prisma migrate deploy`).
- **To process scans out-of-band / scale:** `REDIS_URL` (+ run `npm run worker`).
- **Real user login:** `SUPABASE_JWT_SECRET` (and the web `NEXT_PUBLIC_SUPABASE_*` once the Supabase client login is wired).
- **LLM-augmented predictions:** `ANTHROPIC_API_KEY`.
- **Real subscriptions/upgrades:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, the three `STRIPE_PRICE_*`.
- **Connect GitHub via OAuth:** `GITHUB_CLIENT_ID/SECRET`, `OAUTH_REDIRECT_BASE`, `APP_URL`.
- **Always before production:** `CONNECTION_ENCRYPTION_KEY` (so provider tokens survive restarts and are safely encrypted).

## Production

In Kubernetes these live in the `riscly-secrets` Secret (see
`deploy/k8s/config.yaml`) — provide it via sealed-secrets or external-secrets,
never committed. The non-secret values (model, URLs, OTEL endpoint) live in the
`riscly-config` ConfigMap.
