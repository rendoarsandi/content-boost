# Project Structure & Organization

## Monorepo Architecture

```
creator-promotion-platform/
├── apps/                    # Next.js Applications
│   ├── landing-page/        # www.domain.com
│   ├── auth-app/           # auth.domain.com
│   ├── dashboard-app/      # dashboard.domain.com
│   └── admin-app/          # admin.domain.com
├── packages/               # Shared Packages
│   ├── ui/                 # ShadcnUI Components
│   ├── database/           # PostgreSQL Schemas & Migrations
│   ├── cache/              # Redis Configuration
│   ├── auth/               # BetterAuth Configuration
│   ├── utils/              # Shared Utilities & Bot Detection
│   └── config/             # Shared Configuration
├── docs/                   # Documentation
├── reports/                # Test & Performance Reports
├── logs/                   # Application Logs
└── temp/                   # Temporary Files
```

## App Structure Standards

Each app follows this structure:
```
apps/[app-name]/
├── __tests__/              # Test files
├── app/                    # Next.js App Router pages
├── config/                 # App-specific configuration
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
```

## Package Structure Standards

Each package follows this structure:
```
packages/[package-name]/
├── __tests__/              # Test files
├── src/                    # Source code
├── config/                 # Package-specific configuration
├── dist/                   # Built output (generated)
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## Domain Architecture

- **landing-page**: Marketing site (www.domain.com)
- **auth-app**: Authentication flows (auth.domain.com)
- **dashboard-app**: Creator & promoter dashboards (dashboard.domain.com)
- **admin-app**: Platform administration (admin.domain.com)

## Shared Package Responsibilities

- **@repo/ui**: Reusable ShadcnUI components and design system
- **@repo/database**: PostgreSQL schemas, migrations, and data access layer
- **@repo/cache**: Redis configuration and caching utilities
- **@repo/auth**: BetterAuth configuration and OAuth providers
- **@repo/utils**: Bot detection algorithms, validation schemas, utilities
- **@repo/config**: Shared configuration and constants

## File Organization Conventions

### Test Files
- Unit tests: `__tests__/[module].test.ts`
- Integration tests: `__tests__/integration/[feature].test.ts`
- E2E tests: `__tests__/e2e/[journey].spec.ts`

### Configuration Files
- Environment: `.env.local` (per app)
- TypeScript: `tsconfig.json` (per app/package)
- Tailwind: `tailwind.config.js` (per app)
- Next.js: `next.config.js` (per app)

### Logging & Reports
- Application logs: `logs/app/[date].log`
- Bot detection logs: `logs/bot-detection/[date].log`
- Test coverage: `reports/coverage/`
- Performance reports: `reports/performance/`

## Import Path Conventions

Use TypeScript path mapping for clean imports:
```typescript
// Shared packages
import { Button } from '@repo/ui'
import { db } from '@repo/database'
import { cache } from '@repo/cache'
import { detectBot } from '@repo/utils'

// Local imports
import { Component } from '@/components/Component'
import { utils } from '@/lib/utils'
```

## Branch Naming Convention

```bash
feature/task-[number]-[short-description]
# Examples:
# feature/task-4-auth-app-implementation
# feature/task-6-campaign-api
```