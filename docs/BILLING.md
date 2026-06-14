# Billing & Plan Limits

Subscription tiers with enforced limits, backed by Stripe in production and a
local provider in dev/tests.

## Plans (`packages/shared/src/plans.ts`)

| Plan | Price | Projects | Scans/day | AI predictions | PDF reports | Members |
|------|------:|---------:|----------:|:--:|:--:|--------:|
| Starter | 29 € | 1 | 10 | – | – | 2 |
| Growth | 99 € | 5 | 100 | ✅ | ✅ | 10 |
| Pro | 299 € | 25 | 1000 | ✅ | ✅ | 50 |
| Enterprise | Custom | ∞ | ∞ | ✅ | ✅ | ∞ |

Pure helpers (`canCreateProject`, `canAddMember`, `hasFeature`) are unit-tested
so the API, the pricing UI and the limit checks never drift apart.

## Provider abstraction (`apps/api/src/billing`)

`BillingProvider` mirrors the AI-provider pattern:

- **`StripeBillingProvider`** (when `STRIPE_SECRET_KEY` is set) — creates
  Checkout Sessions (`STRIPE_PRICE_<PLAN>` env → price id) and verifies webhook
  signatures, normalizing `checkout.session.completed` into a `plan_changed`
  event.
- **`NullBillingProvider`** (default) — checkout returns a stub URL and the
  webhook accepts a plain `{ orgId, plan }` body, so the full upgrade flow is
  exercisable without Stripe.

`BillingService` exposes plan + limits + live usage, applies plan-change events
(updates the org plan + subscription record), and enforces limits.

## Enforcement

`assertCanCreateProject` is called in the projects controller — exceeding the
plan's `maxProjects` returns **403** with an upgrade hint. (Covered by an e2e
test: a starter org creates one project, is blocked on the second, then
succeeds after a `pro` upgrade via the webhook.)

## Endpoints

- `GET /api/billing` — plan, limits, usage (`project:read`).
- `POST /api/billing/checkout` `{ plan }` — Checkout URL (`billing:manage`).
- `POST /api/billing/webhook` — public; Stripe-signature-verified (or dev JSON)
  → updates the org's plan.

## Tests

- `packages/shared/src/plans.test.ts` — the limit matrix.
- `app.e2e.test.ts` — limit enforcement + upgrade, checkout, billing summary.
