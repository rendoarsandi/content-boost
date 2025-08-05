import {
  RealTimeBotAnalyzer,
  RealTimeBotAnalyzerConfig,
} from './real-time-bot-analyzer';
import { ViewRecord } from './bot-detection';

export interface BotAnalysisWorkerConfig {
  analyzer: RealTimeBotAnalyzerConfig;
  worker: {
    enabled: boolean;
    dataFetchInterval: number; // milliseconds between data fetches
    maxRetries: number;
    retryDelay: number; // milliseconds
    batchSize: number;
  };
  logging: {
    enabled: boolean;
    logPath: string;
    maxLogSize: number; // bytes
    rotateDaily: boolean;
  };
}

export interface WorkerStats {
  isRunning: boolean;
  totalRecordsProcessed: number;
  totalAnalysesPerformed: number;
  totalActionsTriggered: number;
  lastFetchTime: Date | null;
  lastAnalysisTime: Date | null;
  errorCount: number;
  uptime: number; // milliseconds
}

/**
 * Background worker for continuous bot analysis
 * Requirements: 4.4, 4.5 - Background worker with data persistence
 */
export class BotAnalysisWorker {
  private analyzer: RealTimeBotAnalyzer;
  private config: BotAnalysisWorkerConfig;
  private isRunning: boolean = false;
  private stats: WorkerStats;
  private startTime: Date | null = null;
  private dataFetchTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<BotAnalysisWorkerConfig>) {
    this.config = {
      analyzer: {
        analysisInterval: 60 * 1000, // 1 minute
        batchSize: 100,
        cacheTimeout: 5 * 60, // 5 minutes
        enableAutoActions: true,
        logLevel: 'info',
      },
      worker: {
        enabled: true,
        dataFetchInterval: 30 * 1000, // 30 seconds
        maxRetries: 3,
        retryDelay: 5000, // 5 seconds
        batchSize: 500,
      },
      logging: {
        enabled: true,
        logPath: 'logs/bot-detection/',
        maxLogSize: 10 * 1024 * 1024, // 10MB
        rotateDaily: true,
      },
      ...config,
    };

    this.analyzer = new RealTimeBotAnalyzer(undefined, this.config.analyzer);
    this.stats = this.initializeStats();
  }

  /**
   * Start the background worker
   * Requirement 4.4: Background worker untuk metrics collection
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('warn', 'Bot analysis worker is already running');
      return;
    }

    if (!this.config.worker.enabled) {
      this.log('info', 'Bot analysis worker is disabled in configuration');
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.stats = this.initializeStats();

    this.log('info', 'Starting bot analysis background worker');

    // Start the real-time analyzer
    this.analyzer.start();

    // Start data fetching loop
    this.startDataFetchLoop();

    this.log('info', 'Bot analysis worker started successfully');
  }

  /**
   * Stop the background worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.log('warn', 'Bot analysis worker is not running');
      return;
    }

    this.log('info', 'Stopping bot analysis background worker');

    this.isRunning = false;

    // Stop data fetch timer
    if (this.dataFetchTimer) {
      clearTimeout(this.dataFetchTimer);
      this.dataFetchTimer = null;
    }

    // Stop the analyzer
    this.analyzer.stop();

    this.log('info', 'Bot analysis worker stopped successfully');
  }

  /**
   * Get worker statistics
   */
  getStats(): WorkerStats {
    return {
      ...this.stats,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
    };
  }

  /**
   * Manually trigger analysis for specific promoter/campaign
   */
  async triggerAnalysis(promoterId: string, campaignId: string): Promise<void> {
    try {
      this.log(
        'info',
        `Manually triggering analysis for ${promoterId}:${campaignId}`
      );

      const result = await this.analyzer.analyzeImmediate(
        promoterId,
        campaignId
      );

      this.stats.totalAnalysesPerformed++;
      if (result.actionTaken) {
        this.stats.totalActionsTriggered++;
      }

      this.log(
        'info',
        `Manual analysis completed: ${result.analysis.action} (score: ${result.analysis.botScore})`
      );
    } catch (error) {
      this.stats.errorCount++;
      this.log('error', `Failed to trigger manual analysis: ${error}`);
      throw error;
    }
  }

  /**
   * Add view records for analysis
   */
  addViewRecords(records: ViewRecord[]): void {
    try {
      this.analyzer.addViewRecords(records);
      this.stats.totalRecordsProcessed += records.length;
      this.log('debug', `Added ${records.length} view records for analysis`);
    } catch (error) {
      this.stats.errorCount++;
      this.log('error', `Failed to add view records: ${error}`);
    }
  }

  /**
   * Reset worker statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
    this.log('info', 'Worker statistics reset');
  }

  /**
   * Initialize worker statistics
   */
  private initializeStats(): WorkerStats {
    return {
      isRunning: false,
      totalRecordsProcessed: 0,
      totalAnalysesPerformed: 0,
      totalActionsTriggered: 0,
      lastFetchTime: null,
      lastAnalysisTime: null,
      errorCount: 0,
      uptime: 0,
    };
  }

  /**
   * Start the data fetching loop
   */
  private startDataFetchLoop(): void {
    const fetchData = async () => {
      if (!this.isRunning) return;

      try {
        await this.fetchAndProcessData();
        this.stats.lastFetchTime = new Date();
      } catch (error) {
        this.stats.errorCount++;
        this.log('error', `Error in data fetch loop: ${error}`);
      }

      // Schedule next fetch
      if (this.isRunning) {
        this.dataFetchTimer = setTimeout(
          fetchData,
          this.config.worker.dataFetchInterval
        );
      }
    };

    // Start immediately
    fetchData();
  }

  /**
   * Fetch and process new view data
   * Requirement 4.5: Menyimpan ke Redis untuk caching dan PostgreSQL untuk persistence
   */
  private async fetchAndProcessData(): Promise<void> {
    try {
      // This would integrate with actual data sources
      // For now, we'll simulate fetching data
      const newViewRecords = await this.fetchNewViewRecords();

      if (newViewRecords.length > 0) {
        this.addViewRecords(newViewRecords);
        this.log(
          'debug',
          `Fetched and processed ${newViewRecords.length} new view records`
        );
      }
    } catch (error) {
      this.log('error', `Failed to fetch and process data: ${error}`);
      throw error;
    }
  }

  /**
   * Fetch new view records from data sources
   * This would integrate with actual database/API connections
   */
  private async fetchNewViewRecords(): Promise<ViewRecord[]> {
    // TODO: Implement actual data fetching from:
    // - PostgreSQL view_records table
    // - Redis cache
    // - Social media APIs (TikTok, Instagram)

    // For now, return empty array
    // In real implementation, this would:
    // 1. Query database for recent view records
    // 2. Check Redis for cached data
    // 3. Fetch from social media APIs if needed
    // 4. Return combined results

    return [];
  }

  /**
   * Retry mechanism for failed operations
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.config.worker.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.log(
          'warn',
          `${operationName} failed (attempt ${attempt}/${maxRetries}): ${error}`
        );

        if (attempt < maxRetries) {
          await this.sleep(this.config.worker.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logging utility with file output
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string
  ): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] BotAnalysisWorker: ${message}`;

    // Console output
    console.log(logMessage);

    // File output (if enabled)
    if (this.config.logging.enabled) {
      this.writeToLogFile(logMessage);
    }
  }

  /**
   * Write log message to file
   * Requirement: Store logs in logs/bot-detection/ directory
   */
  private writeToLogFile(message: string): void {
    try {
      // TODO: Implement actual file writing
      // This would:
      // 1. Ensure logs/bot-detection/ directory exists
      // 2. Write to daily log file if rotateDaily is true
      // 3. Handle log rotation based on maxLogSize
      // 4. Ensure proper file permissions
      // For now, just log to console that we would write to file
      // console.log(`[FILE LOG] ${message}`);
    } catch (error) {
      console.error(`Failed to write to log file: ${error}`);
    }
  }
}

/**
 * Factory function to create a bot analysis worker
 */
export function createBotAnalysisWorker(
  config?: Partial<BotAnalysisWorkerConfig>
): BotAnalysisWorker {
  return new BotAnalysisWorker(config);
}

/**
 * Global worker instance
 */
let globalWorker: BotAnalysisWorker | null = null;

/**
 * Get or create global worker instance
 */
export function getGlobalBotAnalysisWorker(): BotAnalysisWorker {
  if (!globalWorker) {
    globalWorker = createBotAnalysisWorker({
      worker: {
        enabled: true,
        dataFetchInterval: 30 * 1000, // 30 seconds
        maxRetries: 3,
        retryDelay: 5000,
        batchSize: 500,
      },
      logging: {
        enabled: true,
        logPath: 'logs/bot-detection/',
        maxLogSize: 10 * 1024 * 1024,
        rotateDaily: true,
      },
    });
  }
  return globalWorker;
}
