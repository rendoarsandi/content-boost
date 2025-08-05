# Creator Promotion Platform - Claude Code Session

## What is this project?

The **Creator Promotion Platform** is a sophisticated web application built for the creator economy. It's a pay-per-view promotion system that connects content creators with promoters across multiple social media platforms (TikTok, Instagram).

### Core Business Model:
- **Creators** launch promotional campaigns with set budgets and requirements
- **Promoters** apply to campaigns, create promotional content, and earn money based on legitimate views
- **Bot Detection System** automatically validates view authenticity using confidence scoring
- **Automated Payouts** compensate promoters daily based on verified, legitimate views only

## Technical Architecture

### Monorepo Structure (Turborepo):
- **`apps/landing-page`** - Public marketing website
- **`apps/auth-app`** - Authentication flows & OAuth integration (TikTok/Instagram)  
- **`apps/dashboard-app`** - Main user portal for creators and promoters
- **`apps/admin-app`** - Administrative oversight and platform management
- **`apps/api-server`** - tRPC API server for real-time functionality

### Technology Stack:
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, ShadcnUI components
- **Backend**: Prisma ORM + PostgreSQL, Redis caching, tRPC for API
- **Authentication**: BetterAuth with OAuth (TikTok, Instagram social login)
- **Testing**: Jest (unit/integration), Playwright (E2E)
- **Deployment**: Railway platform
- **Monitoring**: Sentry error tracking, OpenTelemetry observability

### Database Schema (Key Models):
- **User** - creators, promoters, admins with role-based access
- **Campaign** - creator-initiated promotion campaigns with budgets
- **CampaignApplication** - promoter applications to join campaigns  
- **ViewRecord** - individual content view tracking with bot detection scores
- **Payout** - payment records and transaction history
- **SocialAccount** - linked social media accounts with OAuth tokens

## Current Plan & Progress

### ✅ **Completed Tasks:**
1. **Database Migration**: Successfully migrated from Drizzle ORM to Prisma ORM
2. **Repository Layer Refactoring**: Fixed `BaseRepository` class and all repository implementations
3. **ESLint & Prettier Setup**: Configured and ran code linting/formatting across entire project
4. **Authentication Types**: Fixed missing type definitions in auth package (`FrameworkRequest`/`FrameworkResponse`)
5. **Code Formatting**: Applied Prettier formatting to 391+ files

### 🔄 **Currently In Progress:**
1. **Build Compilation**: Fixing TypeScript compilation errors across applications
2. **Schema Alignment**: Updating dashboard-app code to match Prisma schema changes
3. **Field Name Corrections**: Replacing outdated field references (`db.promotion` → `db.campaignApplication`, `name` → `title`, `createdAt` → `appliedAt`)

## Current Errors Being Fixed

### Type Errors in Dashboard App:
1. **Invalid Model References**: Code still references `db.promotion` instead of `db.campaignApplication`
2. **Missing Fields**: Trying to access `contentUrl` when schema has `submittedContent`
3. **Field Name Mismatches**: Using `campaign.name` instead of `campaign.title`
4. **Date Field Issues**: Using `createdAt` instead of `appliedAt` for CampaignApplication
5. **Status Enum Values**: Using lowercase status strings instead of uppercase enum values

### Current Error:
```
Property 'contentUrl' does not exist on type CampaignApplication
```
**Fix**: Replace `contentUrl` with `submittedContent` field from schema

## Next Plan

### Immediate (High Priority):
1. **Fix Remaining Build Errors**: Continue fixing TypeScript compilation issues in dashboard-app
2. **Update Field References**: Complete global replacement of outdated field names
3. **Test Admin App**: Check and fix similar issues in admin-app
4. **Verify Full Build**: Ensure all applications compile successfully

### Short Term:
1. **Fix Test Files**: Update test files that use outdated Prisma patterns
2. **API Route Updates**: Ensure all API routes use correct schema
3. **Type Safety**: Add proper TypeScript types for all data structures

### Long Term:
1. **Performance Optimization**: Review and optimize database queries
2. **Error Handling**: Implement comprehensive error handling
3. **Documentation**: Complete API documentation and deployment guides
4. **Testing**: Add comprehensive test coverage for all features

## Development Commands

```bash
# Build entire project
npm run build

# Development server
npm run dev

# Run specific app
npm run dev:app -- dashboard-app

# Linting & formatting  
npm run lint
npm run format

# Type checking
npm run type-check

# Testing
npm run test
npm run test:e2e
```

## Notes for Future Development

- **Database Schema**: All models are well-defined in `packages/database/prisma/schema.prisma`
- **Authentication**: OAuth integration is working but may need token refresh handling
- **Bot Detection**: Core algorithms exist but may need fine-tuning for production
- **Payment System**: Payout logic is implemented but needs payment gateway integration
- **Scalability**: Consider implementing rate limiting and caching strategies

---

*Last Updated: 2025-01-05 - During build error fixing phase*