# Project Context: Creator Promotion Platform

This document summarizes the key product, structure, and technical details of the Creator Promotion Platform, based on the original PRD.

## 1. Product Overview

The project is a web platform designed to connect content creators with promoters. The core business model is a pay-per-view system where promoters are compensated based on legitimate views, facilitated by an automated bot detection system.

### Core Features:
- **For Creators**: Campaign creation, budget management, promoter tracking, and analytics.
- **For Promoters**: Apply to campaigns, generate promotional content, and track earnings.
- **Bot Detection**: An automated system with confidence scoring to identify and filter invalid traffic.
- **Automated Payouts**: Promoters are paid out daily based on verified views.
- **Multi-Platform Support**: Integrates with TikTok and Instagram via OAuth.

## 2. Project Structure

The project is a Turborepo monorepo with a clear separation between applications and shared packages.

-   **`apps/`**: Contains the Next.js applications for different domains:
    -   `landing-page`: The public-facing marketing site.
    -   `auth-app`: Handles all user authentication flows.
    -   `dashboard-app`: The main portal for creators and promoters.
    -   `admin-app`: For platform administration and oversight.
-   **`packages/`**: Contains shared logic and modules:
    -   `@repo/ui`: Shared ShadcnUI components.
    -   `@repo/database`: PostgreSQL schema, migrations (Prisma ORM).
    -   `@repo/cache`: Redis configuration and utilities.
    -   `@repo/auth`: Authentication configuration (BetterAuth) and OAuth logic.
    -   `@repo/utils`: Core business logic, including bot detection algorithms and validation.
    -   `@repo/config`: Shared configuration constants.

## 3. Tech Stack

-   **Framework**: Next.js 14 (App Router)
-   **Language**: TypeScript 5.0+
-   **Database**: PostgreSQL with Prisma ORM
-   **Cache**: Redis
-   **Authentication**: BetterAuth (a library/framework) with TikTok and Instagram OAuth.
-   **UI**: ShadcnUI and Tailwind CSS
-   **Testing**: Jest for unit/integration tests and Playwright for E2E tests.
-   **Deployment**: Railway

## 4. Testing Strategy

-   **Unit Tests**: Located in `__tests__/[module].test.ts` within each package/app.
-   **Integration Tests**: Located in `__tests__/integration/[feature].test.ts`.
-   **E2E Tests**: Located in `__tests__/e2e/[journey].spec.ts`.
-   The project uses **Jest** as its primary testing framework.

## 5. Project Cleanup and Build Plan (August 4, 2025)

This section tracks the progress of the project cleanup and build task.

### Original Plan:
- [x] **1. Inspect Project**: Identify `lint`, `format`, and `build` scripts from `package.json`.
- [x] **2. Run Linting and Formatting (Check-only)**: Execute ESLint and Prettier to identify issues.
- [ ] **3. Fix Issues Automatically**: Run autofix commands for ESLint and Prettier.
- [ ] **4. Run Build**: Execute the main build script.

### New Plan: Refactor Database Repository Layer
Due to persistent and cascading type errors in the `@repo/database` package, the original plan is paused. A new plan is in effect to refactor the repository layer to resolve these foundational issues.

- [ ] **1. Delete Existing Repository Files**: Remove all files from `packages/database/src/repositories`.
- [ ] **2. Recreate `base.ts`**: Establish a correct `BaseRepository` class with a proper transaction client handler.
- [ ] **3. Recreate Repository Implementations**: Re-implement `campaign.ts`, `payment.ts`, `tracking.ts`, and `user.ts` with correct type annotations and logic.
- [ ] **4. Verify with Type-Check**: Run `npm run type-check` to ensure all errors are resolved.
- [ ] **5. Resume Original Plan**: Continue with automated formatting and the final build.

### Log & Issues Encountered:
- **`lint` failed: Missing `typescript-eslint`**: The initial `lint` command failed because the `typescript-eslint` package was not listed in `devDependencies`.
  - **Solution**: Installed the package using `npm install typescript-eslint --save-dev`.
- **`lint` failed: `tsconfig.json` misconfiguration in `@repo/database`**: ESLint could not parse files because the `include` path in `packages/database/tsconfig.json` was too restrictive.
  - **Solution**: Modified `tsconfig.json` to `include` the entire `src` directory.
- **`lint` failed: `no-prototype-builtins` in `@repo/utils`**: The linter flagged the direct use of `obj.hasOwnProperty(key)`.
  - **Solution**: Changed the code to the safer `Object.prototype.hasOwnProperty.call(obj, key)`.
- **`lint` failed: `.js` file in TypeScript project in `@repo/auth`**: A `types.js` file was causing parsing errors.
  - **Solution**: Replaced the problematic `.js` file with an empty `types.ts` file.
- **`type-check` failed: Cascading errors in `@repo/database`**: A missing `withClient` method in `base.ts` and widespread implicit `any` types caused a massive type-check failure.
  - **Solution**: The complexity of fixing these errors individually led to the new refactoring plan.
