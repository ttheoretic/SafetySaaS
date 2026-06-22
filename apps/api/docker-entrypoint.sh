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
  if npx prisma migrate deploy; then
    echo "[entrypoint] Migrations applied."
  else
    # A drifted DB (e.g. created ad-hoc / via db push) can't be migrated with a
    # clean history. Force the schema to match so columns/tables can't be missing
    # at runtime. Idempotent; a no-op when already in sync.
    echo "[entrypoint] migrate deploy failed — syncing schema with prisma db push..."
    npx prisma db push --accept-data-loss \
      || echo "[entrypoint] WARNING: db push failed; starting anyway."
  fi
else
  echo "[entrypoint] No DATABASE_URL/DIRECT_URL set — using in-memory store, skipping migrations."
fi

exec node apps/api/dist/main.js
