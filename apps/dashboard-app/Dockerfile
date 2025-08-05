# Multi-stage build for Next.js dashboard app
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/dashboard-app/package*.json ./apps/dashboard-app/
COPY packages/ ./packages/

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the dashboard app
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build --workspace=@repo/dashboard-app

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the built application
COPY --from=builder /app/apps/dashboard-app/.next/standalone ./
COPY --from=builder /app/apps/dashboard-app/.next/static ./apps/dashboard-app/.next/static
COPY --from=builder /app/apps/dashboard-app/public ./apps/dashboard-app/public

# Set correct permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3002

ENV PORT 3002
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/dashboard-app/server.js"]