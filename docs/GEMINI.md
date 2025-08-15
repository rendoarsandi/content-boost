# Project Context: Creator Promotion Platform

This document summarizes the key product, structure, and technical details of the Creator Promotion Platform.

## 1. Product Overview

The project is a web platform designed to connect content creators with promoters. The core business model is a pay-per-view system where promoters are compensated based on legitimate views, facilitated by an automated bot detection system.

### Core Features:

- **For Creators**: Campaign creation, budget management, promoter tracking, and analytics.
- **For Promoters**: Apply to campaigns, generate promotional content, and track earnings.
- **Bot Detection**: An automated system with confidence scoring to identify and filter invalid traffic.
- **Automated Payouts**: Promoters are paid out daily based on verified views.
- **Multi-Platform Support**: Integrates with TikTok and Instagram via OAuth.

## 2. Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.0+
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Authentication**: BetterAuth (a library/framework) with TikTok and Instagram OAuth.
- **UI**: ShadcnUI and Tailwind CSS
- **Testing**: Jest for unit/integration tests and Playwright for E2E tests.
- **Deployment**: Vercel, Supabase
- **Monorepo**: Turborepo

## 3. Project Structure

The project is a Turborepo monorepo with a clear separation between applications and shared packages.

```
creator-promotion-platform/
├── apps/                    # Next.js Applications
│   ├── landing-page/        # www.domain.com
│   ├── auth-app/           # auth.domain.com
│   ├── dashboard-app/      # dashboard.domain.com
│   └── admin-app/          # admin.domain.com
├── packages/               # Shared Packages
│   ├── ui/                 # ShadcnUI Components
│   ├── database/           # PostgreSQL Schemas
│   ├── cache/              # Redis Configuration
│   ├── auth/               # Authentication logic
│   ├── utils/              # Shared Utilities
│   └── config/             # Shared Configuration
├── docs/                   # Documentation
├── reports/                # Test & Performance Reports
├── logs/                   # Application Logs
└── temp/                   # Temporary Files
```

## 4. Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start development servers
npm run dev
```

## 5. Development Workflow

### Available Scripts

- `npm run dev` - Start all development servers with timeout monitoring
- `npm run dev:app [app-name]` - Start single app with timeout monitoring
- `npm run dev:bg` - Start development servers in background with auto-restart
- `npm run build` - Build all applications and packages with timeout monitoring
- `npm run test` - Run all tests with timeout monitoring
- `npm run lint` - Lint all code
- `npm run format` - Format code with Prettier
- `npm run migrate` - Run database migrations with timeout monitoring
- `npm run clean` - Clean all build artifacts
- `npm run type-check` - Run TypeScript type checking

### Environment Variables

Create `.env.local` files in each app with:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEXTAUTH_SECRET=...
TIKTOK_CLIENT_ID=...
TIKTOK_CLIENT_SECRET=...
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
```

## 6. Testing Strategy

- **Unit Tests**: Located in `__tests__/[module].test.ts` within each package/app.
- **Integration Tests**: Located in `__tests__/integration/[feature].test.ts`.
- **E2E Tests**: Located in `__tests__/e2e/[journey].spec.ts`.
- The project uses **Jest** as its primary testing framework.
