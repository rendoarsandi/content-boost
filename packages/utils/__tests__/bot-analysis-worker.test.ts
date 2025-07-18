import { BotAnalysisWorker, BotAnalysisWorkerConfig } from '../src/bot-analysis-worker';
import { ViewRecord } from '../src/bot-detection';

// Mock the RealTimeBotAnalyzer
jest.mock('../src/real-time-bot-analyzer');

describe('BotAnalysisWorker', () => {
  let worker: BotAnalysisWorker;
  let mockConfig: Partial<BotAnalysisWorkerConfig>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      analyzer: {
        analysisInterval: 1000, // 1 second for testing
        batchSize: 10,
        cacheTimeout: 60,
        enableAutoActions: false,
        logLevel: 'error' // Reduce noise in tests
      },
      worker: {
        enabled: true,
        dataFetchInterval: 500, // 0.5 seconds for testing
        maxRetries: 2,
        retryDelay: 100, // 0.1 seconds
        batchSize: 50
      },
      logging: {
        enabled: false, // Disable file logging in tests
        logPath: 'logs/test/',
        maxLogSize: 1024,
        rotateDaily: false
      }
    };

    worker = new BotAnalysisWorker(mockConfig);
  });

  afterEach(async () => {
    await worker.stop();
  });

  describe('Constructor and Configuration', () => {
    it('should create worker with default configuration', () => {
      const defaultWorker = new BotAnalysisWorker();
      expect(defaultWorker).toBeInstanceOf(BotAnalysisWorker);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig = {
        worker: { 
          enabled: false,
          dataFetchInterval: 30000,
          maxRetries: 3,
          retryDelay: 5000,
          batchSize: 100
        }
      };
      const customWorker = new BotAnalysisWorker(customConfig);
      expect(customWorker).toBeInstanceOf(BotAnalysisWorker);
    });
  });

  describe('Start and Stop', () => {
    it('should start the worker', async () => {
      await worker.start();
      const stats = worker.getStats();
      expect(stats.isRunning).toBe(true);
    });

    it('should stop the worker', async () => {
      await worker.start();
      await worker.stop();
      const stats = worker.getStats();
      expect(stats.isRunning).toBe(false);
    });

    it('should not start if disabled in configuration', async () => {
      const disabledWorker = new BotAnalysisWorker({
        ...mockConfig,
        worker: { ...mockConfig.worker!, enabled: false }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await disabledWorker.start();
      
      const stats = disabledWorker.getStats();
      expect(stats.isRunning).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('disabled in configuration')
      );
      
      consoleSpy.mockRestore();
    });

    it('should not start if already running', async () => {
      await worker.start();
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await worker.start();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already running')
      );
      
      consoleSpy.mockRestore();
    });

    it('should not stop if not running', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await worker.stop();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not running')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Statistics', () => {
    it('should return initial statistics', () => {
      const stats = worker.getStats();
      
      expect(stats).toHaveProperty('isRunning', false);
      expect(stats).toHaveProperty('totalRecordsProcessed', 0);
      expect(stats).toHaveProperty('totalAnalysesPerformed', 0);
      expect(stats).toHaveProperty('totalActionsTriggered', 0);
      expect(stats).toHaveProperty('lastFetchTime', null);
      expect(stats).toHaveProperty('lastAnalysisTime', null);
      expect(stats).toHaveProperty('errorCount', 0);
      expect(stats).toHaveProperty('uptime', 0);
    });

    it('should update statistics when worker is running', async () => {
      await worker.start();
      
      // Wait a bit for worker to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = worker.getStats();
      expect(stats.isRunning).toBe(true);
      expect(stats.uptime).toBeGreaterThan(0);
    });

    it('should reset statistics', () => {
      // Add some records to change stats
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

      worker.addViewRecords(viewRecords);
      
      let stats = worker.getStats();
      expect(stats.totalRecordsProcessed).toBe(1);

      worker.resetStats();
      
      stats = worker.getStats();
      expect(stats.totalRecordsProcessed).toBe(0);
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
        promoterId: 'promoter2',
        campaignId: 'campaign2',
        platform: 'instagram',
        platformPostId: 'post2',
        viewCount: 200,
        likeCount: 20,
        commentCount: 10,
        shareCount: 5,
        timestamp: new Date()
      }
    ];

    it('should add view records and update statistics', () => {
      worker.addViewRecords(sampleViewRecords);
      
      const stats = worker.getStats();
      expect(stats.totalRecordsProcessed).toBe(2);
    });

    it('should handle empty view records array', () => {
      worker.addViewRecords([]);
      
      const stats = worker.getStats();
      expect(stats.totalRecordsProcessed).toBe(0);
    });

    it('should handle errors when adding view records', () => {
      // Mock the analyzer to throw an error
      const mockAnalyzer = require('../src/real-time-bot-analyzer').RealTimeBotAnalyzer;
      mockAnalyzer.prototype.addViewRecords = jest.fn().mockImplementation(() => {
        throw new Error('Analyzer error');
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      worker.addViewRecords(sampleViewRecords);
      
      const stats = worker.getStats();
      expect(stats.errorCount).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to add view records')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Manual Analysis Trigger', () => {
    it('should trigger manual analysis successfully', async () => {
      // Mock the analyzer's analyzeImmediate method
      const mockAnalyzer = require('../src/real-time-bot-analyzer').RealTimeBotAnalyzer;
      mockAnalyzer.prototype.analyzeImmediate = jest.fn().mockResolvedValue({
        analysis: {
          promoterId: 'promoter1',
          campaignId: 'campaign1',
          botScore: 25,
          action: 'monitor'
        },
        actionTaken: false,
        timestamp: new Date(),
        processingTime: 100
      });

      await worker.triggerAnalysis('promoter1', 'campaign1');
      
      const stats = worker.getStats();
      expect(stats.totalAnalysesPerformed).toBe(1);
      expect(stats.totalActionsTriggered).toBe(0);
    });

    it('should update action statistics when action is taken', async () => {
      // Mock the analyzer's analyzeImmediate method with action taken
      const mockAnalyzer = require('../src/real-time-bot-analyzer').RealTimeBotAnalyzer;
      mockAnalyzer.prototype.analyzeImmediate = jest.fn().mockResolvedValue({
        analysis: {
          promoterId: 'promoter1',
          campaignId: 'campaign1',
          botScore: 95,
          action: 'ban'
        },
        actionTaken: true,
        actionType: 'ban',
        timestamp: new Date(),
        processingTime: 100
      });

      await worker.triggerAnalysis('promoter1', 'campaign1');
      
      const stats = worker.getStats();
      expect(stats.totalAnalysesPerformed).toBe(1);
      expect(stats.totalActionsTriggered).toBe(1);
    });

    it('should handle errors in manual analysis', async () => {
      // Mock the analyzer to throw an error
      const mockAnalyzer = require('../src/real-time-bot-analyzer').RealTimeBotAnalyzer;
      mockAnalyzer.prototype.analyzeImmediate = jest.fn().mockRejectedValue(
        new Error('Analysis error')
      );

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await expect(worker.triggerAnalysis('promoter1', 'campaign1'))
        .rejects.toThrow('Analysis error');
      
      const stats = worker.getStats();
      expect(stats.errorCount).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to trigger manual analysis')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Data Fetching', () => {
    it('should handle data fetching loop', async () => {
      await worker.start();
      
      // Wait for a few fetch cycles
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const stats = worker.getStats();
      expect(stats.lastFetchTime).not.toBeNull();
    });

    it('should handle errors in data fetching', async () => {
      // This test would require mocking the fetchNewViewRecords method
      // For now, we'll just ensure the worker continues running after errors
      
      await worker.start();
      
      // Wait for fetch cycles
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const stats = worker.getStats();
      expect(stats.isRunning).toBe(true);
    });
  });

  describe('Factory Functions', () => {
    it('should create worker with factory function', () => {
      const { createBotAnalysisWorker } = require('../src/bot-analysis-worker');
      const factoryWorker = createBotAnalysisWorker();
      expect(factoryWorker).toBeInstanceOf(BotAnalysisWorker);
    });

    it('should return global worker instance', () => {
      const { getGlobalBotAnalysisWorker } = require('../src/bot-analysis-worker');
      const globalWorker1 = getGlobalBotAnalysisWorker();
      const globalWorker2 = getGlobalBotAnalysisWorker();
      expect(globalWorker1).toBe(globalWorker2); // Should be same instance
    });
  });

  describe('Logging', () => {
    it('should log messages to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await worker.start();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting bot analysis background worker')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle file logging when enabled', () => {
      const fileLoggingWorker = new BotAnalysisWorker({
        ...mockConfig,
        logging: {
          enabled: true,
          logPath: 'logs/test/',
          maxLogSize: 1024,
          rotateDaily: true
        }
      });

      // This would test file logging functionality
      // For now, just ensure worker can be created with file logging enabled
      expect(fileLoggingWorker).toBeInstanceOf(BotAnalysisWorker);
    });
  });

  describe('Error Recovery', () => {
    it('should continue running after errors', async () => {
      await worker.start();
      
      // Simulate some errors by adding invalid records
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Wait for worker to run and potentially encounter errors
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const stats = worker.getStats();
      expect(stats.isRunning).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Validation', () => {
    it('should handle invalid configuration gracefully', () => {
      const invalidConfig = {
        worker: {
          enabled: true,
          dataFetchInterval: -1, // Invalid negative interval
          maxRetries: -1, // Invalid negative retries
          retryDelay: -1, // Invalid negative delay
          batchSize: 0 // Invalid zero batch size
        }
      };

      // Worker should still be created, using defaults for invalid values
      const invalidWorker = new BotAnalysisWorker(invalidConfig);
      expect(invalidWorker).toBeInstanceOf(BotAnalysisWorker);
    });
  });
});