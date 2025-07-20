import { RedisCache } from '@repo/cache';
import { SocialMediaAPIManager } from '../../src/social-api/manager';
import { TikTokAPIClient } from '../../src/social-api/tiktok-client';
import { InstagramAPIClient } from '../../src/social-api/instagram-client';
import { APIClientConfig, SocialPlatform } from '../../src/social-api/types';

// Mock dependencies
jest.mock('@repo/cache');
jest.mock('../../src/social-api/tiktok-client');
jest.mock('../../src/social-api/instagram-client');

describe('SocialMediaAPIManager', () => {
  let mockCache: jest.Mocked<RedisCache>;
  let manager: SocialMediaAPIManager;
  let mockTikTokClient: jest.Mocked<TikTokAPIClient>;
  let mockInstagramClient: jest.Mocked<InstagramAPIClient>;

  beforeEach(() => {
    mockCache = {} as any;
    manager = new SocialMediaAPIManager(mockCache);

    mockTikTokClient = {
      platform: 'tiktok',
      getUserMetrics: jest.fn(),
      getPostMetrics: jest.fn(),
      validateToken: jest.fn(),
    } as any;

    mockInstagramClient = {
      platform: 'instagram',
      getUserMetrics: jest.fn(),
      getPostMetrics: jest.fn(),
      validateToken: jest.fn(),
    } as any;

    (TikTokAPIClient as jest.Mock).mockImplementation(() => mockTikTokClient);
    (InstagramAPIClient as jest.Mock).mockImplementation(() => mockInstagramClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerClient', () => {
    it('should register TikTok client', () => {
      const config: APIClientConfig = {
        accessToken: 'token123',
        userId: 'user123',
        platform: 'tiktok'
      };

      manager.registerClient('user123', 'tiktok', config);

      expect(TikTokAPIClient).toHaveBeenCalledWith(
        config,
        expect.any(Object), // RateLimiter
        expect.any(Object)  // APIErrorHandler
      );
      expect(manager.hasClient('user123', 'tiktok')).toBe(true);
    });

    it('should register Instagram client', () => {
      const config: APIClientConfig = {
        accessToken: 'token123',
        userId: 'user123',
        platform: 'instagram'
      };

      manager.registerClient('user123', 'instagram', config);

      expect(InstagramAPIClient).toHaveBeenCalledWith(
        config,
        expect.any(Object), // RateLimiter
        expect.any(Object)  // APIErrorHandler
      );
      expect(manager.hasClient('user123', 'instagram')).toBe(true);
    });

    it('should throw error for unsupported platform', () => {
      const config: APIClientConfig = {
        accessToken: 'token123',
        userId: 'user123',
        platform: 'youtube' as any
      };

      expect(() => {
        manager.registerClient('user123', 'youtube' as any, config);
      }).toThrow('Unsupported platform: youtube');
    });
  });

  describe('unregisterClient', () => {
    it('should unregister client', () => {
      const config: APIClientConfig = {
        accessToken: 'token123',
        userId: 'user123',
        platform: 'tiktok'
      };

      manager.registerClient('user123', 'tiktok', config);
      expect(manager.hasClient('user123', 'tiktok')).toBe(true);

      manager.unregisterClient('user123', 'tiktok');
      expect(manager.hasClient('user123', 'tiktok')).toBe(false);
    });
  });

  describe('collectMetrics', () => {
    beforeEach(() => {
      const config: APIClientConfig = {
        accessToken: 'token123',
        userId: 'user123',
        platform: 'tiktok'
      };
      manager.registerClient('user123', 'tiktok', config);
    });

    it('should collect metrics successfully', async () => {
      const mockMetrics = {
        platform: 'tiktok' as SocialPlatform,
        postId: 'post123',
        userId: 'user123',
        campaignId: '',
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5
        },
        timestamp: new Date(),
        isValid: true
      };

      mockTikTokClient.getUserMetrics.mockResolvedValue({
        success: true,
        data: mockMetrics
      });

      const result = await manager.collectMetrics('user123', 'tiktok', 'post123', 'campaign123');

      expect(result.success).toBe(true);
      expect(result.metrics?.campaignId).toBe('campaign123');
      expect(mockTikTokClient.getUserMetrics).toHaveBeenCalledWith('post123');
    });

    it('should handle client not found', async () => {
      const result = await manager.collectMetrics('user456', 'tiktok', 'post123', 'campaign123');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('No client registered');
    });

    it('should handle API errors', async () => {
      mockTikTokClient.getUserMetrics.mockResolvedValue({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Rate limit exceeded'
        }
      });

      const result = await manager.collectMetrics('user123', 'tiktok', 'post123', 'campaign123');

      expect(result.success).toBe(false);
      expect(result.rateLimited).toBe(true);
      expect(result.error?.code).toBe('RATE_LIMITED');
    });
  });

  describe('collectBatchMetrics', () => {
    beforeEach(() => {
      const tiktokConfig: APIClientConfig = {
        accessToken: 'token123',
        userId: 'user123',
        platform: 'tiktok'
      };
      const instagramConfig: APIClientConfig = {
        accessToken: 'token456',
        userId: 'user456',
        platform: 'instagram'
      };

      manager.registerClient('user123', 'tiktok', tiktokConfig);
      manager.registerClient('user456', 'instagram', instagramConfig);
    });

    it('should collect metrics for multiple requests', async () => {
      const mockTikTokMetrics = {
        platform: 'tiktok' as SocialPlatform,
        postId: 'post123',
        userId: 'user123',
        campaignId: '',
        metrics: { views: 1000, likes: 100, comments: 10, shares: 5 },
        timestamp: new Date(),
        isValid: true
      };

      const mockInstagramMetrics = {
        platform: 'instagram' as SocialPlatform,
        postId: 'post456',
        userId: 'user456',
        campaignId: '',
        metrics: { views: 2000, likes: 200, comments: 20, shares: 10 },
        timestamp: new Date(),
        isValid: true
      };

      mockTikTokClient.getUserMetrics.mockResolvedValue({
        success: true,
        data: mockTikTokMetrics
      });

      mockInstagramClient.getUserMetrics.mockResolvedValue({
        success: true,
        data: mockInstagramMetrics
      });

      const requests = [
        { userId: 'user123', platform: 'tiktok' as SocialPlatform, postId: 'post123', campaignId: 'campaign123' },
        { userId: 'user456', platform: 'instagram' as SocialPlatform, postId: 'post456', campaignId: 'campaign456' }
      ];

      const results = await manager.collectBatchMetrics(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].metrics?.campaignId).toBe('campaign123');
      expect(results[1].metrics?.campaignId).toBe('campaign456');
    });
  });

  describe('validateAllTokens', () => {
    beforeEach(() => {
      const config1: APIClientConfig = {
        accessToken: 'token123',
        userId: 'user123',
        platform: 'tiktok'
      };
      const config2: APIClientConfig = {
        accessToken: 'token456',
        userId: 'user456',
        platform: 'instagram'
      };

      manager.registerClient('user123', 'tiktok', config1);
      manager.registerClient('user456', 'instagram', config2);
    });

    it('should validate all registered tokens', async () => {
      mockTikTokClient.validateToken.mockResolvedValue(true);
      mockInstagramClient.validateToken.mockResolvedValue(false);

      const results = await manager.validateAllTokens();

      expect(results.size).toBe(2);
      expect(results.get('user123:tiktok')).toBe(true);
      expect(results.get('user456:instagram')).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      const config1: APIClientConfig = {
        accessToken: 'token123',
        userId: 'user123',
        platform: 'tiktok'
      };
      const config2: APIClientConfig = {
        accessToken: 'token456',
        userId: 'user123',
        platform: 'instagram'
      };
      const config3: APIClientConfig = {
        accessToken: 'token789',
        userId: 'user456',
        platform: 'tiktok'
      };

      manager.registerClient('user123', 'tiktok', config1);
      manager.registerClient('user123', 'instagram', config2);
      manager.registerClient('user456', 'tiktok', config3);

      const stats = manager.getStatistics();

      expect(stats.totalClients).toBe(3);
      expect(stats.clientsByPlatform.tiktok).toBe(2);
      expect(stats.clientsByPlatform.instagram).toBe(1);
      expect(stats.clientsByUser.user123).toBe(2);
      expect(stats.clientsByUser.user456).toBe(1);
    });
  });

  describe('clearAllClients', () => {
    it('should clear all registered clients', () => {
      const config: APIClientConfig = {
        accessToken: 'token123',
        userId: 'user123',
        platform: 'tiktok'
      };

      manager.registerClient('user123', 'tiktok', config);
      expect(manager.hasClient('user123', 'tiktok')).toBe(true);

      manager.clearAllClients();
      expect(manager.hasClient('user123', 'tiktok')).toBe(false);
      expect(manager.getStatistics().totalClients).toBe(0);
    });
  });
});