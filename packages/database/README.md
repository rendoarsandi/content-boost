# Database Package (@repo/database)

This package provides database connectivity, schema definitions, migrations, and repository patterns for the Creator Promotion Platform.

## Features

- **PostgreSQL Connection Management** with connection pooling
- **Drizzle ORM** integration for type-safe database operations
- **Schema Definitions** with Zod validation
- **Migration System** with rollback support
- **Repository Pattern** for data access layer
- **Partitioning Support** for high-volume tables
- **Comprehensive Testing** with Jest

## Architecture

### Database Schema

The database consists of the following main entities:

- **Users** - Platform users (creators, promoters, admins)
- **Social Accounts** - OAuth connections to TikTok/Instagram
- **Campaigns** - Promotion campaigns created by creators
- **Campaign Materials** - Assets and content for campaigns
- **Campaign Applications** - Promoter applications to campaigns
- **View Records** - Tracking data for views, likes, comments (partitioned)
- **Tracking Sessions** - Active tracking sessions
- **Payouts** - Payment records for promoters
- **Platform Revenue** - Platform fee tracking
- **Withdrawals** - Platform withdrawal records

### Connection Management

```typescript
import { createDatabaseConnection } from '@repo/database';

const db = createDatabaseConnection({
  url: process.env.DATABASE_URL,
  maxConnections: 20,
  idleTimeout: 30000,
  connectionTimeout: 5000,
});

await db.connect();
```

### Repository Usage

```typescript
import { repositories } from '@repo/database';

// Create a new user
const user = await repositories.user.create({
  email: 'user@example.com',
  name: 'John Doe',
  role: 'creator',
});

// Find campaigns by creator
const campaigns = await repositories.campaign.findByCreatorId(user.id);

// Get view tracking data
const viewSummary = await repositories.viewRecord.getViewSummary(
  campaignId,
  promoterId,
  startDate,
  endDate
);
```

## Migration System

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Or using the script directly
node scripts/migrate.js

# Rollback a specific migration
node scripts/migrate.js rollback 001
```

### Environment Variables

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

## Schema Validation

All schemas include Zod validation for runtime type checking:

```typescript
import { UserSchema } from '@repo/database';

// Validate user data
const validatedUser = UserSchema.parse(userData);
```

## Partitioning

The `view_records` table is partitioned by timestamp for better performance:

- Monthly partitions are automatically created
- Indexes are optimized for time-based queries
- Supports high-volume tracking data

## Repository Pattern

All repositories extend `BaseRepository` and provide:

- **CRUD Operations** - Create, Read, Update, Delete
- **Pagination Support** - Limit, offset, ordering
- **Transaction Support** - Atomic operations
- **Connection Management** - Automatic client handling

### Available Repositories

- `UserRepository` & `SocialAccountRepository`
- `CampaignRepository`, `CampaignMaterialRepository`, `CampaignApplicationRepository`
- `ViewRecordRepository` & `TrackingSessionRepository`
- `PayoutRepository`, `PlatformRevenueRepository`, `WithdrawalRepository`

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- user.test.ts
```

## Performance Considerations

### Indexes

Strategic indexes are created for:

- Timestamp-based queries on view_records
- Campaign and promoter lookups
- Bot score filtering
- Payment status tracking

### Connection Pooling

- Default pool size: 20 connections
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds
- SSL support for production

### Partitioning

- `view_records` table partitioned by month
- Automatic partition creation for future months
- Optimized for time-range queries

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Watch mode for development
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
```

## Production Deployment

1. Set `DATABASE_URL` environment variable
2. Run migrations: `npm run migrate`
3. Ensure SSL is enabled for production connections
4. Monitor connection pool usage
5. Set up automated backups for partitioned tables

## Error Handling

The package includes comprehensive error handling:

- Connection failures with retry logic
- Migration rollback on failure
- Transaction rollback on errors
- Proper resource cleanup

## Security

- Parameterized queries prevent SQL injection
- Connection pooling prevents connection exhaustion
- SSL support for encrypted connections
- Role-based access through application logic
