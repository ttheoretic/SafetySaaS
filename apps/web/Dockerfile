# Multi-stage build for the FailSafe AI dashboard.
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN npm install --workspaces --include-workspace-root

FROM base AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w packages/shared && npm run build -w apps/web

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/package.json ./apps/web/
COPY --from=build /app/apps/web/next.config.mjs ./apps/web/
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "apps/web"]
