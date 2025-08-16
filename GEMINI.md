# Project Context: Creator Promotion Platform

This document summarizes the key product, structure, and technical details of the Creator Promotion Platform.

## 1. Product Overview

The project is a web platform designed to connect content creators with promoters. The core business model is a pay-per-view system where promoters are compensated based on legitimate views, facilitated by an automated bot detection system.

### Core Features

The platform provides a distinct set of features for each user type:

**For Creators:**
- **Campaign Management:** Create and manage promotional campaigns.
- **Budget Tracking:** Set and monitor campaign budgets.
- **Promoter Discovery:** Search, filter, and invite promoters to campaigns.
- **Analytics Dashboard:** View detailed analytics on campaign performance and ROI.

**For Promoters:**
- **Campaign Application:** Apply to join campaigns that match their niche.
- **Public Profile & Portfolio:** Showcase their skills, past work, and performance statistics.
- **Tier System:** Earn performance-based tiers (e.g., Bronze, Silver, Gold) that unlock benefits.
- **Earnings Dashboard:** Track earnings from various campaigns.

**For Admins:**
- **Dispute Resolution Center:** A dedicated interface to mediate and resolve conflicts between creators and promoters.
- **User Management:** Oversee all users on the platform.

**Core System Features:**
- **Bot Detection:** An automated system with confidence scoring to identify and filter invalid traffic.
- **Automated Payouts:** Promoters are paid out daily based on verified views.
- **Multi-Platform Support:** Integrates with TikTok and Instagram via OAuth.

## 2. Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.0+
- **Database**: Supabase (PostgreSQL)
- **UI**: ShadcnUI and Tailwind CSS
- **Testing**: Jest for unit/integration tests and Playwright for E2E tests.
- **Deployment**: Vercel
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
│   ├── database/           # Supabase mock schemas
│   └── ...
└── ...
```

## 4. Future Roadmap

To further enhance the platform, the following features are being considered for future development:

- **Expanded Platform Integrations:** Integrate with other major platforms like YouTube (Shorts) and X (formerly Twitter) to broaden the market.
- **Direct Communication Channel:** Implement a secure, real-time messaging system for creators and promoters to communicate directly within the platform.
- **Advanced Filtering & Search:** Add more granular search capabilities to the Promoter Discovery dashboard, allowing creators to filter by engagement rate, audience demographics, and more.
- **Gamification & Badges:** Introduce badges and leaderboards to further incentivize high-quality work from promoters.
- **Detailed Financial Reporting:** Provide more comprehensive financial dashboards for both creators and promoters to track expenses, earnings, and taxes.
