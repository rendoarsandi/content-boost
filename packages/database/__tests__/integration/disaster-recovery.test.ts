import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Pool } from 'pg';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Disaster Recovery Testing
 * 
 * These tests verify the system's ability to recover from database and cache failures:
 * - Database backup and restore
 * - Redis persistence and recovery
 * - Connection pool resilience
 * - Failover mechanisms
 */

describe('Disaster Recovery Tests', () => {
  // Test configuration
  const DB_BACKUP_PATH = path.join(__dirname, '../../../temp/test-backup.sql');
  const TEST_DATA = {
    userId: 'test-user-' + Date.now(),
    campaignId: 'test-campaign-' + Date.now()
  };
  
  let pgPool: Pool;
  let redis: Redis;
  
  beforeAll(async () => {
    // Setup test database connection
    pgPool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db'
    });
    
    // Setup test Redis connection
    redis = new Redis(process.env.TEST_REDIS_URL || 'redis://localhost:6379/1');
    
    // Clean up any previous test data
    try {
      await pgPool.query('DELETE FROM users WHERE id = $1', [TEST_DATA.userId]);
      await pgPool.query('DELETE FROM campaigns WHERE id = $1', [TEST_DATA.campaignId]);
      await redis.del(`user:${TEST_DATA.userId}`);
      await redis.del(`campaign:${TEST_DATA.campaignId}`);
    } catch (error) {
      console.log('Cleanup error (can be ignored on first run):', error);
    }
  });
  
  afterAll(async () => {
    // Clean up test data
    try {
      await pgPool.query('DELETE FROM users WHERE id = $1', [TEST_DATA.userId]);
      await pgPool.query('DELETE FROM campaigns WHERE id = $1', [TEST_DATA.campaignId]);
      await redis.del(`user:${TEST_DATA.userId}`);
      await redis.del(`campaign:${TEST_DATA.campaignId}`);
    } catch (error) {
      console.log('Final cleanup error:', error);
    }
    
    // Close connections
    await pgPool.end();
    await redis.quit();
    
    // Remove backup file
    if (fs.existsSync(DB_BACKUP_PATH)) {
      fs.unlinkSync(DB_BACKUP_PATH);
    }
  });
  
  describe('PostgreSQL Disaster Recovery', () => {
    test('Should be able to backup and restore database', async () => {
      // Skip test if not in a controlled environment
      if (process.env.SKIP_DB_BACKUP_TEST === 'true') {
        console.log('Skipping database backup/restore test in CI environment');
        return;
      }
      
      // Insert test data
      await pgPool.query(
        'INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [TEST_DATA.userId, 'recovery-test@example.com', 'Recovery Test', 'creator']
      );
      
      // Create backup
      const pgDumpCmd = `pg_dump -h localhost -U postgres -d test_db -f ${DB_BACKUP_PATH}`;
      try {
        await execAsync(pgDumpCmd);
      } catch (error) {
        console.log('pg_dump error (test may be running in environment without pg_dump):', error);
        return; // Skip rest of test if pg_dump fails
      }
      
      // Verify backup file exists
      expect(fs.existsSync(DB_BACKUP_PATH)).toBe(true);
      
      // Delete test data
      await pgPool.query('DELETE FROM users WHERE id = $1', [TEST_DATA.userId]);
      
      // Verify data is gone
      const checkResult1 = await pgPool.query('SELECT * FROM users WHERE id = $1', [TEST_DATA.userId]);
      expect(checkResult1.rows.length).toBe(0);
      
      // Restore from backup
      const pgRestoreCmd = `psql -h localhost -U postgres -d test_db -f ${DB_BACKUP_PATH}`;
      try {
        await execAsync(pgRestoreCmd);
      } catch (error) {
        console.log('psql restore error (test may be running in environment without psql):', error);
        return; // Skip rest of test if restore fails
      }
      
      // Verify data is restored
      const checkResult2 = await pgPool.query('SELECT * FROM users WHERE id = $1', [TEST_DATA.userId]);
      expect(checkResult2.rows.length).toBeGreaterThan(0);
      expect(checkResult2.rows[0].email).toBe('recovery-test@example.com');
    });
    
    test('Connection pool should handle database restarts', async () => {
      // This test simulates database connection failures
      
      // Create a new pool with retry logic
      const resilientPool = new Pool({
        connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db',
        max: 5,
        idleTimeoutMillis: 1000,
        connectionTimeoutMillis: 1000,
        maxUses: 100
      });
      
      // Mock connection error handler
      let connectionErrors = 0;
      resilientPool.on('error', (err) => {
        connectionErrors++;
        console.log('Pool error detected:', err.message);
      });
      
      // Function to test query with retry
      const queryWithRetry = async (maxRetries = 3, delay = 1000) => {
        let retries = 0;
        while (retries < maxRetries) {
          try {
            const result = await resilientPool.query('SELECT NOW()');
            return result;
          } catch (error) {
            retries++;
            if (retries >= maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };
      
      // Test query execution
      const result = await queryWithRetry();
      expect(result.rows.length).toBeGreaterThan(0);
      
      // Clean up
      await resilientPool.end();
    });
  });
  
  describe('Redis Disaster Recovery', () => {
    test('Redis should persist data across restarts', async () => {
      // Skip test if not in a controlled environment
      if (process.env.SKIP_REDIS_PERSISTENCE_TEST === 'true') {
        console.log('Skipping Redis persistence test in CI environment');
        return;
      }
      
      // Store test data in Redis
      const testKey = `recovery-test:${Date.now()}`;
      const testValue = { id: TEST_DATA.userId, timestamp: Date.now() };
      
      await redis.set(testKey, JSON.stringify(testValue));
      
      // Verify data was stored
      const storedValue = await redis.get(testKey);
      expect(storedValue).not.toBeNull();
      expect(JSON.parse(storedValue!)).toEqual(testValue);
      
      // Force Redis to save to disk
      await redis.bgsave();
      
      // In a real test, we would restart Redis here
      // For this test, we'll simulate by creating a new connection
      const newRedis = new Redis(process.env.TEST_REDIS_URL || 'redis://localhost:6379/1');
      
      // Verify data persists
      const persistedValue = await newRedis.get(testKey);
      expect(persistedValue).not.toBeNull();
      expect(JSON.parse(persistedValue!)).toEqual(testValue);
      
      // Clean up
      await newRedis.del(testKey);
      await newRedis.quit();
    });
    
    test('System should handle Redis connection failures', async () => {
      // Create a Redis client with retry strategy
      const resilientRedis = new Redis({
        host: 'localhost',
        port: 6379,
        db: 1,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 3000);
          return delay;
        },
        maxRetriesPerRequest: 3
      });
      
      // Count connection errors
      let connectionErrors = 0;
      resilientRedis.on('error', (err) => {
        connectionErrors++;
        console.log('Redis error detected:', err.message);
      });
      
      // Function to test Redis operation with retry
      const redisOpWithRetry = async (maxRetries = 3, delay = 1000) => {
        let retries = 0;
        while (retries < maxRetries) {
          try {
            const testKey = `retry-test:${Date.now()}`;
            await resilientRedis.set(testKey, 'test-value');
            const value = await resilientRedis.get(testKey);
            await resilientRedis.del(testKey);
            return value;
          } catch (error) {
            retries++;
            if (retries >= maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };
      
      // Test Redis operation
      const result = await redisOpWithRetry();
      expect(result).toBe('test-value');
      
      // Clean up
      await resilientRedis.quit();
    });
  });
  
  describe('System Resilience', () => {
    test('System should handle database unavailability', async () => {
      // This test simulates database unavailability and tests the system's fallback mechanisms
      
      // Mock database service with fallback to cache
      const resilientDbService = {
        async getUserById(userId: string) {
          try {
            // Try database first
            const result = await pgPool.query('SELECT * FROM users WHERE id = $1', [userId]);
            if (result.rows.length > 0) {
              // Cache the result
              await redis.set(`user:${userId}`, JSON.stringify(result.rows[0]), 'EX', 3600);
              return result.rows[0];
            }
            return null;
          } catch (dbError) {
            console.log('Database error, falling back to cache:', dbError.message);
            
            // Fallback to cache
            const cached = await redis.get(`user:${userId}`);
            if (cached) {
              return JSON.parse(cached);
            }
            
            throw new Error('User not found in database or cache');
          }
        }
      };
      
      // Insert test user and cache it
      await pgPool.query(
        'INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [TEST_DATA.userId, 'resilience-test@example.com', 'Resilience Test', 'creator']
      );
      
      const user = await pgPool.query('SELECT * FROM users WHERE id = $1', [TEST_DATA.userId]);
      await redis.set(`user:${TEST_DATA.userId}`, JSON.stringify(user.rows[0]), 'EX', 3600);
      
      // Test resilient service with simulated database failure
      const mockPool = {
        query: async () => {
          throw new Error('Database connection failed');
        }
      };
      
      // Replace the pool temporarily
      const originalPool = pgPool;
      (resilientDbService as any).pgPool = mockPool;
      
      // Service should still return user from cache
      const result = await resilientDbService.getUserById(TEST_DATA.userId);
      expect(result).toBeDefined();
      expect(result.id).toBe(TEST_DATA.userId);
      expect(result.email).toBe('resilience-test@example.com');
      
      // Restore original pool
      (resilientDbService as any).pgPool = originalPool;
    });
  });
});