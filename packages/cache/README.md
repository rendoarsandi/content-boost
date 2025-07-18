# @repo/cache

Redis cache package for the Creator Promotion Platform with clustering support, specialized cache utilities, and TTL policies.

## Features

- **Redis Connection Management**: Support for single Redis instance and Redis Cluster
- **Specialized Cache Utilities**: Pre-built utilities for sessions, view tracking, bot analysis, rate limiting, and daily payouts
- **TTL Policy Management**: Configurable TTL policies for different data types
- **Key Management System**: Structured key generation with configurable prefixes and separators
- **Batch Operations**: Efficient multi-key operations
- **Pattern Operations**: Key pattern matching and bulk operations
- **Error Handling**: Graceful error handling with retry mechanisms
- **Health Monitoring**: Built-in health checks and statistics
- **TypeScript Support**: Full TypeScript support with comprehensive type definitions

## Installation

This package is part of the monorepo and uses `ioredis` as the Redis client.

```bash
npm install ioredis
```

## Quick Start

### Basic Usage

```typescript
import { createCache } from '@repo/cache';

const cache = createCache();

// Connect to Redis
await cache.connect();

// Basic operations
await cache.set('key', { data: 'value' });
const result = await cache.get('key');

// Disconnect when done
await cache.disconnect();
```

### Environment Configuration

Set these environment variables to configure Redis connection:

```bash
# Redis connection (choose one method)
REDIS_URL=redis://localhost:6379                    # Connection URL
# OR
REDIS_HOST=localhost                                 # Individual settings
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0

# Clustering
REDIS_CLUSTER_ENABLED=false                         # Enable Redis Cluster

# Cache configuration
REDIS_KEY_PREFIX=creator-platform:                  # Key prefix
CACHE_KEY_PREFIX=creator-platform                   # Cache key prefix
CACHE_KEY_SEPARATOR=:                               # Key separator

# TTL policies (in seconds)
CACHE_TTL_SESSION=86400                             # 24 hours
CACHE_TTL_VIEW_TRACKING=60                          # 1 minute
CACHE_TTL_BOT_ANALYSIS=300                          # 5 minutes
CACHE_TTL_RATE_LIMIT=3600                           # 1 hour
CACHE_TTL_DAILY_PAYOUT=86400                        # 24 hours
CACHE_TTL_DEFAULT=3600                              # 1 hour

# Health check
CACHE_HEALTH_TIMEOUT=5000                           # 5 seconds
CACHE_HEALTH_RETRIES=3
CACHE_HEALTH_INTERVAL=30000                         # 30 seconds
```

## Specialized Cache Utilities

### Session Management

```typescript
// Set session data (uses session TTL policy - 24 hours)
await cache.setSession('session-123', {
  userId: 'user-456',
  role: 'creator',
  loginTime: new Date()
});

// Get session data
const session = await cache.getSession('session-123');

// Delete session
await cache.deleteSession('session-123');
```

### View Tracking

```typescript
// Set view tracking data (uses viewTracking TTL policy - 1 minute)
await cache.setViewTracking('promoter-123', 'campaign-456', {
  views: 1500,
  likes: 150,
  comments: 25,
  shares: 10,
  timestamp: new Date()
});

// Get view tracking data
const viewData = await cache.getViewTracking('promoter-123', 'campaign-456');
```

### Bot Analysis

```typescript
// Set bot analysis data (uses botAnalysis TTL policy - 5 minutes)
await cache.setBotAnalysis('promoter-123', 'campaign-456', {
  score: 25,
  action: 'monitor',
  reason: 'Slightly elevated view:like ratio',
  analysisTime: new Date()
});

// Get bot analysis data
const botAnalysis = await cache.getBotAnalysis('promoter-123', 'campaign-456');
```

### Rate Limiting

```typescript
// Increment rate limit counter (sets TTL on first increment - 1 hour)
const currentCount = await cache.incrementRateLimit('tiktok', 'user-123');

// Check current rate limit count
const rateCount = await cache.getRateLimit('tiktok', 'user-123');

// Rate limiting logic
const RATE_LIMIT = 100;
if (currentCount > RATE_LIMIT) {
  throw new Error('Rate limit exceeded');
}
```

### Daily Payout

