# ==============================================================================
# Keeper API - Multi-stage Production Dockerfile
# ==============================================================================

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ------------------------------------------------------------------------------
# Builder Stage
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copy root configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy packages and API application
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/shared/ ./packages/shared/
COPY packages/database/ ./packages/database/
COPY apps/api/ ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages and generate Prisma Client
RUN pnpm --filter @keeper/shared build
RUN pnpm --filter @keeper/database db:generate
RUN pnpm --filter @keeper/api build

# ------------------------------------------------------------------------------
# Production Runner Stage
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install runtime dependencies for Prisma engine
RUN apk add --no-cache openssl libc6-compat

# Copy workspace and built files
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api ./apps/api

EXPOSE 4000

CMD ["node", "apps/api/dist/server.js"]
