# Riscly remediation plan

Generated from scan `882fdc07-399f-4ad8-ac87-506268a2bb98` on 2026-06-20T17:54:36.216Z.

**Reliability score:** 6 / 100

**Open findings:** 7 (3 critical · 2 high · 2 low)

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

### [HIGH] Redis has no redundancy
- **Category:** redundancy
- **Component:** `redis`
- Redis (cache) runs as a single instance; its failure degrades the system.

### [HIGH] Job Queue has no redundancy
- **Category:** redundancy
- **Component:** `queue`
- Job Queue (queue) runs as a single instance; its failure degrades the system.

### [LOW] Supabase vendor lock-in (supabase)
- **Category:** vendor_lock_in
- **Component:** `supabase-db`
- Supabase relies on supabase with no documented fallback; an outage or pricing change has no mitigation.

### [LOW] Stripe vendor lock-in (stripe)
- **Category:** vendor_lock_in
- **Component:** `stripe`
- Stripe relies on stripe with no documented fallback; an outage or pricing change has no mitigation.

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