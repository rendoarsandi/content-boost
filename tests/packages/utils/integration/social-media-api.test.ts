import { RedisCache } from '@repo/cache';
import {
  TikTokAPI,
  InstagramAPI,
  SocialMediaAPIManager,
  APIError,
  DEFAULT_RATE_LIMITS,
  createSocialMediaAPIManager,
} from '../src/social-media-api';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock Redis Cache
const mockCache = {
  getRateLimit: jest.fn(),
  incrementRateLimit: jest.fn(),
  ttl: jest.fn(),
  getKeyManager: jest.fn(() => ({
    rateLimit: jest.fn(
      (platform: string, userId: string) => `rate:${platform}:${userId}`
    ),
  })),
} as unknown as RedisCache;

describe('Social Media API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('APIError', () => {
    it('should create APIError with correct properties', () => {
      const error = new APIError({
        code: 'TEST_ERROR',
        message: 'Test error message',
        statusCode: 400,
        retryable: true,
        retryAfter: 60,
      });

      expect(error.name).toBe('APIError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('Rate Limiting Configuration', () => {
    it('should have correct default rate limits for TikTok', () => {
      expect(DEFAULT_RATE_LIMITS.tiktok).toEqual({
        maxRequests: 100,
        windowMs: 60 * 60 * 1000,
        backoffMultiplier: 2,
        maxBackoffMs: 30000,
        maxRetries: 3,
      });
    });

    it('should have correct default rate limits for Instagram', () => {
      expect(DEFAULT_RATE_LIMITS.instagram).toEqual({
        maxRequests: 200,
        windowMs: 60 * 60 * 1000,
        backoffMultiplier: 2,
        maxBackoffMs: 30000,
        maxRetries: 3,
      });
    });
  });

  describe('TikTokAPI', () => {
    let tiktokAPI: TikTokAPI;

    beforeEach(() => {
      tiktokAPI = new TikTokAPI(mockCache);
    });

    describe('getMetrics', () => {
      it('should successfully fetch TikTok video metrics', async () => {
        const mockResponse = {
          data: {
            videos: [
              {
                id: 'video123',
                view_count: 1000,
                like_count: 100,
                comment_count: 50,
                share_count: 25,
                download_count: 10,
              },
            ],
          },
        };

        mockCache.getRateLimit = jest.fn().mockResolvedValue(0);
        mockCache.incrementRateLimit = jest.fn().mockResolvedValue(1);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockResponse),
        });

        const result = await tiktokAPI.getMetrics(
          'access_token',
          'video123',
          'user123'
        );

        expect(result).toEqual({
          videoId: 'video123',
          viewCount: 1000,
          likeCount: 100,
          commentCount: 50,
          shareCount: 25,
          playCount: 1000,
          downloadCount: 10,
          timestamp: expect.any(Date),
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://open-api.tiktok.com/v2/video/query/',
          expect.objectContaining({
            method: 'POST',
            headers: {
              Authorization: 'Bearer access_token',
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('video123'),
          })
        );
      });

      it('should handle video not found error', async () => {
        mockCache.getRateLimit = jest.fn().mockResolvedValue(0);
        mockCache.incrementRateLimit = jest.fn().mockResolvedValue(1);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: { videos: [] } }),
        });

        await expect(
          tiktokAPI.getMetrics('access_token', 'video123', 'user123')
        ).rejects.toThrow('Video with ID video123 not found');
      });
    });

    describe('validateToken', () => {
      it('should validate token successfully', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true });

        const result = await tiktokAPI.validateToken('valid_token');

        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://open-api.tiktok.com/v2/user/info/',
          {
            headers: {
              Authorization: 'Bearer valid_token',
            },
          }
        );
      });

      it('should return false for invalid token', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const result = await tiktokAPI.validateToken('invalid_token');

        expect(result).toBe(false);
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await tiktokAPI.validateToken('token');

        expect(result).toBe(false);
      });
    });

    describe('refreshToken', () => {
      beforeEach(() => {
        process.env.TIKTOK_CLIENT_ID = 'test_client_id';
        process.env.TIKTOK_CLIENT_SECRET = 'test_client_secret';
      });

      it('should refresh token successfully', async () => {
        const mockResponse = {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockResponse),
        });

        const result = await tiktokAPI.refreshToken('refresh_token');

        expect(result).toEqual({
          accessToken: 'new_access_token',
          refreshToken: 'new_refresh_token',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://open-api.tiktok.com/oauth/refresh_token/',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
        );
      });

      it('should handle refresh token errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: jest.fn().mockResolvedValue({}),
        });

        await expect(
          tiktokAPI.refreshToken('invalid_refresh_token')
        ).rejects.toThrow(APIError);
      });
    });
  });

  describe('InstagramAPI', () => {
    let instagramAPI: InstagramAPI;

    beforeEach(() => {
      instagramAPI = new InstagramAPI(mockCache);
    });

    describe('getMetrics', () => {
      it('should successfully fetch Instagram media metrics', async () => {
        const mockResponse = {
          id: 'media123',
          impressions: 1500,
          like_count: 120,
          comments_count: 30,
          reach: 1200,
          saved: 45,
        };

        mockCache.getRateLimit = jest.fn().mockResolvedValue(0);
        mockCache.incrementRateLimit = jest.fn().mockResolvedValue(1);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockResponse),
        });

        const result = await instagramAPI.getMetrics(
          'access_token',
          'media123',
          'user123'
        );

        expect(result).toEqual({
          mediaId: 'media123',
          viewCount: 1500,
          likeCount: 120,
          commentCount: 30,
          shareCount: 0,
          impressions: 1500,
          reach: 1200,
          saved: 45,
          timestamp: expect.any(Date),
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://graph.instagram.com/media123')
        );
      });

      it('should handle Instagram API errors', async () => {
        mockCache.getRateLimit = jest.fn().mockResolvedValue(0);
        mockCache.incrementRateLimit = jest.fn().mockResolvedValue(1);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: jest.fn().mockResolvedValue({
            error: { code: 'INVALID_MEDIA', message: 'Media not found' },
          }),
        });

        await expect(
          instagramAPI.getMetrics('access_token', 'invalid_media', 'user123')
        ).rejects.toThrow(APIError);
      });
    });

    describe('validateToken', () => {
      it('should validate Instagram token successfully', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true });

        const result = await instagramAPI.validateToken('valid_token');

        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://graph.instagram.com/me')
        );
      });
    });

    describe('refreshToken', () => {
      it('should refresh Instagram token successfully', async () => {
        const mockResponse = {
          access_token: 'new_access_token',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockResponse),
        });

        const result = await instagramAPI.refreshToken('access_token');

        expect(result).toEqual({
          accessToken: 'new_access_token',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(
            'https://graph.instagram.com/refresh_access_token'
          ),
          { method: 'GET' }
        );
      });
    });
  });

  describe('SocialMediaAPIManager', () => {
    let manager: SocialMediaAPIManager;

    beforeEach(() => {
      manager = new SocialMediaAPIManager(mockCache);
    });

    describe('getMetrics', () => {
      it('should route TikTok requests correctly', async () => {
        mockCache.getRateLimit = jest.fn().mockResolvedValue(0);
        mockCache.incrementRateLimit = jest.fn().mockResolvedValue(1);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: {
              videos: [
                {
                  id: 'video123',
                  view_count: 1000,
                  like_count: 100,
                  comment_count: 50,
                  share_count: 25,
                  download_count: 10,
                },
              ],
            },
          }),
        });

        const result = await manager.getMetrics(
          'tiktok',
          'token',
          'video123',
          'user123'
        );

        expect(result.viewCount).toBe(1000);
        expect(result.likeCount).toBe(100);
      });

      it('should route Instagram requests correctly', async () => {
        mockCache.getRateLimit = jest.fn().mockResolvedValue(0);
        mockCache.incrementRateLimit = jest.fn().mockResolvedValue(1);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            id: 'media123',
            impressions: 1500,
            like_count: 120,
            comments_count: 30,
            reach: 1200,
            saved: 45,
          }),
        });

        const result = await manager.getMetrics(
          'instagram',
          'token',
          'media123',
          'user123'
        );

        expect(result.viewCount).toBe(1500);
        expect(result.likeCount).toBe(120);
      });

      it('should throw error for unsupported platform', async () => {
        await expect(
          manager.getMetrics('youtube' as any, 'token', 'video123', 'user123')
        ).rejects.toThrow('Unsupported platform: youtube');
      });
    });

    describe('getRateLimitInfo', () => {
      it('should return rate limit info for TikTok', async () => {
        mockCache.getRateLimit = jest.fn().mockResolvedValue(50);
        mockCache.ttl = jest.fn().mockResolvedValue(1800); // 30 minutes

        const info = await manager.getRateLimitInfo('tiktok', 'user123');

        expect(info.limit).toBe(100);
        expect(info.remaining).toBe(50);
        expect(info.resetTime).toBeInstanceOf(Date);
      });

      it('should return rate limit info for Instagram', async () => {
        mockCache.getRateLimit = jest.fn().mockResolvedValue(150);
        mockCache.ttl = jest.fn().mockResolvedValue(1800);

        const info = await manager.getRateLimitInfo('instagram', 'user123');

        expect(info.limit).toBe(200);
        expect(info.remaining).toBe(50);
      });
    });

    describe('healthCheck', () => {
      it('should return health status for all platforms', async () => {
        // Mock token validation calls
        mockFetch
          .mockResolvedValueOnce({ ok: false }) // TikTok fails
          .mockResolvedValueOnce({ ok: false }); // Instagram fails

        const health = await manager.healthCheck();

        expect(health).toEqual({
          tiktok: false,
          instagram: false,
        });
      });
    });
  });

  describe('Factory Function', () => {
    it('should create SocialMediaAPIManager instance', () => {
      const manager = createSocialMediaAPIManager(mockCache);

      expect(manager).toBeInstanceOf(SocialMediaAPIManager);
    });
  });

  describe('Rate Limiting Integration', () => {
    let tiktokAPI: TikTokAPI;

    beforeEach(() => {
      tiktokAPI = new TikTokAPI(mockCache);
    });

    it('should increment rate limit counter on successful request', async () => {
      mockCache.getRateLimit = jest.fn().mockResolvedValue(0);
      mockCache.incrementRateLimit = jest.fn().mockResolvedValue(1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: {
            videos: [
              {
                id: 'video123',
                view_count: 1000,
                like_count: 100,
                comment_count: 50,
                share_count: 25,
                download_count: 10,
              },
            ],
          },
        }),
      });

      await tiktokAPI.getMetrics('token', 'video123', 'user123');

      expect(mockCache.incrementRateLimit).toHaveBeenCalledWith(
        'tiktok',
        'user123'
      );
    });

    it('should respect rate limits and throw appropriate error', async () => {
      mockCache.getRateLimit = jest.fn().mockResolvedValue(100); // At limit
      mockCache.ttl = jest.fn().mockResolvedValue(3600);

      await expect(
        tiktokAPI.getMetrics('token', 'video123', 'user123')
      ).rejects.toThrow('Rate limit exceeded for tiktok');

      expect(mockCache.incrementRateLimit).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Exponential Backoff', () => {
    let tiktokAPI: TikTokAPI;

    beforeEach(() => {
      tiktokAPI = new TikTokAPI(mockCache);
      jest
        .spyOn(tiktokAPI as any, 'sleep')
        .mockImplementation(() => Promise.resolve());
    });

    it('should retry on retryable errors with exponential backoff', async () => {
      mockCache.getRateLimit = jest.fn().mockResolvedValue(0);
      mockCache.incrementRateLimit = jest.fn().mockResolvedValue(1);

      // All attempts fail
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: jest.fn().mockResolvedValue({
            error: { code: 'SERVER_ERROR', message: 'Server error' },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: jest.fn().mockResolvedValue({
            error: { code: 'SERVER_ERROR', message: 'Server error' },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: jest.fn().mockResolvedValue({
            error: { code: 'SERVER_ERROR', message: 'Server error' },
          }),
        });

      await expect(
        tiktokAPI.getMetrics('token', 'video123', 'user123')
      ).rejects.toThrow(APIError);

      // Should have made 3 attempts (initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect((tiktokAPI as any).sleep).toHaveBeenCalledTimes(2); // 2 backoff delays
    });

    it('should not retry on non-retryable errors', async () => {
      mockCache.getRateLimit = jest.fn().mockResolvedValue(0);
      mockCache.incrementRateLimit = jest.fn().mockResolvedValue(1);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: { code: 'BAD_REQUEST', message: 'Bad request' },
        }),
      });

      await expect(
        tiktokAPI.getMetrics('token', 'video123', 'user123')
      ).rejects.toThrow(APIError);

      // Should have made only 1 attempt
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect((tiktokAPI as any).sleep).not.toHaveBeenCalled();
    });

    it('should eventually succeed after retries', async () => {
      mockCache.getRateLimit = jest.fn().mockResolvedValue(0);
      mockCache.incrementRateLimit = jest.fn().mockResolvedValue(1);

      // First two attempts fail, third succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: jest.fn().mockResolvedValue({
            error: { code: 'SERVER_ERROR', message: 'Server error' },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: jest.fn().mockResolvedValue({
            error: { code: 'SERVER_ERROR', message: 'Server error' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: {
              videos: [
                {
                  id: 'video123',
                  view_count: 1000,
                  like_count: 100,
                  comment_count: 50,
                  share_count: 25,
                  download_count: 10,
                },
              ],
            },
          }),
        });

      const result = await tiktokAPI.getMetrics('token', 'video123', 'user123');

      expect(result.viewCount).toBe(1000);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect((tiktokAPI as any).sleep).toHaveBeenCalledTimes(2);
    });
  });
});
