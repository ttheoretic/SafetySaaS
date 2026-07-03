# Riscly remediation plan

Generated from scan `3cae8693-6355-4b61-ac9c-76486881c183` on 2026-06-27T00:26:32.745Z.

**Reliability score:** 0 / 100

**Open findings:** 18 (3 critical · 7 high · 5 medium · 3 low)

## Findings

### [CRITICAL] PostgreSQL is a single point of failure
- **Category:** spof
- **Component:** `postgres`
- PostgreSQL (database) has no redundancy and other components depend on it. Its failure takes down dependent functionality.

### [CRITICAL] Supabase is a single point of failure
- **Category:** spof
- **Component:** `supabase-db`
- Supabase (database) has no redundancy and other components depend on it. Its failure takes down dependent functionality.

### [CRITICAL] PostgreSQL has no backups configured
- **Category:** backup
- **Component:** `postgres`
- Data loss in PostgreSQL would be unrecoverable.

### [HIGH] TLS verification disabled
- **Category:** security
- `rejectUnauthorized: false` disables certificate validation and enables MITM attacks. Keep TLS verification on.

### [HIGH] Possible command injection
- **Category:** security
- A shell command (exec) is built from a non-constant value. Pass arguments as an array and never interpolate untrusted input into a shell string.

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

### [MEDIUM] Raw HTML injection (XSS risk)
- **Category:** security
- Assigning raw HTML can introduce XSS. Sanitize the input or render it as text.

### [MEDIUM] Weak randomness for a secret
- **Category:** security
- `Math.random()` is not cryptographically secure. Use `crypto.randomBytes`/`crypto.getRandomValues` for tokens.

### [MEDIUM] @nestjs/core@10.4.22: GHSA-36xv-jgw5-4q75
- **Category:** security
- @nestjs/core Improperly Neutralizes Special Elements in Output Used by a Downstream Component ('Injection') Fixed in 11.1.18. (ttheoretic/SafetySaaS)

### [MEDIUM] @opentelemetry/core@1.30.1: GHSA-8988-4f7v-96qf
- **Category:** security
- OpenTelemetry Core: Unbounded memory allocation in W3C Baggage propagation Fixed in 2.8.0. (ttheoretic/SafetySaaS)

### [LOW] Supabase vendor lock-in (supabase)
- **Category:** vendor_lock_in
- **Component:** `supabase-db`
- Supabase relies on supabase with no documented fallback; an outage or pricing change has no mitigation.

### [LOW] Stripe vendor lock-in (stripe)
- **Category:** vendor_lock_in
- **Component:** `stripe`
- Stripe relies on stripe with no documented fallback; an outage or pricing change has no mitigation.

### [LOW] Unresolved FIXME/HACK marker
- **Category:** security
- A FIXME/HACK marker indicates known incomplete or fragile code. Track and resolve it.

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

### Fix: Supabase is a single point of failure
- **Priority:** critical
- **Risk reduction:** ~37%
- **Business impact:** Eliminates a total-outage path; protects revenue during component failure.
- **Fix:** Introduce redundancy: add a replica/second instance and automatic failover.

### Fix: TLS verification disabled
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Possible command injection
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

### Fix: Raw HTML injection (XSS risk)
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Weak randomness for a secret
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

### Fix: Unresolved FIXME/HACK marker
- **Priority:** low
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Supabase vendor lock-in (supabase)
- **Priority:** low
- **Risk reduction:** ~15%
- **Business impact:** Limits exposure to third-party outages and pricing changes.
- **Fix:** Abstract the dependency behind an interface and document a fallback.

### Fix: Stripe vendor lock-in (stripe)
- **Priority:** low
- **Risk reduction:** ~15%
- **Business impact:** Limits exposure to third-party outages and pricing changes.
- **Fix:** Abstract the dependency behind an interface and document a fallback.

---

_This plan was generated automatically by [Riscly](https://riscly.ai). Review and adjust before acting._