```typescript
// Set daily payout data (uses dailyPayout TTL policy - 24 hours)
const today = new Date().toISOString().split('T')[0];
await cache.setDailyPayout(today, {
  totalAmount: 50000,
  processedPayouts: 25,
  pendingPayouts: 5,
  processedAt: new Date()
});

// Get daily payout data
const payoutData = await cache.getDailyPayout(today);
```

## Advanced Operations

### Batch Operations

```typescript
// Set multiple keys at once
const batchData = {
  'key1': { data: 'value1' },
  'key2': { data: 'value2' },
  'key3': { data: 'value3' }
};
await cache.mset(batchData, 300); // 5 minutes TTL

// Get multiple keys at once
const keys = ['key1', 'key2', 'key3'];
const results = await cache.mget(keys);
```

### Pattern Operations

```typescript
// Find keys by pattern
const keys = await cache.keys('session:*');

// Delete keys by pattern
const deletedCount = await cache.deletePattern('temp:*');
```

### TTL Management

```typescript
// Check TTL
const ttl = await cache.ttl('key');

// Set custom expiration
await cache.expire('key', 1800); // 30 minutes

// Check if key exists
const exists = await cache.exists('key');
```

## Custom Key Management

```typescript
// Get key manager for custom operations
const keyManager = cache.getKeyManager();

// Generate custom keys
const analyticsKey = keyManager.custom('analytics', 'daily', '2024-01-15');
const reportKey = keyManager.custom('reports', 'monthly', '2024-01');

// Use custom keys
await cache.set(analyticsKey, { totalViews: 10000 });
const analytics = await cache.get(analyticsKey);
```

## Clustering Support

For Redis Cluster deployment:

```typescript
import { RedisCache } from '@repo/cache';

const cache = new RedisCache({
  host: 'cluster-node-1.example.com',
  port: 6379,
  cluster: {
    enableOfflineQueue: true,
    redisOptions: {
      password: 'your-cluster-password'
    },
    slotsRefreshTimeout: 10000,
    slotsRefreshInterval: 5000
  }
});
```

## Health Monitoring

```typescript
// Health check
const isHealthy = await cache.ping();

// Get cache statistics
const stats = await cache.getStats();
console.log('Cache stats:', {
  hits: stats.hits,
  misses: stats.misses,
  keys: stats.keys,
  memory: stats.memory
});

// Hit rate calculation
const hitRate = stats.hits / (stats.hits + stats.misses);
console.log('Cache hit rate:', hitRate);
```

## Error Handling

```typescript
// Graceful error handling
try {
  await cache.set('key', 'value');
  const result = await cache.get('key');
} catch (error) {
  console.error('Cache operation failed:', error);
  // Fallback logic here
}

// Retry logic example
async function cacheWithRetry(operation: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

## Testing

The package includes comprehensive tests. Run them with:

```bash
npm test
```

## Key Features for Creator Promotion Platform

### Session Management
- Secure session storage with automatic expiration
- Support for user roles (creator, promoter, admin)
- Session cleanup and management

### View Tracking Cache
- Real-time view metrics caching
- Short TTL for fresh data (1 minute)
- Efficient batch updates for high-frequency data

### Bot Detection Cache
- Bot analysis results caching
- Medium TTL for analysis stability (5 minutes)
- Quick access for real-time bot scoring

### Rate Limiting
- API rate limiting per platform and user
- Automatic TTL management
- Efficient increment operations

### Daily Payout Cache
- Daily payout calculation caching
- Long TTL for stable financial data (24 hours)
- Batch payout processing support

## Performance Considerations

- **Connection Pooling**: Automatic connection management with ioredis
- **Lazy Connection**: Connections are established only when needed
- **Pipeline Operations**: Batch operations use Redis pipelines for efficiency
- **Memory Management**: Configurable TTL policies prevent memory bloat
- **Error Recovery**: Automatic retry mechanisms with exponential backoff

## Security

- **Password Protection**: Support for Redis AUTH
- **Key Prefixing**: Namespace isolation with configurable prefixes
- **Connection Security**: Support for TLS connections (configure via ioredis options)
- **Access Control**: Role-based access through session management

## Monitoring and Observability

- **Health Checks**: Built-in ping functionality
- **Statistics**: Hit/miss ratios, memory usage, key counts
- **Error Logging**: Comprehensive error logging for debugging
- **Performance Metrics**: TTL monitoring and key pattern analysis

This cache package provides a robust foundation for the Creator Promotion Platform's caching needs, with specialized utilities for each use case and comprehensive error handling for production reliability.