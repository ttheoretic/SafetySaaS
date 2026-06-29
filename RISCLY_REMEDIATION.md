# Riscly remediation plan

Generated from scan `a31dfa06-81a1-4c6a-921d-7f55e476f4ce` on 2026-06-29T16:05:00.098Z.

**Reliability score:** 0 / 100

**Open findings:** 15 (3 critical · 6 high · 4 medium · 2 low)

## Findings

### [CRITICAL] PostgreSQL is a single point of failure
- **Category:** spof
- **Component:** `postgres`
- PostgreSQL (database) has no redundancy and other components depend on it. Its failure takes down dependent functionality.

### [CRITICAL] bhzyqzcefwlzqaalmocu is a single point of failure
- **Category:** spof
- **Component:** `db-supabase-bhzyqzcefwlzqaalmocu`
- bhzyqzcefwlzqaalmocu (database) has no redundancy and other components depend on it. Its failure takes down dependent functionality.

### [CRITICAL] PostgreSQL has no backups configured
- **Category:** backup
- **Component:** `postgres`
- Data loss in PostgreSQL would be unrecoverable.

### [HIGH] Supabase: email auto-confirm is enabled
- **Category:** security
- mailer_autoconfirm=true means email addresses are never verified, enabling account spoofing and spam sign-ups. Require email confirmation.

### [HIGH] @opentelemetry/auto-instrumentations-node@0.55.3: GHSA-q7rr-3cgh-j5r3
- **Category:** security
- Prometheus exporter process crash via malformed HTTP request Fixed in 0.75.0. (ttheoretic/SafetySaaS)

### [HIGH] @opentelemetry/exporter-prometheus@0.57.2: GHSA-q7rr-3cgh-j5r3
- **Category:** security
- Prometheus exporter process crash via malformed HTTP request Fixed in 0.217.0. (ttheoretic/SafetySaaS)

### [HIGH] @opentelemetry/sdk-node@0.57.2: GHSA-q7rr-3cgh-j5r3
- **Category:** security
- Prometheus exporter process crash via malformed HTTP request Fixed in 0.217.0. (ttheoretic/SafetySaaS)

### [HIGH] Redis has no redundancy
- **Category:** redundancy
- **Component:** `redis`
- Redis (cache) runs as a single instance; its failure degrades the system.

### [HIGH] Job Queue has no redundancy
- **Category:** redundancy
- **Component:** `queue`
- Job Queue (queue) runs as a single instance; its failure degrades the system.

### [MEDIUM] Container runs as root
- **Category:** security
- No non-root `USER` is set in the Dockerfile, so the container runs as root — a privilege-escalation risk if the app is compromised. Add a dedicated `USER`.

### [MEDIUM] Supabase: open user sign-up is enabled
- **Category:** security
- Anyone can create an account (disable_signup=false). If self-service sign-up is not intended, disable it or gate it behind an allowlist/invite flow.

### [MEDIUM] @nestjs/core@10.4.22: GHSA-36xv-jgw5-4q75
- **Category:** security
- @nestjs/core Improperly Neutralizes Special Elements in Output Used by a Downstream Component ('Injection') Fixed in 11.1.18. (ttheoretic/SafetySaaS)

### [MEDIUM] @opentelemetry/core@1.30.1: GHSA-8988-4f7v-96qf
- **Category:** security
- OpenTelemetry Core: Unbounded memory allocation in W3C Baggage propagation Fixed in 2.8.0. (ttheoretic/SafetySaaS)

### [LOW] Stripe vendor lock-in (stripe)
- **Category:** vendor_lock_in
- **Component:** `stripe`
- Stripe relies on stripe with no documented fallback; an outage or pricing change has no mitigation.

### [LOW] bhzyqzcefwlzqaalmocu vendor lock-in (supabase)
- **Category:** vendor_lock_in
- **Component:** `db-supabase-bhzyqzcefwlzqaalmocu`
- bhzyqzcefwlzqaalmocu relies on supabase with no documented fallback; an outage or pricing change has no mitigation.

## Recommended fixes

### Fix: PostgreSQL has no backups configured
- **Priority:** critical
- **Risk reduction:** ~60%
- **Business impact:** Turns catastrophic data loss into a recoverable incident.
- **Fix:** Enable automated backups with point-in-time recovery and test restores.

### Fix: PostgreSQL is a single point of failure
- **Priority:** critical
- **Risk reduction:** ~37%
- **Business impact:** Eliminates a total-outage path; protects revenue during component failure.
- **Fix:** Introduce redundancy: add a replica/second instance and automatic failover.

### Fix: bhzyqzcefwlzqaalmocu is a single point of failure
- **Priority:** critical
- **Risk reduction:** ~37%
- **Business impact:** Eliminates a total-outage path; protects revenue during component failure.
- **Fix:** Introduce redundancy: add a replica/second instance and automatic failover.

### Fix: Supabase: email auto-confirm is enabled
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: @opentelemetry/auto-instrumentations-node@0.55.3: GHSA-q7rr-3cgh-j5r3
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: @opentelemetry/exporter-prometheus@0.57.2: GHSA-q7rr-3cgh-j5r3
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: @opentelemetry/sdk-node@0.57.2: GHSA-q7rr-3cgh-j5r3
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Redis has no redundancy
- **Priority:** high
- **Risk reduction:** ~30%
- **Business impact:** Removes a single-instance failure that degrades the system.
- **Fix:** Run the component clustered/replicated with persistence.

### Fix: Job Queue has no redundancy
- **Priority:** high
- **Risk reduction:** ~30%
- **Business impact:** Removes a single-instance failure that degrades the system.
- **Fix:** Run the component clustered/replicated with persistence.

### Fix: Container runs as root
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Supabase: open user sign-up is enabled
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: @nestjs/core@10.4.22: GHSA-36xv-jgw5-4q75
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: @opentelemetry/core@1.30.1: GHSA-8988-4f7v-96qf
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Stripe vendor lock-in (stripe)
- **Priority:** low
- **Risk reduction:** ~15%
- **Business impact:** Limits exposure to third-party outages and pricing changes.
- **Fix:** Abstract the dependency behind an interface and document a fallback.

### Fix: bhzyqzcefwlzqaalmocu vendor lock-in (supabase)
- **Priority:** low
- **Risk reduction:** ~15%
- **Business impact:** Limits exposure to third-party outages and pricing changes.
- **Fix:** Abstract the dependency behind an interface and document a fallback.

---

_This plan was generated automatically by [Riscly](https://riscly.ai). Review and adjust before acting._