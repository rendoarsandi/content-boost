# Design Document

## Overview

Platform promosi konten kreator adalah sistem berbasis monorepo yang menggunakan Turborepo untuk mengorganisir multiple Next.js applications dengan shared packages. Platform ini memungkinkan content creator membuat campaign promosi dengan sistem pay-per-view, sementara promoter dapat mendaftar, mengedit konten, dan mendapat pembayaran berdasarkan views legitimate yang dideteksi melalui algoritma anti-bot yang canggih.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Turborepo Monorepo"
        subgraph "Apps"
            LP[Landing Page<br/>www.domain.com]
            AUTH[Auth App<br/>auth.domain.com]
            DASH[Dashboard App<br/>dashboard.domain.com]
            ADMIN[Admin App<br/>admin.domain.com]
        end
        
        subgraph "Packages"
            UI[UI Components<br/>@repo/ui]
            DB[Database<br/>@repo/database]
            CACHE[Cache<br/>@repo/cache]
            UTILS[Utils<br/>@repo/utils]
            CONFIG[Config<br/>@repo/config]
        end
    end
    
    subgraph "External Services"
        RAILWAY[Railway Deployment]
        POSTGRES[(PostgreSQL)]
        REDIS[(Redis)]
        TIKTOK[TikTok API]
        INSTAGRAM[Instagram API]
    end
    
    LP --> UI
    AUTH --> UI
    DASH --> UI
    ADMIN --> UI
    
    AUTH --> DB
    DASH --> DB
    ADMIN --> DB
    
    DASH --> CACHE
    ADMIN --> CACHE
    
    DB --> POSTGRES
    CACHE --> REDIS
    
    DASH --> TIKTOK
    DASH --> INSTAGRAM
