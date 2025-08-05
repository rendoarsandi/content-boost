# Multi-stage build for Next.js admin app
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/admin-app/package*.json ./apps/admin-app/
COPY packages/ ./packages/

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the admin app
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build --workspace=@repo/admin-app

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the built application
COPY --from=builder /app/apps/admin-app/.next/standalone ./
COPY --from=builder /app/apps/admin-app/.next/static ./apps/admin-app/.next/static
COPY --from=builder /app/apps/admin-app/public ./apps/admin-app/public

# Set correct permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3003

ENV PORT 3003
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/admin-app/server.js"]