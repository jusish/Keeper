# ==============================================================================
# Keeper Web Frontend - Multi-stage Production Dockerfile
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

# Copy packages and Web application
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared package and Vite web production bundle
RUN pnpm --filter @keeper/shared build
RUN pnpm --filter @keeper/web build

# ------------------------------------------------------------------------------
# Nginx Static Web Server Stage
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
