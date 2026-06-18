# Multi-stage build for the Riscly API.
FROM node:20-alpine AS base
WORKDIR /app
# Prisma's query engine needs OpenSSL present so `prisma generate` detects the
# right engine (OpenSSL 3 on modern Alpine) and links it at runtime.
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm install --workspaces --include-workspace-root

FROM base AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY prisma prisma
# Generate the Prisma client into node_modules before building.
RUN npx prisma generate \
  && npm run build -w packages/shared && npm run build -w apps/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# libssl for the Prisma query engine at runtime.
RUN apk add --no-cache openssl libc6-compat
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
# Schema + migrations for `prisma migrate deploy` (run by the migrate Job).
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 4000
# Apply any pending migrations (when a DB is configured) before starting, so a
# deploy that ships a new migration can't leave the schema behind the code.
CMD ["./docker-entrypoint.sh"]
