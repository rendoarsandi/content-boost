import {
  BotDetectionAlerting,
  AlertConfig,
} from '../src/bot-detection-alerting';
import { BotAnalysis } from '../src/bot-detection';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    appendFile: jest.fn(),
    writeFile: jest.fn(),
  },
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

describe('BotDetectionAlerting', () => {
  let alerting: BotDetectionAlerting;
  let mockConfig: Partial<AlertConfig>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      enabled: true,
      logPath: 'test-logs/bot-detection/',
      reportPath: 'test-reports/bot-detection/',
      thresholds: {
        critical: 90,
        warning: 50,
        monitor: 20,
      },
      notifications: {
        email: true,
        dashboard: true,
        webhook: false,
      },
    };

    alerting = new BotDetectionAlerting(mockConfig);
  });

  describe('processAnalysis', () => {
    it('should process critical bot analysis and generate ban notification', async () => {
      const analysis: BotAnalysis = {
        promoterId: 'promoter123',
        campaignId: 'campaign456',
        analysisWindow: {
          start: new Date(Date.now() - 10 * 60 * 1000),
          end: new Date(),
        },
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
          totalComments: 10,
        },
        botScore: 95,
        action: 'ban',
        reason: 'High bot confidence: abnormal ratios and spike detected',
        confidence: 95,
      };

      await alerting.processAnalysis('promoter123', 'campaign456', analysis);

      // Verify analysis logging
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('analysis-'),
        expect.stringContaining('bot_analysis'),
        'utf8'
      );

      // Verify notification logging
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('notifications-'),
        expect.stringContaining('BAN'),
        'utf8'
      );
    });

    it('should process warning bot analysis and generate warning notification', async () => {
      const analysis: BotAnalysis = {
        promoterId: 'promoter789',
        campaignId: 'campaign123',
        analysisWindow: {
          start: new Date(Date.now() - 10 * 60 * 1000),
          end: new Date(),
        },
        metrics: {
          avgViewsPerMinute: 500,
          avgLikesPerMinute: 25,
          avgCommentsPerMinute: 5,
          viewLikeRatio: 20,
          viewCommentRatio: 100,
          spikeDetected: false,
          totalViews: 5000,
          totalLikes: 250,
          totalComments: 50,
        },
        botScore: 65,
        action: 'warning',
        reason: 'Moderate bot confidence: suspicious ratios detected',
        confidence: 65,
      };

      await alerting.processAnalysis('promoter789', 'campaign123', analysis);

      // Verify analysis logging
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('analysis-'),
        expect.stringContaining('promoter789'),
        'utf8'
      );

      // Verify warning notification
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('notifications-'),
        expect.stringContaining('WARNING'),
        'utf8'
      );
    });

    it('should process monitor bot analysis and generate monitor notification', async () => {
      const analysis: BotAnalysis = {
        promoterId: 'promoter456',
        campaignId: 'campaign789',
        analysisWindow: {
          start: new Date(Date.now() - 10 * 60 * 1000),
          end: new Date(),
        },
        metrics: {
          avgViewsPerMinute: 200,
          avgLikesPerMinute: 15,
          avgCommentsPerMinute: 3,
          viewLikeRatio: 13,
          viewCommentRatio: 67,
          spikeDetected: false,
          totalViews: 2000,
          totalLikes: 150,
          totalComments: 30,
        },
        botScore: 35,
        action: 'monitor',
        reason: 'Low bot confidence: minor suspicious patterns',
        confidence: 35,
      };

      await alerting.processAnalysis('promoter456', 'campaign789', analysis);

      // Verify analysis logging
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('analysis-'),
        expect.stringContaining('promoter456'),
        'utf8'
      );

      // Verify monitor notification
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('notifications-'),
        expect.stringContaining('MONITOR'),
        'utf8'
      );
    });

    it('should not generate notification for clean activity', async () => {
      const analysis: BotAnalysis = {
        promoterId: 'promoter999',
        campaignId: 'campaign999',
        analysisWindow: {
          start: new Date(Date.now() - 10 * 60 * 1000),
          end: new Date(),
        },
        metrics: {
          avgViewsPerMinute: 100,
          avgLikesPerMinute: 10,
          avgCommentsPerMinute: 1,
          viewLikeRatio: 10,
          viewCommentRatio: 100,
          spikeDetected: false,
          totalViews: 1000,
          totalLikes: 100,
          totalComments: 10,
        },
        botScore: 15,
        action: 'none',
        reason: 'Normal activity detected',
        confidence: 15,
      };

      await alerting.processAnalysis('promoter999', 'campaign999', analysis);

      // Verify analysis logging
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('analysis-'),
        expect.stringContaining('promoter999'),
        'utf8'
      );

      // Should not generate notification for clean activity
      const notificationCalls = (
        fs.promises.appendFile as jest.Mock
      ).mock.calls.filter(call => call[0].includes('notifications-'));

      expect(notificationCalls.length).toBe(0);
    });

    it('should handle processing errors gracefully', async () => {
      const analysis: BotAnalysis = {
        promoterId: 'error_promoter',
        campaignId: 'error_campaign',
        analysisWindow: {
          start: new Date(Date.now() - 10 * 60 * 1000),
          end: new Date(),
        },
        metrics: {
          avgViewsPerMinute: 100,
          avgLikesPerMinute: 10,
          avgCommentsPerMinute: 1,
          viewLikeRatio: 10,
          viewCommentRatio: 100,
          spikeDetected: false,
          totalViews: 1000,
          totalLikes: 100,
          totalComments: 10,
        },
        botScore: 15,
        action: 'none',
        reason: 'Normal activity detected',
        confidence: 15,
      };

      // Mock fs.promises.appendFile to throw an error
      (fs.promises.appendFile as jest.Mock).mockRejectedValueOnce(
        new Error('File write error')
      );

      // Should not throw error
      await expect(
        alerting.processAnalysis('error_promoter', 'error_campaign', analysis)
      ).resolves.not.toThrow();

      // Verify error logging was attempted
      expect(fs.promises.appendFile).toHaveBeenCalled();
    });
  });

  describe('generateDailySummary', () => {
    it('should generate daily summary report', async () => {
      // Process some analyses first
      const analyses = [
        {
          promoterId: 'promoter1',
          campaignId: 'campaign1',
          analysis: {
            promoterId: 'promoter1',
            campaignId: 'campaign1',
            analysisWindow: {
              start: new Date(Date.now() - 10 * 60 * 1000),
              end: new Date(),
            },
            metrics: {
              avgViewsPerMinute: 100,
              avgLikesPerMinute: 10,
              avgCommentsPerMinute: 1,
              viewLikeRatio: 10,
              viewCommentRatio: 100,
              spikeDetected: false,
              totalViews: 1000,
              totalLikes: 100,
              totalComments: 10,
            },
            botScore: 25,
            action: 'monitor' as const,
            reason: 'Low risk',
            confidence: 25,
          },
        },
        {
          promoterId: 'promoter2',
          campaignId: 'campaign2',
          analysis: {
            promoterId: 'promoter2',
            campaignId: 'campaign2',
            analysisWindow: {
              start: new Date(Date.now() - 10 * 60 * 1000),
              end: new Date(),
            },
            metrics: {
              avgViewsPerMinute: 500,
              avgLikesPerMinute: 20,
              avgCommentsPerMinute: 3,
              viewLikeRatio: 25,
              viewCommentRatio: 167,
              spikeDetected: false,
              totalViews: 5000,
              totalLikes: 200,
              totalComments: 30,
            },
            botScore: 65,
            action: 'warning' as const,
            reason: 'Medium risk',
            confidence: 65,
          },
        },
      ];

      for (const { promoterId, campaignId, analysis } of analyses) {
        await alerting.processAnalysis(promoterId, campaignId, analysis);
      }

      const summary = await alerting.generateDailySummary();

      expect(summary.totalAnalyses).toBe(2);
      expect(summary.botDetections.warned).toBe(1);
      expect(summary.botDetections.monitored).toBe(1);
      expect(summary.averageBotScore).toBe(45); // (25 + 65) / 2

      // Verify report files were written
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.any(String),
        'utf8'
      );
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.html'),
        expect.any(String),
        'utf8'
      );
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      // Process some analyses to generate notifications
      const criticalAnalysis = {
        promoterId: 'critical_promoter',
        campaignId: 'critical_campaign',
        analysisWindow: {
          start: new Date(Date.now() - 10 * 60 * 1000),
          end: new Date(),
        },
        metrics: {
          avgViewsPerMinute: 2000,
          avgLikesPerMinute: 10,
          avgCommentsPerMinute: 1,
          viewLikeRatio: 200,
          viewCommentRatio: 2000,
          spikeDetected: true,
          spikePercentage: 600,
          totalViews: 20000,
          totalLikes: 100,
          totalComments: 10,
        },
        botScore: 95,
        action: 'ban' as const,
        reason: 'Critical bot activity',
        confidence: 95,
      };

      await alerting.processAnalysis(
        'critical_promoter',
        'critical_campaign',
        criticalAnalysis
      );

      const stats = alerting.getStats();

      expect(stats.totalNotifications).toBeGreaterThan(0);
      expect(stats.notificationsByType).toHaveProperty('BAN');
      expect(stats.notificationsBySeverity).toHaveProperty('CRITICAL');
      expect(typeof stats.recentActivity).toBe('number');
    });
  });

  describe('configuration', () => {
    it('should respect disabled configuration', async () => {
      const disabledAlerting = new BotDetectionAlerting({ enabled: false });

      const analysis: BotAnalysis = {
        promoterId: 'test_promoter',
        campaignId: 'test_campaign',
        analysisWindow: {
          start: new Date(Date.now() - 10 * 60 * 1000),
          end: new Date(),
        },
        metrics: {
          avgViewsPerMinute: 2000,
          avgLikesPerMinute: 10,
          avgCommentsPerMinute: 1,
          viewLikeRatio: 200,
          viewCommentRatio: 2000,
          spikeDetected: true,
          spikePercentage: 600,
          totalViews: 20000,
          totalLikes: 100,
          totalComments: 10,
        },
        botScore: 95,
        action: 'ban',
        reason: 'Critical bot activity',
        confidence: 95,
      };

      await disabledAlerting.processAnalysis(
        'test_promoter',
        'test_campaign',
        analysis
      );

      // Should still log analysis but not generate notifications
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('analysis-'),
        expect.any(String),
        'utf8'
      );

      // Should not generate notifications when disabled
      const notificationCalls = (
        fs.promises.appendFile as jest.Mock
      ).mock.calls.filter(call => call[0].includes('notifications-'));

      expect(notificationCalls.length).toBe(0);
    });

    it('should create required directories on initialization', () => {
      // Mock fs.existsSync to return false to trigger directory creation
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      new BotDetectionAlerting(mockConfig);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('test-logs/bot-detection'),
        { recursive: true }
      );
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('test-reports/bot-detection'),
        { recursive: true }
      );
    });
  });
});
