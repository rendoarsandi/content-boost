import { RealTimeBotAnalyzer, RealTimeBotAnalyzerConfig } from '../src/real-time-bot-analyzer';
import { BotDetectionService, ViewRecord, BotAnalysis } from '../src/bot-detection';

// Mock the BotDetectionService
jest.mock('../src/bot-detection', () => ({
  BotDetectionService: jest.fn().mockImplementation(() => ({
    analyzeViews: jest.fn()
  }))
}));

describe('RealTimeBotAnalyzer', () => {
  let analyzer: RealTimeBotAnalyzer;
  let mockBotDetectionService: jest.Mocked<BotDetectionService>;
  let mockConfig: Partial<RealTimeBotAnalyzerConfig>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock bot detection service
    mockBotDetectionService = {
      analyzeViews: jest.fn()
    } as any;

    // Mock config
    mockConfig = {
      analysisInterval: 1000, // 1 second for testing
      batchSize: 10,
      cacheTimeout: 60, // 1 minute
      enableAutoActions: false, // Disable for testing
      logLevel: 'error' // Reduce noise in tests
    };

    analyzer = new RealTimeBotAnalyzer(mockBotDetectionService, mockConfig);
  });

  afterEach(() => {
    analyzer.stop();
  });

  describe('Constructor and Configuration', () => {
    it('should create analyzer with default configuration', () => {
      const defaultAnalyzer = new RealTimeBotAnalyzer();
      expect(defaultAnalyzer).toBeInstanceOf(RealTimeBotAnalyzer);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig = { analysisInterval: 5000 };
      const customAnalyzer = new RealTimeBotAnalyzer(undefined, customConfig);
      expect(customAnalyzer).toBeInstanceOf(RealTimeBotAnalyzer);
    });
  });

  describe('Start and Stop', () => {
    it('should start the analyzer', () => {
      analyzer.start();
      const stats = analyzer.getStatistics();
      expect(stats.isRunning).toBe(true);
    });

    it('should stop the analyzer', () => {
      analyzer.start();
      analyzer.stop();
      const stats = analyzer.getStatistics();
      expect(stats.isRunning).toBe(false);
    });

    it('should not start if already running', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      analyzer.start();
      analyzer.start(); // Try to start again
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already running')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('View Records Management', () => {
    const sampleViewRecords: ViewRecord[] = [
      {
        id: '1',
        promoterId: 'promoter1',
        campaignId: 'campaign1',
        platform: 'tiktok',
        platformPostId: 'post1',
        viewCount: 100,
        likeCount: 10,
        commentCount: 5,
        shareCount: 2,
        timestamp: new Date()
      },
      {
        id: '2',
        promoterId: 'promoter1',
        campaignId: 'campaign1',
        platform: 'tiktok',
        platformPostId: 'post1',
        viewCount: 150,
        likeCount: 15,
        commentCount: 7,
        shareCount: 3,
        timestamp: new Date()
      }
    ];

    it('should add view records to queue', () => {
      analyzer.addViewRecords(sampleViewRecords);
      const stats = analyzer.getStatistics();
      expect(stats.queueSize).toBe(2);
    });

    it('should filter old records from queue', () => {
      const oldRecord: ViewRecord = {
        ...sampleViewRecords[0],
        timestamp: new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago
      };
      
      analyzer.addViewRecords([oldRecord, ...sampleViewRecords]);
      const stats = analyzer.getStatistics();
      expect(stats.queueSize).toBe(2); // Only recent records should remain
    });
  });

  describe('Immediate Analysis', () => {
    const mockAnalysis: BotAnalysis = {
      promoterId: 'promoter1',
      campaignId: 'campaign1',
      analysisWindow: {
        start: new Date(Date.now() - 10 * 60 * 1000),
        end: new Date()
      },
      metrics: {
        avgViewsPerMinute: 50,
        avgLikesPerMinute: 5,
        avgCommentsPerMinute: 2,
        viewLikeRatio: 10,
        viewCommentRatio: 25,
        spikeDetected: false,
        totalViews: 500,
        totalLikes: 50,
        totalComments: 20
      },
      botScore: 25,
      action: 'monitor',
      reason: 'Normal activity detected',
      confidence: 25
    };

    beforeEach(() => {
      mockBotDetectionService.analyzeViews.mockResolvedValue(mockAnalysis);
    });

    it('should perform immediate analysis', async () => {
      const result = await analyzer.analyzeImmediate('promoter1', 'campaign1');
      
      expect(result.analysis).toEqual(mockAnalysis);
      expect(result.actionTaken).toBe(false); // Actions disabled in test config
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should return cached result if available', async () => {
      // First call
      await analyzer.analyzeImmediate('promoter1', 'campaign1');
      
      // Second call should return cached result
      const result = await analyzer.analyzeImmediate('promoter1', 'campaign1');
      
      expect(mockBotDetectionService.analyzeViews).toHaveBeenCalledTimes(1);
      expect(result.analysis).toEqual(mockAnalysis);
    });

    it('should call bot detection service with correct parameters', async () => {
      const viewRecords: ViewRecord[] = [{
        id: '1',
        promoterId: 'promoter1',
        campaignId: 'campaign1',
        platform: 'tiktok',
        platformPostId: 'post1',
        viewCount: 100,
        likeCount: 10,
        commentCount: 5,
        shareCount: 2,
        timestamp: new Date()
      }];

      analyzer.addViewRecords(viewRecords);
      await analyzer.analyzeImmediate('promoter1', 'campaign1');

      expect(mockBotDetectionService.analyzeViews).toHaveBeenCalledWith(
        'promoter1',
        'campaign1',
        expect.arrayContaining(viewRecords)
      );
    });
  });

  describe('Cache Management', () => {
    const mockAnalysis: BotAnalysis = {
      promoterId: 'promoter1',
      campaignId: 'campaign1',
      analysisWindow: {
        start: new Date(Date.now() - 10 * 60 * 1000),
        end: new Date()
      },
      metrics: {
        avgViewsPerMinute: 50,
        avgLikesPerMinute: 5,
        avgCommentsPerMinute: 2,
        viewLikeRatio: 10,
        viewCommentRatio: 25,
        spikeDetected: false,
        totalViews: 500,
        totalLikes: 50,
        totalComments: 20
      },
      botScore: 25,
      action: 'monitor',
      reason: 'Normal activity detected',
      confidence: 25
    };

    beforeEach(() => {
      mockBotDetectionService.analyzeViews.mockResolvedValue(mockAnalysis);
    });

    it('should cache analysis results', async () => {
      await analyzer.analyzeImmediate('promoter1', 'campaign1');
      const stats = analyzer.getStatistics();
      expect(stats.cacheSize).toBe(1);
    });

    it('should expire cached results after timeout', async () => {
      // Use very short cache timeout for testing
      const shortCacheAnalyzer = new RealTimeBotAnalyzer(
        mockBotDetectionService,
        { ...mockConfig, cacheTimeout: 0.1 } // 0.1 seconds
      );

      await shortCacheAnalyzer.analyzeImmediate('promoter1', 'campaign1');
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Second call should not use cache
      await shortCacheAnalyzer.analyzeImmediate('promoter1', 'campaign1');
      
      expect(mockBotDetectionService.analyzeViews).toHaveBeenCalledTimes(2);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', () => {
      const stats = analyzer.getStatistics();
      
      expect(stats).toHaveProperty('queueSize');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('lastAnalysisCount');
      
      expect(typeof stats.queueSize).toBe('number');
      expect(typeof stats.cacheSize).toBe('number');
      expect(typeof stats.isRunning).toBe('boolean');
      expect(typeof stats.lastAnalysisCount).toBe('number');
    });

    it('should update queue size when records are added', () => {
      const viewRecords: ViewRecord[] = [{
        id: '1',
        promoterId: 'promoter1',
        campaignId: 'campaign1',
        platform: 'tiktok',
        platformPostId: 'post1',
        viewCount: 100,
        likeCount: 10,
        commentCount: 5,
        shareCount: 2,
        timestamp: new Date()
      }];

      analyzer.addViewRecords(viewRecords);
      const stats = analyzer.getStatistics();
      expect(stats.queueSize).toBe(1);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset analyzer state', async () => {
      const viewRecords: ViewRecord[] = [{
        id: '1',
        promoterId: 'promoter1',
        campaignId: 'campaign1',
        platform: 'tiktok',
        platformPostId: 'post1',
        viewCount: 100,
        likeCount: 10,
        commentCount: 5,
        shareCount: 2,
        timestamp: new Date()
      }];

      // Add records and perform analysis
      analyzer.addViewRecords(viewRecords);
      mockBotDetectionService.analyzeViews.mockResolvedValue({
        promoterId: 'promoter1',
        campaignId: 'campaign1',
        analysisWindow: { start: new Date(), end: new Date() },
        metrics: {
          avgViewsPerMinute: 0,
          avgLikesPerMinute: 0,
          avgCommentsPerMinute: 0,
          viewLikeRatio: 0,
          viewCommentRatio: 0,
          spikeDetected: false,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0
        },
        botScore: 0,
        action: 'none',
        reason: 'Test',
        confidence: 0
      });
      
      await analyzer.analyzeImmediate('promoter1', 'campaign1');

      // Reset
      analyzer.reset();

      // Check that state is cleared
      const stats = analyzer.getStatistics();
      expect(stats.queueSize).toBe(0);
      expect(stats.cacheSize).toBe(0);
      expect(stats.lastAnalysisCount).toBe(0);
    });
  });

  describe('Action Taking (when enabled)', () => {
    let actionAnalyzer: RealTimeBotAnalyzer;

    beforeEach(() => {
      const actionConfig = { ...mockConfig, enableAutoActions: true };
      actionAnalyzer = new RealTimeBotAnalyzer(mockBotDetectionService, actionConfig);
    });

    afterEach(() => {
      actionAnalyzer.stop();
    });

    it('should take action when bot score is high', async () => {
      const highScoreAnalysis: BotAnalysis = {
        promoterId: 'promoter1',
        campaignId: 'campaign1',
        analysisWindow: { start: new Date(), end: new Date() },
        metrics: {
          avgViewsPerMinute: 1000,
          avgLikesPerMinute: 10,
          avgCommentsPerMinute: 1,
          viewLikeRatio: 100,
          viewCommentRatio: 1000,
          spikeDetected: true,
          spikePercentage: 600,
          totalViews: 10000,
          totalLikes: 100,
          totalComments: 10
        },
        botScore: 95,
        action: 'ban',
        reason: 'High bot confidence',
        confidence: 95
      };

      mockBotDetectionService.analyzeViews.mockResolvedValue(highScoreAnalysis);

      const result = await actionAnalyzer.analyzeImmediate('promoter1', 'campaign1');
      
      expect(result.actionTaken).toBe(true);
      expect(result.actionType).toBe('ban');
    });

    it('should not take action when bot score is low', async () => {
      const lowScoreAnalysis: BotAnalysis = {
        promoterId: 'promoter1',
        campaignId: 'campaign1',
        analysisWindow: { start: new Date(), end: new Date() },
        metrics: {
          avgViewsPerMinute: 50,
          avgLikesPerMinute: 10,
          avgCommentsPerMinute: 5,
          viewLikeRatio: 5,
          viewCommentRatio: 10,
          spikeDetected: false,
          totalViews: 500,
          totalLikes: 100,
          totalComments: 50
        },
        botScore: 10,
        action: 'none',
        reason: 'Normal activity',
        confidence: 10
      };

      mockBotDetectionService.analyzeViews.mockResolvedValue(lowScoreAnalysis);

      const result = await actionAnalyzer.analyzeImmediate('promoter1', 'campaign1');
      
      expect(result.actionTaken).toBe(false);
      expect(result.actionType).toBeUndefined();
    });
  });

  describe('Factory Functions', () => {
    it('should create analyzer with factory function', () => {
      const { createRealTimeBotAnalyzer } = require('../src/real-time-bot-analyzer');
      const factoryAnalyzer = createRealTimeBotAnalyzer();
      expect(factoryAnalyzer).toBeInstanceOf(RealTimeBotAnalyzer);
    });

    it('should return global analyzer instance', () => {
      const { getGlobalBotAnalyzer } = require('../src/real-time-bot-analyzer');
      const globalAnalyzer1 = getGlobalBotAnalyzer();
      const globalAnalyzer2 = getGlobalBotAnalyzer();
      expect(globalAnalyzer1).toBe(globalAnalyzer2); // Should be same instance
    });
  });

  describe('Error Handling', () => {
    it('should handle bot detection service errors gracefully', async () => {
      mockBotDetectionService.analyzeViews.mockRejectedValue(new Error('Service error'));

      await expect(analyzer.analyzeImmediate('promoter1', 'campaign1'))
        .rejects.toThrow('Service error');
    });

    it('should continue running after errors in scheduled analysis', async () => {
      analyzer.start();
      
      // Simulate error in bot detection service
      mockBotDetectionService.analyzeViews.mockRejectedValue(new Error('Service error'));
      
      // Add records to trigger analysis
      analyzer.addViewRecords([{
        id: '1',
        promoterId: 'promoter1',
        campaignId: 'campaign1',
        platform: 'tiktok',
        platformPostId: 'post1',
        viewCount: 100,
        likeCount: 10,
        commentCount: 5,
        shareCount: 2,
        timestamp: new Date()
      }]);

      // Wait a bit for scheduled analysis to run
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Analyzer should still be running
      const stats = analyzer.getStatistics();
      expect(stats.isRunning).toBe(true);
    });
  });
});