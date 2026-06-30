#!/bin/sh
# Container entrypoint for the Riscly API.
#
# When a database is configured, apply any pending Prisma migrations before
# the server starts. This keeps the schema in lock-step with the deployed code
# so a release that adds a migration (e.g. Project.businessContext) can't leave
# the live DB behind and surface as P2022 "column does not exist" at runtime.
#
# With no DATABASE_URL the API runs on its in-memory store, so we skip migrate.
set -e

if [ -n "$DATABASE_URL" ] || [ -n "$DIRECT_URL" ]; then
  # Bound every Prisma step so a connection that hangs (e.g. migrate's advisory
  # lock over a transaction pooler when DIRECT_URL is missing) can never wedge
  # the deploy — the API still starts instead of sitting "in progress" forever.
  MIGRATE_TIMEOUT="${MIGRATE_TIMEOUT:-180}"
  echo "[entrypoint] Applying database migrations (prisma migrate deploy, ${MIGRATE_TIMEOUT}s timeout)..."
  if timeout "$MIGRATE_TIMEOUT" npx prisma migrate deploy; then
    echo "[entrypoint] Migrations applied."
  else
    rc=$?
    if [ "$rc" = "124" ]; then
      echo "[entrypoint] migrate deploy TIMED OUT — is DIRECT_URL a direct (non-pooler, :5432) connection?"
    else
      echo "[entrypoint] migrate deploy failed (exit $rc) — syncing schema with prisma db push..."
    fi
    # A drifted/locked DB can't be migrated with a clean history. Force the
    # schema to match so columns/tables can't be missing at runtime.
    timeout "$MIGRATE_TIMEOUT" npx prisma db push --accept-data-loss \
      || echo "[entrypoint] WARNING: schema sync failed; starting anyway (admin features may error until migrations run)."
  fi
else
  echo "[entrypoint] No DATABASE_URL/DIRECT_URL set — using in-memory store, skipping migrations."
fi

exec node apps/api/dist/main.js
