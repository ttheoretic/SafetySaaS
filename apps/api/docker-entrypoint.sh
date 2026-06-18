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
  echo "[entrypoint] Applying database migrations (prisma migrate deploy)..."
  # Don't let a transient migrate failure crash-loop the whole service; log it
  # and start anyway (a no-op when already up to date).
  npx prisma migrate deploy || echo "[entrypoint] WARNING: migrate deploy failed; starting anyway."
else
  echo "[entrypoint] No DATABASE_URL/DIRECT_URL set — using in-memory store, skipping migrations."
fi

exec node apps/api/dist/main.js