```

### Monorepo Structure

```
creator-promotion-platform/
├── apps/
│   ├── landing-page/          # www.domain.com
│   │   ├── __tests__/         # Unit & integration tests
│   │   └── config/            # App-specific config
│   ├── auth-app/              # auth.domain.com
│   │   ├── __tests__/         # Authentication tests
│   │   └── config/            # Auth config
│   ├── dashboard-app/         # dashboard.domain.com
│   │   ├── __tests__/         # Dashboard tests
│   │   └── config/            # Dashboard config
│   └── admin-app/             # admin.domain.com
│       ├── __tests__/         # Admin tests
│       └── config/            # Admin config
├── packages/
│   ├── ui/                    # Shared ShadcnUI components
│   │   ├── __tests__/         # Component tests
│   │   └── config/            # UI config
│   ├── database/              # PostgreSQL schemas & migrations
│   │   ├── __tests__/         # Database tests
│   │   ├── config/            # DB config
│   │   └── migrations/        # SQL migrations
│   ├── cache/                 # Redis configurations
│   │   ├── __tests__/         # Cache tests
│   │   └── config/            # Redis config
│   ├── utils/                 # Shared utilities
│   │   ├── __tests__/         # Utility tests
│   │   └── config/            # Utils config
│   └── config/                # Shared configurations
├── docker/
│   ├── postgres/
│   └── redis/
├── docs/                      # Project documentation
│   ├── api/                   # API documentation
│   ├── deployment/            # Deployment guides
│   └── architecture/          # Architecture docs
├── reports/                   # Test reports & summaries
│   ├── coverage/              # Test coverage reports
│   ├── performance/           # Performance test results
│   └── bot-detection/         # Bot detection analytics
├── logs/                      # Application logs
│   ├── app/                   # Application logs
│   ├── database/              # Database logs
│   └── bot-detection/         # Bot detection logs
├── temp/                      # Temporary files (auto-cleanup)
├── turbo.json
└── package.json
```

## Components and Interfaces

### 1. Authentication System (BetterAuth)

**Location:** `packages/auth/`

```typescript
interface AuthConfig {
  providers: {
    credentials: boolean;
    google: boolean;
    tiktok: boolean;
    instagram: boolean;
  };
  session: {
    strategy: 'jwt';
    maxAge: number;
  };
  callbacks: {
    jwt: Function;
    session: Function;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'creator' | 'promoter' | 'admin';
  socialAccounts: SocialAccount[];
  createdAt: Date;
  updatedAt: Date;
}

interface SocialAccount {
  id: string;
  userId: string;
  platform: 'tiktok' | 'instagram';
  platformUserId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}
```

### 2. Campaign Management System

**Location:** `packages/database/schemas/campaign.ts`

```typescript
interface Campaign {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  budget: number; // in Rupiah
  ratePerView: number; // in Rupiah
  status: 'draft' | 'active' | 'paused' | 'completed';
  requirements: string[];
  materials: CampaignMaterial[];
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CampaignMaterial {
  id: string;
  campaignId: string;
  type: 'google_drive' | 'youtube' | 'image' | 'video';
  url: string;
  title: string;
  description?: string;
}

interface CampaignApplication {
  id: string;
  campaignId: string;
  promoterId: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedContent?: string;
  trackingLink: string;
  appliedAt: Date;
  reviewedAt?: Date;
}
```

### 3. View Tracking System

**Location:** `packages/database/schemas/tracking.ts`

```typescript
interface ViewRecord {
  id: string;
  campaignId: string;
  promoterId: string;
  platform: 'tiktok' | 'instagram';
  platformPostId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  timestamp: Date;
  botScore: number; // 0-100
  isLegitimate: boolean;
}

interface TrackingSession {
  id: string;
  promoterId: string;
  campaignId: string;
  platform: 'tiktok' | 'instagram';
  platformPostId: string;
  startTime: Date;
  lastChecked: Date;
  totalViews: number;
  legitimateViews: number;
  isActive: boolean;
}
```

### 4. Bot Detection System

**Location:** `packages/utils/bot-detection.ts`

```typescript
interface BotDetectionConfig {
  thresholds: {
    viewLikeRatio: number; // 10:1
    viewCommentRatio: number; // 10:0.1
    spikePercentage: number; // 500%
    spikeTimeWindow: number; // 5 minutes
  };
  confidence: {
    ban: number; // 90%
    warning: number; // 50%
    monitor: number; // 20%
  };
}

interface BotAnalysis {
  promoterId: string;
  campaignId: string;
  analysisWindow: {
    start: Date;
    end: Date;
  };
  metrics: {
    avgViewsPerMinute: number;
    avgLikesPerMinute: number;
    avgCommentsPerMinute: number;
    viewLikeRatio: number;
    viewCommentRatio: number;
    spikeDetected: boolean;
    spikePercentage?: number;
  };
  botScore: number; // 0-100
  action: 'none' | 'monitor' | 'warning' | 'ban';
  reason: string;
}
```

### 5. Payment System

**Location:** `packages/database/schemas/payment.ts`

```typescript
interface Payout {
  id: string;
  promoterId: string;
  campaignId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalViews: number;
    legitimateViews: number;
    botViews: number;
    ratePerView: number;
  };
  amounts: {
    gross: number;
    platformFee: number;
    net: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  processedAt?: Date;
  failureReason?: string;
}

interface PlatformRevenue {
  id: string;
  period: {
    start: Date;
    end: Date;
  };
  totalFees: number;
  withdrawnAmount: number;
  availableBalance: number;
  createdAt: Date;
}
```

## Data Models

### Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('creator', 'promoter', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Social accounts table
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  platform_user_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Campaigns table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  budget DECIMAL(15,2) NOT NULL,
  rate_per_view DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  requirements JSONB,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- View records table (partitioned by date)
CREATE TABLE view_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  promoter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  platform_post_id VARCHAR(255) NOT NULL,
  view_count INTEGER NOT NULL,
  like_count INTEGER NOT NULL,
  comment_count INTEGER NOT NULL,
  share_count INTEGER NOT NULL,
  bot_score INTEGER DEFAULT 0 CHECK (bot_score >= 0 AND bot_score <= 100),
  is_legitimate BOOLEAN DEFAULT true,
  timestamp TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- Payouts table
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  total_views INTEGER NOT NULL,
  legitimate_views INTEGER NOT NULL,
  rate_per_view DECIMAL(10,2) NOT NULL,
  gross_amount DECIMAL(15,2) NOT NULL,
  platform_fee DECIMAL(15,2) NOT NULL,
  net_amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Redis Cache Structure

```typescript
// Cache keys structure
interface CacheKeys {
  // User sessions
  session: `session:${string}`;
  
