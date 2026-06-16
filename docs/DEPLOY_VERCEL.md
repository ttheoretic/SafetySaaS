# Deploying Riscly (Vercel + Supabase)

Architecture in production:

```
  Browser ──▶ Web (Next.js, Vercel) ──▶ API (NestJS, container host) ──▶ Supabase Postgres
                                              │
                                              ├─ Supabase Auth (JWT verify)
                                              ├─ Stripe (billing + paywall)
                                              ├─ Resend (emails)
                                              └─ Upstash Redis (optional, BullMQ)
```

The **web** is static/SSR on Vercel. The **API** is a long-running server, so it
runs on a container host (Render, Railway, Fly.io, or your own k8s — a
`Dockerfile` is provided at `apps/api/Dockerfile`). Both talk to **Supabase**.

---

## 0. Prerequisites (one-time)

- A Supabase project (Postgres + Auth). You already have one.
- A Stripe account.
- A Resend account + a domain you can add DNS records to.
- A GitHub OAuth App (optional, for connecting repos).

> ⚠️ **Rotate any secret you ever pasted into a chat/log.** Treat them as leaked:
> Supabase DB password, Supabase JWT secret, anon key, Upstash token, Stripe keys.

---

## 1. Database — Supabase (done)

Already configured. For reference, the API needs:

```
DATABASE_URL  = postgres transaction pooler (port 6543, ?pgbouncer=true)
DIRECT_URL    = session/direct host (port 5432) — used only by migrations
```

Run migrations whenever the schema changes:

```bash
npx prisma generate
npx prisma migrate deploy
```

## 2. API host (Render / Railway / Fly)

Deploy `apps/api/Dockerfile`. Required env vars:

| Variable | Value |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Supabase pooler / direct (step 1) |
| `SUPABASE_JWT_SECRET` | Supabase → Settings → API → JWT Secret |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `CONNECTION_ENCRYPTION_KEY` | **required** — `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `CORS_ORIGINS` | your Vercel web URL, e.g. `https://app.riscly.ai` |
| `APP_URL` | same web URL (used for Stripe/OAuth redirects) |
| `OAUTH_REDIRECT_BASE` | the **API** public URL, e.g. `https://api.riscly.ai` |
| `STRIPE_*` | step 4 |
| `RESEND_API_KEY` / `EMAIL_FROM` | step 5 |
| `GITHUB_CLIENT_ID/SECRET` | step 6 |
| `REDIS_URL` | optional (Upstash) — enables BullMQ workers |

The migrate step can run as a release/pre-deploy command: `npx prisma migrate deploy`.

## 3. Web — Vercel

1. Import the repo into Vercel. **Root Directory: leave as the repo root** (`.`).
   `vercel.json` already sets the install/build commands so the shared package
   is built before the web app.
2. Environment variables (Project → Settings → Environment Variables):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | the API public URL (step 2), e.g. `https://api.riscly.ai` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |

3. Deploy. Set your custom domain (e.g. `app.riscly.ai`) and use it as
   `CORS_ORIGINS` / `APP_URL` on the API.

## 4. Stripe (billing + paywall)

The paywall turns **on automatically** once `STRIPE_SECRET_KEY` is set on the API:
new workspaces must subscribe before they can use the app.

1. **Products & prices** — create 3 recurring (monthly) prices in Stripe →
   Products. Copy each price id into the API env:

   ```
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_GROWTH=price_...
   STRIPE_PRICE_PRO=price_...
   ```

   Keep the amounts in sync with `packages/shared/src/plans.ts` (€29 / €99 / €299).

2. **API key** — `STRIPE_SECRET_KEY=sk_live_...` (Developers → API keys).

3. **Webhook** — Stripe → Developers → Webhooks → add endpoint:
   - URL: `https://api.riscly.ai/api/billing/webhook`
   - Event: `checkout.session.completed`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET=whsec_...`

   On a completed checkout the webhook activates the subscription and the
   dashboard unlocks.

> Test mode first: use `sk_test_…`, test price ids, and Stripe's `4242…` card.

## 5. Resend (transactional email)

Invitation emails are logged to the console until Resend is configured.

1. Verify your sending domain in Resend (add the DNS records it shows).
2. On the API:
   ```
   RESEND_API_KEY=re_...
   EMAIL_FROM="Riscly <noreply@yourdomain.com>"
   ```

## 6. GitHub OAuth (connect repos)

Optional — without it, connecting still works via token/metadata.

1. GitHub → Settings → Developer settings → OAuth Apps → New.
   - Authorization callback URL: `https://api.riscly.ai/api/oauth/github/callback`
2. On the API:
   ```
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   OAUTH_REDIRECT_BASE=https://api.riscly.ai
   ```

---

## Go-live checklist

- [ ] Secrets rotated; nothing real committed (`.env` is gitignored).
- [ ] `prisma migrate deploy` run against Supabase.
- [ ] API: `CONNECTION_ENCRYPTION_KEY`, `CORS_ORIGINS`, `APP_URL` set.
- [ ] Web: `NEXT_PUBLIC_API_URL` + Supabase public vars set.
- [ ] Stripe products/prices/webhook live → paywall enforced.
- [ ] End-to-end test: sign up → choose plan → Stripe checkout → dashboard unlocks.
- [ ] Resend domain verified; a test invite arrives.
```
