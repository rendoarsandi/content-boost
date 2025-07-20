# Tech Stack & Build System

## Core Technologies

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.0+
- **Monorepo**: Turborepo for build orchestration
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis for sessions, tracking, and rate limiting
- **Authentication**: BetterAuth with OAuth (TikTok, Instagram)
- **UI**: ShadcnUI + Tailwind CSS
- **Testing**: Jest + Playwright for E2E
- **Deployment**: Railway

## Build System

### Package Manager
- **npm >= 9.0.0** (specified in engines)
- Workspaces enabled for monorepo structure

### Development Commands
```bash
# Start all development servers with timeout monitoring
npm run dev

# Start development servers in background with auto-restart
npm run dev:bg

# Build all applications and packages
npm run build

# Run all tests with timeout monitoring
npm run test

# Run database migrations with timeout monitoring
npm run migrate

# Lint all code
npm run lint

# Format code with Prettier
npm run format

# TypeScript type checking
npm run type-check

# Clean all build artifacts
npm run clean
```

### Process Management
- **Development Server**: 30-second startup warning
- **Build Process**: 10-minute maximum timeout
- **Test Suite**: 5-minute maximum per test file
- **Database Migration**: 2-minute maximum timeout
- **Background Processes**: Auto-restart with retry limits

## Environment Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

## Key Environment Variables
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
TIKTOK_CLIENT_ID=...
TIKTOK_CLIENT_SECRET=...
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
```

## Shared Package Aliases
```typescript
"@repo/ui": ["./packages/ui/src"]
"@repo/database": ["./packages/database/src"]
"@repo/cache": ["./packages/cache/src"]
"@repo/utils": ["./packages/utils/src"]
"@repo/config": ["./packages/config/src"]
"@repo/auth": ["./packages/auth/src"]
```

## Testing Strategy
- **Unit Tests**: Jest with 80% minimum coverage
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright for user journeys
- **Performance Tests**: Load testing for high concurrency