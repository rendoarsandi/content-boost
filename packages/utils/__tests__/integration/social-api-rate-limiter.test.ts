import { RedisCache } from '@repo/cache';
import { RateLimiter } from '../../src/social-api/rate-limiter';
import { SocialPlatform } from '../../src/social-api/types';

// Mock RedisCache
jest.mock('@repo/cache');

describe('RateLimiter', () => {
  let mockCache: jest.Mocked<RedisCache>;
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    mockCache = {
      getRateLimit: jest.fn(),
      incrementRateLimit: jest.fn(),
      del: jest.fn(),
    } as any;

    rateLimiter = new RateLimiter(mockCache);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should return correct rate limit status when not limited', async () => {
      const platform: SocialPlatform = 'tiktok';
      const userId = 'user123';
      
      mockCache.getRateLimit.mockResolvedValue(50);

      const result = await rateLimiter.checkRateLimit(platform, userId);

      expect(result).toEqual({
        platform,
        userId,
        remaining: 50, // 100 - 50
        resetTime: expect.any(Date),
        isLimited: false
      });
    });

    it('should return correct rate limit status when limited', async () => {
      const platform: SocialPlatform = 'tiktok';
      const userId = 'user123';
      
      mockCache.getRateLimit.mockResolvedValue(100);

      const result = await rateLimiter.checkRateLimit(platform, userId);

      expect(result).toEqual({
        platform,
        userId,
        remaining: 0,
        resetTime: expect.any(Date),
        isLimited: true
      });
    });

    it('should handle cache errors gracefully', async () => {
      const platform: SocialPlatform = 'instagram';
      const userId = 'user123';
      
      mockCache.getRateLimit.mockRejectedValue(new Error('Cache error'));

      const result = await rateLimiter.checkRateLimit(platform, userId);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(200); // Instagram default
    });
  });

  describe('incrementRateLimit', () => {
    it('should increment rate limit and return updated status', async () => {
      const platform: SocialPlatform = 'tiktok';
      const userId = 'user123';
      
      mockCache.incrementRateLimit.mockResolvedValue(51);

      const result = await rateLimiter.incrementRateLimit(platform, userId);

      expect(mockCache.incrementRateLimit).toHaveBeenCalledWith(platform, userId);
      expect(result).toEqual({
        platform,
        userId,
        remaining: 49, // 100 - 51
        resetTime: expect.any(Date),
        isLimited: false
      });
    });

    it('should handle rate limit reached', async () => {
      const platform: SocialPlatform = 'tiktok';
      const userId = 'user123';
      
      mockCache.incrementRateLimit.mockResolvedValue(100);

      const result = await rateLimiter.incrementRateLimit(platform, userId);

      expect(result.isLimited).toBe(true);
      expect(result.remaining).toBe(0);
    });
  });

  describe('isRateLimited', () => {
    it('should return true when rate limited', async () => {
      const platform: SocialPlatform = 'tiktok';
      const userId = 'user123';
      
      mockCache.getRateLimit.mockResolvedValue(100);

      const result = await rateLimiter.isRateLimited(platform, userId);

      expect(result).toBe(true);
    });

    it('should return false when not rate limited', async () => {
      const platform: SocialPlatform = 'tiktok';
      const userId = 'user123';
      
      mockCache.getRateLimit.mockResolvedValue(50);

      const result = await rateLimiter.isRateLimited(platform, userId);

      expect(result).toBe(false);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for user', async () => {
      const platform: SocialPlatform = 'tiktok';
      const userId = 'user123';
      
      mockCache.del.mockResolvedValue(1);

      await rateLimiter.resetRateLimit(platform, userId);

      expect(mockCache.del).toHaveBeenCalledWith('creator-platform:rate:tiktok:user123');
    });
  });

  describe('waitForRateLimit', () => {
    it('should not wait when not rate limited', async () => {
      const platform: SocialPlatform = 'tiktok';
      const userId = 'user123';
      
      mockCache.getRateLimit.mockResolvedValue(50);

      const startTime = Date.now();
      await rateLimiter.waitForRateLimit(platform, userId);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be immediate
    });

    it('should wait when rate limited', async () => {
      const platform: SocialPlatform = 'tiktok';
      const userId = 'user123';
      
      mockCache.getRateLimit.mockResolvedValue(100);

      // Mock a short wait time for testing
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback) => {
        setTimeout(callback, 10); // 10ms instead of full wait
        return {} as any;
      });

      const startTime = Date.now();
      await rateLimiter.waitForRateLimit(platform, userId);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThan(5);
      
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('getAllRateLimitStatus', () => {
    it('should return status for all platforms', async () => {
      const userId = 'user123';
      
      mockCache.getRateLimit
        .mockResolvedValueOnce(50) // TikTok
        .mockResolvedValueOnce(100); // Instagram

      const results = await rateLimiter.getAllRateLimitStatus(userId);

      expect(results).toHaveLength(2);
      expect(results[0].platform).toBe('tiktok');
      expect(results[1].platform).toBe('instagram');
    });
  });
});