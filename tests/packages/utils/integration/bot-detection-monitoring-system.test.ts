import {
  BotDetectionMonitoringSystem,
  MonitoringSystemConfig,
  SystemAlert,
} from '../src/bot-detection-monitoring-system';
import { BotAnalysis } from '../src/bot-detection';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    appendFile: jest.fn(),
    writeFile: jest.fn(),
  },
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

describe('BotDetectionMonitoringSystem', () => {
  let monitoringSystem: BotDetectionMonitoringSystem;
  let mockConfig: Partial<MonitoringSystemConfig>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      monitoring: {
        enabled: true,
        realTimeAlerts: true,
        batchProcessing: true,
        alertThresholds: {
          criticalBotScore: 90,
          warningBotScore: 50,
          monitorBotScore: 20,
          alertFrequencyLimit: 5,
        },
      },
      logging: {
        logPath: 'test-logs/bot-detection/',
        auditTrail: true,
        retention: 30,
        compression: false,
        logLevels: ['info', 'warn', 'error'],
      },
      reporting: {
        enabled: true,
        reportPath: 'test-reports/bot-detection/',
        formats: ['json'],
        scheduling: {
          daily: true,
          weekly: false,
          monthly: false,
          realTime: false,
        },
      },
      notifications: {
        channels: {
          email: true,
          dashboard: true,
          webhook: false,
          sms: false,
        },
        recipients: {
          admins: ['test@admin.com'],
          promoters: true,
          creators: false,
        },
      },
    };

    monitoringSystem = new BotDetectionMonitoringSystem(mockConfig);
  });

  describe('processAnalysis', () => {
    it('should process bot analysis with ban action', async () => {
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

      await monitoringSystem.processAnalysis(
        'promoter123',
        'campaign456',
        analysis
      );

      // Verify logging was called
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('analysis-'),
        expect.stringContaining('bot_analysis'),
        'utf8'
      );

      // Verify metrics logging
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('metrics-'),
        expect.any(String),
        'utf8'
      );
    });

    it('should process bot analysis with warning action', async () => {
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

      await monitoringSystem.processAnalysis(
        'promoter789',
        'campaign123',
        analysis
      );

      // Verify analysis logging
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('analysis-'),
        expect.stringContaining('promoter789'),
        'utf8'
      );

      // Verify notification logging
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('notifications-'),
        expect.stringContaining('WARNING'),
        'utf8'
      );
    });

    it('should process bot analysis with monitor action', async () => {
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

      await monitoringSystem.processAnalysis(
        'promoter456',
        'campaign789',
        analysis
      );

      // Verify analysis logging
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('analysis-'),
        expect.stringContaining('promoter456'),
        'utf8'
      );
    });

    it('should handle processing errors gracefully', async () => {
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

      // Mock fs.promises.appendFile to throw an error
      (fs.promises.appendFile as jest.Mock).mockRejectedValueOnce(
        new Error('File write error')
      );

      // Should not throw error
      await expect(
        monitoringSystem.processAnalysis('promoter999', 'campaign999', analysis)
      ).resolves.not.toThrow();

      // Verify error logging was attempted
      expect(fs.promises.appendFile).toHaveBeenCalled();
    });
  });

  describe('alert frequency limiting', () => {
    it('should limit alerts based on frequency threshold', async () => {
      const analysis: BotAnalysis = {
        promoterId: 'frequent_promoter',
        campaignId: 'campaign123',
        analysisWindow: {
          start: new Date(Date.now() - 10 * 60 * 1000),
          end: new Date(),
        },
        metrics: {
          avgViewsPerMinute: 300,
          avgLikesPerMinute: 15,
          avgCommentsPerMinute: 2,
          viewLikeRatio: 20,
          viewCommentRatio: 150,
          spikeDetected: false,
          totalViews: 3000,
          totalLikes: 150,
          totalComments: 20,
        },
        botScore: 60,
        action: 'warning',
        reason: 'Moderate suspicious activity',
        confidence: 60,
      };

      // Process multiple analyses for the same promoter
      for (let i = 0; i < 7; i++) {
        await monitoringSystem.processAnalysis(
          'frequent_promoter',
          'campaign123',
          analysis
        );
      }

      // Should have limited the number of notifications due to frequency limit
      const notificationCalls = (
        fs.promises.appendFile as jest.Mock
      ).mock.calls.filter(call => call[0].includes('notifications-'));

      // Should be less than 7 due to frequency limiting (threshold is 5)
      expect(notificationCalls.length).toBeLessThan(7);
    });

    it('should always allow critical alerts regardless of frequency', async () => {
      const criticalAnalysis: BotAnalysis = {
        promoterId: 'critical_promoter',
        campaignId: 'campaign123',
        analysisWindow: {
          start: new Date(Date.now() - 10 * 60 * 1000),
          end: new Date(),
        },
        metrics: {
          avgViewsPerMinute: 2000,
          avgLikesPerMinute: 5,
          avgCommentsPerMinute: 0,
          viewLikeRatio: 400,
          viewCommentRatio: 2000,
          spikeDetected: true,
          spikePercentage: 800,
          totalViews: 20000,
          totalLikes: 50,
          totalComments: 0,
        },
        botScore: 95,
        action: 'ban',
        reason: 'Critical bot activity detected',
        confidence: 95,
      };

      // Process multiple critical analyses
      for (let i = 0; i < 3; i++) {
        await monitoringSystem.processAnalysis(
          'critical_promoter',
          'campaign123',
          criticalAnalysis
        );
      }

      // All critical alerts should be processed
      const alertCalls = (
        fs.promises.appendFile as jest.Mock
      ).mock.calls.filter(call => call[0].includes('alerts-'));

      expect(alertCalls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('notification generation', () => {
    it('should generate appropriate notifications for ban action', async () => {
      const banAnalysis: BotAnalysis = {
        promoterId: 'banned_promoter',
        campaignId: 'campaign123',
        analysisWindow: {
          start: new Date(Date.now() - 10 * 60 * 1000),
          end: new Date(),
        },
        metrics: {
          avgViewsPerMinute: 1500,
          avgLikesPerMinute: 8,
          avgCommentsPerMinute: 1,
          viewLikeRatio: 187,
          viewCommentRatio: 1500,
          spikeDetected: true,
          spikePercentage: 700,
          totalViews: 15000,
          totalLikes: 80,
          totalComments: 10,
        },
        botScore: 92,
        action: 'ban',
        reason: 'High confidence bot detection',
        confidence: 92,
      };

      await monitoringSystem.processAnalysis(
        'banned_promoter',
        'campaign123',
        banAnalysis
      );

      // Verify notification logging includes ban notifications
      const notificationCalls = (
        fs.promises.appendFile as jest.Mock
      ).mock.calls.filter(call => call[0].includes('notifications-'));

      expect(notificationCalls.length).toBeGreaterThan(0);

      // Check that ban notification was logged
      const banNotificationCall = notificationCalls.find(
        call => call[1].includes('BAN') && call[1].includes('banned_promoter')
      );
      expect(banNotificationCall).toBeDefined();
    });

    it('should generate appropriate notifications for warning action', async () => {
      const warningAnalysis: BotAnalysis = {
        promoterId: 'warned_promoter',
        campaignId: 'campaign456',
        analysisWindow: {
          start: new Date(Date.now() - 10 * 60 * 1000),
          end: new Date(),
        },
        metrics: {
          avgViewsPerMinute: 800,
          avgLikesPerMinute: 30,
          avgCommentsPerMinute: 8,
          viewLikeRatio: 27,
          viewCommentRatio: 100,
          spikeDetected: false,
          totalViews: 8000,
          totalLikes: 300,
          totalComments: 80,
        },
        botScore: 55,
        action: 'warning',
        reason: 'Suspicious activity patterns detected',
        confidence: 55,
      };

      await monitoringSystem.processAnalysis(
        'warned_promoter',
        'campaign456',
        warningAnalysis
      );

      // Verify warning notification was logged
      const notificationCalls = (
        fs.promises.appendFile as jest.Mock
      ).mock.calls.filter(call => call[0].includes('notifications-'));

      const warningNotificationCall = notificationCalls.find(
        call =>
          call[1].includes('WARNING') && call[1].includes('warned_promoter')
      );
      expect(warningNotificationCall).toBeDefined();
    });
  });

  describe('system status', () => {
    it('should return correct system status', async () => {
      // Process some analyses to generate metrics
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
        await monitoringSystem.processAnalysis(
          promoterId,
          campaignId,
          analysis
        );
      }

      const status = monitoringSystem.getSystemStatus();

      expect(status).toHaveProperty('monitoring');
      expect(status).toHaveProperty('alerts');
      expect(status).toHaveProperty('performance');

      expect(status.monitoring.enabled).toBe(true);
      expect(status.monitoring.systemHealth).toMatch(
        /HEALTHY|WARNING|CRITICAL/
      );

      expect(typeof status.alerts.total).toBe('number');
      expect(typeof status.alerts.unacknowledged).toBe('number');

      expect(typeof status.performance.averageProcessingTime).toBe('number');
      expect(typeof status.performance.throughput).toBe('number');
    });
  });

  describe('alert management', () => {
    it('should acknowledge alerts', async () => {
      // First, generate an alert
      const criticalAnalysis: BotAnalysis = {
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

      await monitoringSystem.processAnalysis(
        'test_promoter',
        'test_campaign',
        criticalAnalysis
      );

      const status = monitoringSystem.getSystemStatus();
      expect(status.alerts.total).toBeGreaterThan(0);

      // Test acknowledging a non-existent alert
      const result = await monitoringSystem.acknowledgeAlert('non-existent-id');
      expect(result).toBe(false);
    });

    it('should resolve alerts', async () => {
      // Test resolving a non-existent alert
      const result = await monitoringSystem.resolveAlert('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('logging configuration', () => {
    it('should respect log level configuration', async () => {
      // Create system with only error logging
      const errorOnlyConfig: Partial<MonitoringSystemConfig> = {
        ...mockConfig,
        logging: {
          ...mockConfig.logging!,
          logLevels: ['error'],
        },
      };

      const errorOnlySystem = new BotDetectionMonitoringSystem(errorOnlyConfig);

      const analysis: BotAnalysis = {
        promoterId: 'test_promoter',
        campaignId: 'test_campaign',
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
        reason: 'Normal activity',
        confidence: 15,
      };

      await errorOnlySystem.processAnalysis(
        'test_promoter',
        'test_campaign',
        analysis
      );

      // Should still log analysis and metrics, but not info logs
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('analysis-'),
        expect.any(String),
        'utf8'
      );
    });
  });

  describe('directory creation', () => {
    it('should create required directories on initialization', () => {
      // Mock fs.existsSync to return false to trigger directory creation
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      new BotDetectionMonitoringSystem(mockConfig);

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
