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
    -   `@repo/database`: PostgreSQL schema, migrations (Drizzle ORM).
    -   `@repo/cache`: Redis configuration and utilities.
    -   `@repo/auth`: Authentication configuration (BetterAuth) and OAuth logic.
    -   `@repo/utils`: Core business logic, including bot detection algorithms and validation.
    -   `@repo/config`: Shared configuration constants.

## 3. Tech Stack

-   **Framework**: Next.js 14 (App Router)
-   **Language**: TypeScript 5.0+
-   **Database**: PostgreSQL with Drizzle ORM
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
