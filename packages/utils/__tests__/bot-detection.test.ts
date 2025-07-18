import { BotDetectionService, ViewRecord, BotDetectionConfig } from '../src/bot-detection';

describe('BotDetectionService', () => {
  let botDetectionService: BotDetectionService;
  const mockConfig: BotDetectionConfig = {
    thresholds: {
      viewLikeRatio: 10,
      viewCommentRatio: 100,
      spikePercentage: 500,
      spikeTimeWindow: 5 * 60 * 1000
    },
    confidence: {
      ban: 90,
      warning: 50,
      monitor: 20
    }
  };

  beforeEach(() => {
    botDetectionService = new BotDetectionService(mockConfig);
  });

  describe('analyzeViews', () => {
    const promoterId = 'promoter-123';
    const campaignId = 'campaign-456';

    it('should return normal activity for legitimate views', async () => {
      const viewRecords: ViewRecord[] = [
        {
          id: '1',
          promoterId,
          campaignId,
          platform: 'tiktok',
          platformPostId: 'post-1',
          viewCount: 100,
          likeCount: 15,
          commentCount: 3,
          shareCount: 2,
          timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        },
        {
          id: '2',
          promoterId,
          campaignId,
          platform: 'tiktok',
          platformPostId: 'post-1',
          viewCount: 120,
          likeCount: 18,
          commentCount: 4,
          shareCount: 3,
          timestamp: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
        }
      ];

      const analysis = await botDetectionService.analyzeViews(promoterId, campaignId, viewRecords);

      expect(analysis.botScore).toBeLessThan(mockConfig.confidence.monitor);
      expect(analysis.action).toBe('none');
      expect(analysis.metrics.viewLikeRatio).toBeLessThan(mockConfig.thresholds.viewLikeRatio);
      expect(analysis.metrics.viewCommentRatio).toBeLessThan(mockConfig.thresholds.viewCommentRatio);
      expect(analysis.metrics.spikeDetected).toBe(false);
    });

    it('should detect suspicious view:like ratio', async () => {
      const viewRecords: ViewRecord[] = [
        {
          id: '1',
          promoterId,
          campaignId,
          platform: 'tiktok',
          platformPostId: 'post-1',
          viewCount: 1000,
          likeCount: 5, // Very low likes for high views
          commentCount: 1,
          shareCount: 0,
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        }
      ];

      const analysis = await botDetectionService.analyzeViews(promoterId, campaignId, viewRecords);

      expect(analysis.metrics.viewLikeRatio).toBeGreaterThan(mockConfig.thresholds.viewLikeRatio);
      expect(analysis.botScore).toBeGreaterThanOrEqual(30); // Should add 30 points for ratio
      expect(analysis.action).not.toBe('none');
    });

    it('should detect suspicious view:comment ratio', async () => {
      const viewRecords: ViewRecord[] = [
        {
          id: '1',
          promoterId,
          campaignId,
          platform: 'tiktok',
          platformPostId: 'post-1',
          viewCount: 1000,
          likeCount: 100,
          commentCount: 1, // Very low comments for high views
          shareCount: 10,
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        }
      ];

      const analysis = await botDetectionService.analyzeViews(promoterId, campaignId, viewRecords);

      expect(analysis.metrics.viewCommentRatio).toBeGreaterThan(mockConfig.thresholds.viewCommentRatio);
      expect(analysis.botScore).toBeGreaterThanOrEqual(25); // Should add 25 points for ratio
    });

    it('should detect view spikes', async () => {
      const baseTime = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const viewRecords: ViewRecord[] = [
        // Normal baseline
        {
          id: '1',
          promoterId,
          campaignId,
          platform: 'tiktok',
          platformPostId: 'post-1',
          viewCount: 100,
          likeCount: 10,
          commentCount: 2,
          shareCount: 1,
          timestamp: new Date(baseTime)
        },
        // Sudden spike within 5 minutes - 700% increase (100 -> 800)
        {
          id: '2',
          promoterId,
          campaignId,
          platform: 'tiktok',
          platformPostId: 'post-1',
          viewCount: 800, // 700% increase from 100
          likeCount: 50,
          commentCount: 5,
          shareCount: 10,
          timestamp: new Date(baseTime + 3 * 60 * 1000) // 3 minutes later
        }
      ];

      const analysis = await botDetectionService.analyzeViews(promoterId, campaignId, viewRecords);

      expect(analysis.metrics.spikeDetected).toBe(true);
      expect(analysis.metrics.spikePercentage).toBeGreaterThan(mockConfig.thresholds.spikePercentage);
      expect(analysis.botScore).toBeGreaterThanOrEqual(45); // Should add 45 points for spike
    });

    it('should recommend ban for high confidence bot detection', async () => {
      const viewRecords: ViewRecord[] = [
        {
          id: '1',
          promoterId,
          campaignId,
          platform: 'tiktok',
          platformPostId: 'post-1',
          viewCount: 15000, // High view count
          likeCount: 0, // No likes at all
          commentCount: 0, // No comments at all
          shareCount: 0,
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        }
      ];

      const analysis = await botDetectionService.analyzeViews(promoterId, campaignId, viewRecords);

      // Should get points for:
      // - Abnormal view:like ratio (30 points) - 15000:0 > 10:1 threshold
      // - Abnormal view:comment ratio (25 points) - 15000:0 > 100:1 threshold  
      // - No engagement despite high views (20 points) - 0 likes and 0 comments
      // - Extremely high view rate (15 points) - 1500 views/minute > 1000 threshold
      // Total: 90+ points
      expect(analysis.botScore).toBeGreaterThanOrEqual(mockConfig.confidence.ban);
      expect(analysis.action).toBe('ban');
      expect(analysis.reason).toContain('Abnormal view:like ratio');
      expect(analysis.reason).toContain('No engagement despite high views');
    });

    it('should recommend warning for medium confidence', async () => {
      const viewRecords: ViewRecord[] = [
        {
          id: '1',
          promoterId,
          campaignId,
          platform: 'tiktok',
          platformPostId: 'post-1',
          viewCount: 500,
          likeCount: 20, // Moderately suspicious
          commentCount: 2,
          shareCount: 1,
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        }
      ];

      const analysis = await botDetectionService.analyzeViews(promoterId, campaignId, viewRecords);

      expect(analysis.botScore).toBeGreaterThanOrEqual(mockConfig.confidence.warning);
      expect(analysis.botScore).toBeLessThan(mockConfig.confidence.ban);
      expect(analysis.action).toBe('warning');
    });

    it('should handle empty view records', async () => {
      const analysis = await botDetectionService.analyzeViews(promoterId, campaignId, []);

      expect(analysis.metrics.totalViews).toBe(0);
      expect(analysis.metrics.totalLikes).toBe(0);
      expect(analysis.metrics.totalComments).toBe(0);
      expect(analysis.botScore).toBe(0);
      expect(analysis.action).toBe('none');
    });

    it('should filter records by promoter and campaign', async () => {
      const viewRecords: ViewRecord[] = [
        {
          id: '1',
          promoterId: 'other-promoter',
          campaignId,
          platform: 'tiktok',
          platformPostId: 'post-1',
          viewCount: 10000,
          likeCount: 1,
          commentCount: 0,
          shareCount: 0,
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        },
        {
          id: '2',
          promoterId,
          campaignId: 'other-campaign',
          platform: 'tiktok',
          platformPostId: 'post-2',
          viewCount: 10000,
          likeCount: 1,
          commentCount: 0,
          shareCount: 0,
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        },
        {
          id: '3',
          promoterId,
          campaignId,
          platform: 'tiktok',
          platformPostId: 'post-3',
          viewCount: 100,
          likeCount: 10,
          commentCount: 2,
          shareCount: 1,
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        }
      ];

      const analysis = await botDetectionService.analyzeViews(promoterId, campaignId, viewRecords);

      expect(analysis.metrics.totalViews).toBe(100); // Only the matching record
      expect(analysis.botScore).toBeLessThan(mockConfig.confidence.monitor);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = BotDetectionService.getDefaultConfig();

      expect(config.thresholds.viewLikeRatio).toBe(10);
      expect(config.thresholds.viewCommentRatio).toBe(100);
      expect(config.thresholds.spikePercentage).toBe(500);
      expect(config.confidence.ban).toBe(90);
      expect(config.confidence.warning).toBe(50);
      expect(config.confidence.monitor).toBe(20);
    });
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      const service = new BotDetectionService();
      // Should not throw and should work with default config
      expect(service).toBeInstanceOf(BotDetectionService);
    });

    it('should merge provided config with defaults', () => {
      const customConfig = {
        confidence: {
          ban: 95,
          warning: 60,
          monitor: 30
        }
      };
      
      const service = new BotDetectionService(customConfig);
      // Should work with merged config
      expect(service).toBeInstanceOf(BotDetectionService);
    });
  });
});