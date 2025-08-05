# Multi-stage build for Node.js API server
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api-server/package*.json ./apps/api-server/
COPY packages/ ./packages/

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the API server
RUN npm run build --workspace=@repo/api-server

# Production image, copy all the files and run the server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

# Copy the built application
COPY --from=builder /app/apps/api-server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Set correct permissions
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 3004

ENV PORT 3004

CMD ["node", "dist/index.js"]