# Going to Production

What's needed to take FailSafe AI live for real customers. The application is
fail-soft — everything below is about **connecting services and deploying**,
not new features.

## Code status

| Area | Status |
|------|--------|
| Real login (Supabase) | ✅ wired — set `NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY` (web) + `SUPABASE_JWT_SECRET` (api) |
| PostgreSQL persistence | ✅ `PrismaStore` — set `DATABASE_URL`, run `prisma migrate deploy` |
| Background jobs | ✅ BullMQ — set `REDIS_URL`, run `npm run worker` |
| Billing | ✅ Stripe Checkout + signed, **idempotent** webhooks |
| Secret encryption | ✅ set `CONNECTION_ENCRYPTION_KEY` |
| CORS + rate limiting | ✅ `CORS_ORIGINS`, `RATE_LIMIT_PER_MIN` |
| Email (invitations) | ✅ Resend — set `RESEND_API_KEY`, `EMAIL_FROM` |
| Observability | ✅ OpenTelemetry — set `OTEL_EXPORTER_OTLP_ENDPOINT` |
| RLS (defense in depth) | ⚠️ policies in `prisma/rls/enable-rls.sql`; enable after wiring the per-request `app.current_org` GUC |

## Go-live checklist

1. **Provision managed services**: Postgres (Supabase/Neon), Redis (Upstash).
2. **Set secrets** (see `docs/CONFIGURATION.md`): `DATABASE_URL`, `REDIS_URL`,
   `SUPABASE_JWT_SECRET`, `CONNECTION_ENCRYPTION_KEY`, and the web
   `NEXT_PUBLIC_SUPABASE_*`.
3. **Run migrations**: `npx prisma migrate deploy` (the `migrate` K8s Job does this).
4. **Stripe live**: create products + prices, set `STRIPE_SECRET_KEY`,
   `STRIPE_PRICE_*`, register the webhook → `STRIPE_WEBHOOK_SECRET`.
5. **Deploy**: build the API/web images (CI does this), push to your registry,
   apply `deploy/k8s/*` (or Vercel for web + Fly/Railway for api+worker).
6. **Domain + TLS**: point DNS, the Ingress + cert-manager issue certs. Set
   `APP_URL`, `OAUTH_REDIRECT_BASE`, `NEXT_PUBLIC_API_URL`, `CORS_ORIGINS`.
7. **GitHub OAuth** (optional): create the OAuth App, set `GITHUB_CLIENT_*`.
8. **Anthropic** (optional): `ANTHROPIC_API_KEY` for LLM predictions.
9. **Email**: `RESEND_API_KEY` + verify the sending domain.

## Before real customers (operational/legal)

- DB **backups** + a tested restore.
- **Error monitoring** (e.g. Sentry) + uptime alerts; wire the OTLP collector.
- **Legal**: privacy policy, terms, DPA with subprocessors, cookie/consent.
- Enable **RLS** once the request-scoped org context is wired.
- Secret rotation policy for `CONNECTION_ENCRYPTION_KEY` and provider tokens.

## Still optional (post-launch)

Live cloud-inventory scanning (AWS/GCP), SSO/SCIM, report → object storage,
load testing.