  // View tracking cache (1 minute TTL)
  viewTracking: `tracking:${string}:${string}`; // promoter:campaign
  
  // Bot detection cache (5 minutes TTL)
  botAnalysis: `bot:${string}:${string}`; // promoter:campaign
  
  // API rate limiting (1 hour TTL)
  rateLimit: `rate:${string}:${string}`; // platform:userId
  
  // Daily payout cache (24 hours TTL)
  dailyPayout: `payout:${string}`; // YYYY-MM-DD
}
```

## Error Handling

### 1. API Error Responses

```typescript
interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Error codes
enum ErrorCodes {
  // Authentication
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_003',
  
  // Campaign
  CAMPAIGN_NOT_FOUND = 'CAMP_001',
  CAMPAIGN_BUDGET_EXCEEDED = 'CAMP_002',
  CAMPAIGN_EXPIRED = 'CAMP_003',
  
  // Bot Detection
  BOT_DETECTED = 'BOT_001',
  SUSPICIOUS_ACTIVITY = 'BOT_002',
  
  // Payment
  PAYMENT_INSUFFICIENT_BALANCE = 'PAY_001',
  PAYMENT_PROCESSING_FAILED = 'PAY_002',
  
  // External API
  SOCIAL_API_RATE_LIMIT = 'EXT_001',
  SOCIAL_API_UNAUTHORIZED = 'EXT_002'
}
```

### 2. Bot Detection Algorithm

```typescript
class BotDetectionService {
  private config: BotDetectionConfig = {
    thresholds: {
      viewLikeRatio: 10,
      viewCommentRatio: 100,
      spikePercentage: 500,
      spikeTimeWindow: 5 * 60 * 1000 // 5 minutes
    },
    confidence: {
      ban: 90,
      warning: 50,
      monitor: 20
    }
  };

  async analyzeViews(promoterId: string, campaignId: string): Promise<BotAnalysis> {
    // Get recent view data (last 10 minutes)
    const recentViews = await this.getRecentViews(promoterId, campaignId, 10);
    
    // Calculate metrics
    const metrics = this.calculateMetrics(recentViews);
    
    // Calculate bot score
    let botScore = 0;
    
    // Check view:like ratio
    if (metrics.viewLikeRatio > this.config.thresholds.viewLikeRatio) {
      botScore += 30;
    }
    
    // Check view:comment ratio
    if (metrics.viewCommentRatio > this.config.thresholds.viewCommentRatio) {
      botScore += 25;
    }
    
    // Check for spikes
    if (metrics.spikeDetected && metrics.spikePercentage > this.config.thresholds.spikePercentage) {
      botScore += 45;
    }
    
    // Determine action
    let action: 'none' | 'monitor' | 'warning' | 'ban' = 'none';
    if (botScore >= this.config.confidence.ban) {
      action = 'ban';
    } else if (botScore >= this.config.confidence.warning) {
      action = 'warning';
    } else if (botScore >= this.config.confidence.monitor) {
      action = 'monitor';
    }
    
    return {
      promoterId,
      campaignId,
      analysisWindow: {
        start: new Date(Date.now() - 10 * 60 * 1000),
        end: new Date()
      },
      metrics,
      botScore,
      action,
      reason: this.generateReason(metrics, botScore)
    };
  }
}
```

## Testing Strategy

### 1. Unit Testing

- **Framework:** Jest + Testing Library
- **Coverage:** Minimum 80% code coverage
- **Focus Areas:**
  - Bot detection algorithms
  - Payment calculations
  - Data validation functions
  - Utility functions

### 2. Integration Testing

- **Database Testing:** Test with PostgreSQL test containers
- **API Testing:** Test all API endpoints with different scenarios
- **External API Mocking:** Mock TikTok/Instagram APIs for consistent testing

### 3. End-to-End Testing

- **Framework:** Playwright
- **Scenarios:**
  - Complete user journey (registration → campaign creation → promotion → payment)
  - Bot detection scenarios
  - Multi-subdomain navigation
  - Admin workflows

### 4. Performance Testing

- **Load Testing:** Test with high concurrent users
- **Database Performance:** Test with large datasets
- **Bot Detection Performance:** Test algorithm with high-frequency data

### 5. Security Testing

- **Authentication Testing:** Test BetterAuth integration
- **Authorization Testing:** Test role-based access control
- **Input Validation:** Test against SQL injection, XSS
- **Rate Limiting:** Test API rate limits

## Process Management and Timeouts

### Development Process Configuration

```typescript
// packages/config/process.ts
interface ProcessConfig {
  timeouts: {
    devServer: number; // 30 seconds warning
    build: number; // 10 minutes max
    test: number; // 5 minutes per test file
    migration: number; // 2 minutes max
  };
  backgroundProcesses: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logRotation: boolean;
    maxLogSize: string; // '100MB'
  };
}

// Process management utilities
class ProcessManager {
  static async runWithTimeout<T>(
    command: string,
    timeoutMs: number,
    options?: { 
      killSignal?: string;
      showWarning?: boolean;
      allowContinue?: boolean;
    }
  ): Promise<T> {
    // Implementation with timeout handling
    // Shows warning at timeout
    // Provides option to terminate or continue
  }
  
