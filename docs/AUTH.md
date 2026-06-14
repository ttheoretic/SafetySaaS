# Authentication, Multi-Tenancy & RBAC

Every tenant route is authenticated, scoped to an organization, and gated by
role-based permissions. Mutations are audit-logged.

## Request flow

```
Authorization: Bearer <token>          x-org-id: <orgId>  (optional)
        │                                      │
        ▼                                      ▼
   AuthGuard ── verify token ── resolve user ── resolve active org + role
        │                                      │
        ▼                                      ▼
   req.auth = { user, org, role }   ──▶  PermissionsGuard (@RequirePermission)
                                              │
                                              ▼
                                         controller (org-scoped queries + audit)
```

Both guards are registered globally (`APP_GUARD`). Routes opt out of auth with
`@Public()` (health, the stateless `/analyze/*` utilities).

## Tokens (`auth/jwt.ts`)

Dependency-free, two modes:

- **Production** — verifies Supabase access tokens: HS256 signature against
  `SUPABASE_JWT_SECRET`, plus `exp` and `sub` checks.
- **Local / tests** — when `SUPABASE_JWT_SECRET` is unset, an unsigned
  `dev.<base64url-json>` token is accepted (`devToken({ sub, email, name })`).
  These are **refused** the moment a real secret is configured, so they can't
  leak into production.

## Tenancy & just-in-time onboarding (`auth/auth.service.ts`)

The token identifies the user (`sub`). On first sight the user is created and
given a **personal organization** with an `owner` membership — mirroring a real
signup. The active org for a request is the `x-org-id` header (membership
verified) or the user's first org. `req.auth` carries `{ user, org, role }`.

Every tenant-scoped query filters by `auth.org.id`, and controllers verify that
a referenced project/scan belongs to the caller's org — so one tenant can never
read or mutate another's data (covered by an isolation e2e test). This is the
application-layer equivalent of the Postgres RLS policies in `docs/DATABASE.md`.

## RBAC (`auth/roles.ts`, `auth/permissions.guard.ts`)

| Permission | viewer | member | admin | owner |
|---|:--:|:--:|:--:|:--:|
| `project:read` | ✅ | ✅ | ✅ | ✅ |
| `project:write` | | ✅ | ✅ | ✅ |
| `scan:run` | | ✅ | ✅ | ✅ |
| `connection:write` | | ✅ | ✅ | ✅ |
| `member:manage` | | | ✅ | ✅ |
| `billing:manage` | | | ✅ | ✅ |
| `org:manage` | | | | ✅ |

Routes declare `@RequirePermission('scan:run')`; the guard denies with 403 when
the caller's role lacks it.

## Audit logging (`auth/audit.service.ts`)

Mutating actions (`project.create`, `scan.run`, `connection.create`, …) append
an entry `{ orgId, actorUserId, action, target, metadata }`. Read it via
`GET /api/orgs/audit-logs` (admins+).

## Endpoints added

- `GET /api/me` — user + memberships + active org/role.
- `GET /api/orgs/members` — members of the active org.
- `GET /api/orgs/audit-logs` — audit trail (admins+).

## Tests

- `auth/auth.unit.test.ts` — JWT (dev/HS256/expiry/tamper) + the RBAC matrix.
- `app.e2e.test.ts` — 401 without a token, JIT org provisioning, tenant
  isolation (Bob can't see Alice's project), and audit logging.
