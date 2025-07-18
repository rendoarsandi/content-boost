# Redis Docker Configuration

This directory contains Docker configurations for Redis used by the Creator Promotion Platform.

## Single Redis Instance

### Quick Start

```bash
cd docker/redis
docker-compose up -d
```

This will start a single Redis instance on port 6379 with:
- Persistent data storage
- Health checks
- Custom configuration optimized for the platform

### Configuration

The Redis instance is configured with:
- **Memory limit**: 256MB with LRU eviction
- **Persistence**: Both RDB snapshots and AOF logging
- **Logging**: Notice level logging
- **Security**: Protected mode disabled for development (enable in production)

### Environment Variables

You can customize the Redis instance using environment variables:

```bash
# In your .env file
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password  # Uncomment requirepass in redis.conf
REDIS_DB=0
```

## Redis Cluster

### Quick Start

```bash
cd docker/redis
docker-compose --profile cluster up -d
```

This will start a Redis cluster setup for high availability.

### Cluster Configuration

The cluster setup includes:
- **Multiple nodes**: 6 nodes (3 masters, 3 replicas)
- **Port range**: 7000-7005 for Redis, 17000-17005 for cluster bus
- **Automatic failover**: Built-in Redis cluster failover
- **Data sharding**: Automatic data distribution across nodes

### Cluster Management

```bash
# Check cluster status
docker exec creator-platform-redis-cluster redis-cli -p 7000 cluster nodes

# Add node to cluster
docker exec creator-platform-redis-cluster redis-cli -p 7000 cluster meet <ip> <port>

# Check cluster info
docker exec creator-platform-redis-cluster redis-cli -p 7000 cluster info
```

## Health Checks

Both configurations include health checks:

```bash
# Check single instance health
docker exec creator-platform-redis redis-cli ping

# Check cluster health
docker exec creator-platform-redis-cluster redis-cli -p 7000 ping
```

## Data Persistence

### Volumes

- **redis_data**: Stores single instance data
- **redis_cluster_data**: Stores cluster data

### Backup

```bash
# Backup single instance
docker exec creator-platform-redis redis-cli BGSAVE
docker cp creator-platform-redis:/data/dump.rdb ./backup/

# Backup cluster (run for each node)
docker exec creator-platform-redis-cluster redis-cli -p 7000 BGSAVE
```

### Restore

```bash
# Stop Redis
docker-compose down

# Replace data files
cp ./backup/dump.rdb /path/to/redis_data/

# Start Redis
docker-compose up -d
```

## Monitoring

### Redis CLI

```bash
# Connect to single instance
docker exec -it creator-platform-redis redis-cli

# Connect to cluster
docker exec -it creator-platform-redis-cluster redis-cli -c -p 7000
```

### Useful Commands

```bash
# Memory usage
INFO memory

# Key statistics
INFO keyspace

# Client connections
INFO clients

# Replication info (cluster)
INFO replication

# Slow query log
SLOWLOG GET 10
```

## Production Considerations

### Security

1. **Enable password authentication**:
   ```bash
   # Uncomment in redis.conf
   requirepass your-secure-password
   ```

2. **Enable protected mode**:
   ```bash
   # In redis.conf
   protected-mode yes
   bind 127.0.0.1
   ```

3. **Use TLS encryption**:
   ```bash
   # Add to redis.conf
   tls-port 6380
   tls-cert-file /path/to/redis.crt
   tls-key-file /path/to/redis.key
   ```

### Performance Tuning

1. **Adjust memory limits**:
   ```bash
   # In redis.conf
   maxmemory 1gb
   maxmemory-policy allkeys-lru
   ```

2. **Optimize persistence**:
   ```bash
   # For high-write workloads
   save ""
   appendonly yes
   appendfsync everysec
   ```

3. **Tune networking**:
   ```bash
   # In redis.conf
   tcp-backlog 511
   tcp-keepalive 300
   timeout 0
   ```

### Monitoring and Alerting

1. **Set up monitoring**:
   - Monitor memory usage
   - Track slow queries
   - Monitor connection counts
   - Check replication lag (cluster)

2. **Set up alerts**:
   - High memory usage (>80%)
   - Slow queries (>100ms)
   - Connection limit approaching
   - Cluster node failures

## Integration with Creator Platform

### Cache Package Integration

The Redis instance integrates with the `@repo/cache` package:

```typescript
// Environment configuration
REDIS_URL=redis://localhost:6379
REDIS_CLUSTER_ENABLED=false

// For cluster
REDIS_CLUSTER_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=7000
```

### Key Patterns

The platform uses these key patterns:
- `creator-platform:session:*` - User sessions
- `creator-platform:tracking:*` - View tracking data
- `creator-platform:bot:*` - Bot analysis results
- `creator-platform:rate:*` - Rate limiting counters
- `creator-platform:payout:*` - Daily payout data

### TTL Policies

Default TTL policies:
- Sessions: 24 hours
- View tracking: 1 minute
- Bot analysis: 5 minutes
- Rate limiting: 1 hour
- Daily payouts: 24 hours

## Troubleshooting

### Common Issues

1. **Connection refused**:
   ```bash
   # Check if Redis is running
   docker ps | grep redis
   
   # Check logs
   docker logs creator-platform-redis
   ```

2. **Out of memory**:
   ```bash
   # Check memory usage
   docker exec creator-platform-redis redis-cli INFO memory
   
   # Increase maxmemory in redis.conf
   ```

3. **Cluster issues**:
   ```bash
   # Check cluster status
   docker exec creator-platform-redis-cluster redis-cli -p 7000 cluster nodes
   
   # Fix cluster if needed
   docker exec creator-platform-redis-cluster redis-cli -p 7000 cluster fix
   ```

### Logs

```bash
# View Redis logs
docker logs creator-platform-redis

# Follow logs
docker logs -f creator-platform-redis

# View cluster logs
docker logs creator-platform-redis-cluster
```

This Redis setup provides a robust caching foundation for the Creator Promotion Platform with both development and production configurations.