  static async runBackground(
    command: string,
    logPath: string,
    options?: {
      autoRestart?: boolean;
      maxRestarts?: number;
    }
  ): Promise<void> {
    // Background process management
    // Proper logging to specified path
    // Auto-restart capabilities
  }
}
```

### Package.json Scripts with Timeouts

```json
{
  "scripts": {
    "dev": "node scripts/dev-with-timeout.js",
    "build": "node scripts/build-with-timeout.js",
    "test": "node scripts/test-with-timeout.js",
    "migrate": "node scripts/migrate-with-timeout.js",
    "dev:bg": "node scripts/background-dev.js"
  }
}
```

## Deployment Architecture

### Railway Deployment Strategy

```yaml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"
buildTimeout = 600 # 10 minutes

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
startCommand = "npm start"

# Multiple services deployment
[[services]]
name = "landing-page"
source = "apps/landing-page"
domains = ["www.domain.com"]
buildTimeout = 600

[[services]]
name = "auth-app"
source = "apps/auth-app"
domains = ["auth.domain.com"]
buildTimeout = 600

[[services]]
name = "dashboard-app"
source = "apps/dashboard-app"
domains = ["dashboard.domain.com"]
buildTimeout = 600

[[services]]
name = "admin-app"
source = "apps/admin-app"
domains = ["admin.domain.com"]
buildTimeout = 600

[[services]]
name = "postgres"
source = "docker/postgres"
type = "database"

[[services]]
name = "redis"
source = "docker/redis"
type = "cache"
```

### Environment Configuration

```typescript
// packages/config/env.ts
interface EnvironmentConfig {
  // Database
  DATABASE_URL: string;
  REDIS_URL: string;
  
  // Authentication
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  
  // Social Media APIs
  TIKTOK_CLIENT_ID: string;
  TIKTOK_CLIENT_SECRET: string;
  INSTAGRAM_CLIENT_ID: string;
  INSTAGRAM_CLIENT_SECRET: string;
  
  // Platform
  PLATFORM_FEE_PERCENTAGE: number;
  BOT_DETECTION_ENABLED: boolean;
  
  // Monitoring
  SENTRY_DSN?: string;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}
```

## Monitoring and Observability

### 1. Application Monitoring

- **Error Tracking:** Sentry integration
- **Performance Monitoring:** Next.js built-in analytics
- **Custom Metrics:** Bot detection accuracy, payment success rates

### 2. Database Monitoring

- **Query Performance:** Slow query logging
- **Connection Pooling:** Monitor connection usage
- **Backup Strategy:** Daily automated backups

### 3. Business Metrics

- **Dashboard Metrics:**
  - Active campaigns
  - Total views processed
  - Bot detection accuracy
  - Payment processing success rate
  - Platform revenue

### 4. Alerting

- **Critical Alerts:**
  - Payment processing failures
  - High bot detection rates
  - Database connection issues
  - External API failures