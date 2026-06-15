-- Row-Level Security (defense in depth).
--
-- The application already scopes every query by orgId; these policies make the
-- database enforce tenant isolation too, so a bug can't leak across tenants.
--
-- PREREQUISITE — do not apply until wired: each request must run inside a
-- transaction that first sets the tenant GUC, e.g.
--     SET LOCAL app.current_org = '<orgId>';
-- (see docs/DATABASE.md §5). Enabling RLS without setting the GUC denies all
-- rows by default. Apply this manually (it is intentionally NOT part of the
-- auto-run Prisma migration sequence).

-- Helper: the current tenant from the per-transaction GUC (NULL if unset).
CREATE OR REPLACE FUNCTION app_current_org() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.current_org', true), '')::uuid $$;

-- Organization: keyed by its own id.
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Organization"
  USING (id = app_current_org());

-- Tenant-scoped tables carry an orgId column.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Project', 'Connection', 'Scan', 'Finding', 'Recommendation',
    'Simulation', 'Scenario', 'Report', 'AuditLog', 'Membership',
    'Invitation', 'Subscription'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("orgId" = app_current_org());', t
    );
  END LOOP;
END $$;
