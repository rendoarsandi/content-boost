import { BotDetectionService, BotAnalysis, ViewRecord } from './bot-detection';
import { ErrorCodes } from './errors';

export interface RealTimeBotAnalyzerConfig {
  analysisInterval: number; // milliseconds between analyses
  batchSize: number; // number of records to process at once
  cacheTimeout: number; // Redis cache timeout in seconds
  enableAutoActions: boolean; // whether to automatically take actions
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface AnalysisResult {
  analysis: BotAnalysis;
  actionTaken: boolean;
  actionType?: 'ban' | 'warning' | 'monitor';
  timestamp: Date;
  processingTime: number; // milliseconds
}

export interface CacheEntry {
  analysis: BotAnalysis;
  timestamp: Date;
  ttl: number;
}

/**
 * Real-time bot analysis engine that continuously monitors and analyzes view data
 * Requirements: 4.3, 4.4, 4.5, 5.1-5.7
 */
export class RealTimeBotAnalyzer {
  private botDetectionService: BotDetectionService;
  private config: RealTimeBotAnalyzerConfig;
  private isRunning: boolean = false;
  private analysisQueue: Map<string, ViewRecord[]> = new Map();
  private lastAnalysisTime: Map<string, Date> = new Map();
  private cache: Map<string, CacheEntry> = new Map();

  constructor(
    botDetectionService?: BotDetectionService,
    config?: Partial<RealTimeBotAnalyzerConfig>
  ) {
    this.botDetectionService = botDetectionService || new BotDetectionService();
    this.config = {
      analysisInterval: 60 * 1000, // 1 minute - Requirement 4.4
      batchSize: 100,
      cacheTimeout: 5 * 60, // 5 minutes - matches Redis cache TTL
      enableAutoActions: true,
      logLevel: 'info',
      ...config,
    };
  }

  /**
   * Start the real-time analysis engine
   * Requirement 4.4: Update data setiap menit menggunakan background worker
   */
  start(): void {
    if (this.isRunning) {
      this.log('warn', 'Real-time bot analyzer is already running');
      return;
    }

    this.isRunning = true;
    this.log('info', 'Starting real-time bot analysis engine');

    // Start the analysis loop
    this.runAnalysisLoop();
  }

  /**
   * Stop the real-time analysis engine
   */
  stop(): void {
    this.isRunning = false;
    this.log('info', 'Stopping real-time bot analysis engine');
  }

  /**
   * Add view records to the analysis queue
   * Requirement 4.3: Mencatat views, likes, comments, shares dengan timestamp
   */
  addViewRecords(records: ViewRecord[]): void {
    for (const record of records) {
      const key = this.getAnalysisKey(record.promoterId, record.campaignId);

      if (!this.analysisQueue.has(key)) {
        this.analysisQueue.set(key, []);
      }

      const queue = this.analysisQueue.get(key)!;
      queue.push(record);

      // Keep only recent records (last 15 minutes for analysis)
      const cutoffTime = new Date(Date.now() - 15 * 60 * 1000);
      this.analysisQueue.set(
        key,
        queue.filter(r => r.timestamp >= cutoffTime)
      );
    }

    this.log('debug', `Added ${records.length} view records to analysis queue`);
  }

  /**
   * Perform immediate analysis for specific promoter/campaign
   * Returns cached result if available and fresh
   */
  async analyzeImmediate(
    promoterId: string,
    campaignId: string
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const key = this.getAnalysisKey(promoterId, campaignId);

    // Check cache first
    const cached = this.getCachedAnalysis(key);
    if (cached) {
      this.log('debug', `Returning cached analysis for ${key}`);
      return {
        analysis: cached.analysis,
        actionTaken: false,
        timestamp: cached.timestamp,
        processingTime: Date.now() - startTime,
      };
    }

    // Get view records from queue
    const viewRecords = this.analysisQueue.get(key) || [];

    // Perform analysis
    const analysis = await this.botDetectionService.analyzeViews(
      promoterId,
      campaignId,
      viewRecords
    );

    // Cache the result
    this.cacheAnalysis(key, analysis);

    // Take action if enabled
    let actionTaken = false;
    let actionType: 'ban' | 'warning' | 'monitor' | undefined;

    if (this.config.enableAutoActions && analysis.action !== 'none') {
      actionTaken = await this.takeAction(analysis);
      actionType = analysis.action;
    }

    const result: AnalysisResult = {
      analysis,
      actionTaken,
      actionType,
      timestamp: new Date(),
      processingTime: Date.now() - startTime,
    };

    this.log(
      'info',
      `Analysis completed for ${key}: ${analysis.action} (score: ${analysis.botScore})`
    );

    return result;
  }

  /**
   * Get analysis statistics
   */
  getStatistics(): {
    queueSize: number;
    cacheSize: number;
    isRunning: boolean;
    lastAnalysisCount: number;
  } {
    const queueSize = Array.from(this.analysisQueue.values()).reduce(
      (total, queue) => total + queue.length,
      0
    );

    return {
      queueSize,
      cacheSize: this.cache.size,
      isRunning: this.isRunning,
      lastAnalysisCount: this.lastAnalysisTime.size,
    };
  }

  /**
   * Clear cache and reset queues
   */
  reset(): void {
    this.analysisQueue.clear();
    this.lastAnalysisTime.clear();
    this.cache.clear();
    this.log('info', 'Real-time bot analyzer reset completed');
  }

  /**
   * Main analysis loop that runs continuously
   */
  private async runAnalysisLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.performScheduledAnalysis();

        // Wait for next interval
        await this.sleep(this.config.analysisInterval);
      } catch (error) {
        this.log('error', `Error in analysis loop: ${error}`);

        // Continue running even if there's an error
        await this.sleep(this.config.analysisInterval);
      }
    }
  }

  /**
   * Perform scheduled analysis for all queued items
   */
  private async performScheduledAnalysis(): Promise<void> {
    const analysisPromises: Promise<void>[] = [];

    const queueEntries = Array.from(this.analysisQueue.entries());
    for (const [key, viewRecords] of queueEntries) {
      if (viewRecords.length === 0) continue;

      // Check if enough time has passed since last analysis
      const lastAnalysis = this.lastAnalysisTime.get(key);
      if (
        lastAnalysis &&
        Date.now() - lastAnalysis.getTime() < this.config.analysisInterval
      ) {
        continue;
      }

      // Extract promoterId and campaignId from key
      const [promoterId, campaignId] = key.split(':');

      // Add to analysis batch
      analysisPromises.push(
        this.performSingleAnalysis(promoterId, campaignId, viewRecords)
      );

      // Limit batch size
      if (analysisPromises.length >= this.config.batchSize) {
        break;
      }
    }

    if (analysisPromises.length > 0) {
      this.log('debug', `Processing ${analysisPromises.length} analyses`);
      await Promise.allSettled(analysisPromises);
    }
  }

  /**
   * Perform analysis for a single promoter/campaign pair
   */
  private async performSingleAnalysis(
    promoterId: string,
    campaignId: string,
    viewRecords: ViewRecord[]
  ): Promise<void> {
    const key = this.getAnalysisKey(promoterId, campaignId);

    try {
      const analysis = await this.botDetectionService.analyzeViews(
        promoterId,
        campaignId,
        viewRecords
      );

      // Cache the result
      this.cacheAnalysis(key, analysis);

      // Update last analysis time
      this.lastAnalysisTime.set(key, new Date());

      // Take action if needed
      if (this.config.enableAutoActions && analysis.action !== 'none') {
        await this.takeAction(analysis);
      }

      // Store to database (this would be implemented with actual DB connection)
      await this.storeAnalysisResult(analysis);

      this.log(
        'debug',
        `Analysis completed for ${key}: ${analysis.action} (score: ${analysis.botScore})`
      );
    } catch (error) {
      this.log('error', `Failed to analyze ${key}: ${error}`);
    }
  }

  /**
   * Take automated action based on analysis result
   * Requirements: 5.4, 5.5, 5.6
   */
  private async takeAction(analysis: BotAnalysis): Promise<boolean> {
    try {
      switch (analysis.action) {
        case 'ban':
          // Requirement 5.4: >90% confidence - auto ban and cancel payout
          await this.banPromoter(
            analysis.promoterId,
            analysis.campaignId,
            analysis.reason
          );
          this.log(
            'warn',
            `BANNED promoter ${analysis.promoterId} for campaign ${analysis.campaignId}: ${analysis.reason}`
          );
          return true;

        case 'warning':
          // Requirement 5.5: 50-90% confidence - warning and hold payout
          await this.warnPromoter(
            analysis.promoterId,
            analysis.campaignId,
            analysis.reason
          );
          this.log(
            'warn',
            `WARNING issued to promoter ${analysis.promoterId} for campaign ${analysis.campaignId}: ${analysis.reason}`
          );
          return true;

        case 'monitor':
          // Requirement 5.6: 20-50% confidence - monitoring notification
          await this.monitorPromoter(
            analysis.promoterId,
            analysis.campaignId,
            analysis.reason
          );
          this.log(
            'info',
            `MONITORING promoter ${analysis.promoterId} for campaign ${analysis.campaignId}: ${analysis.reason}`
          );
          return true;

        default:
          return false;
      }
    } catch (error) {
      this.log(
        'error',
        `Failed to take action for ${analysis.promoterId}: ${error}`
      );
      return false;
    }
  }

  /**
   * Ban promoter and cancel payout
   */
  private async banPromoter(
    promoterId: string,
    campaignId: string,
    reason: string
  ): Promise<void> {
    // This would integrate with actual user management and payout systems
    this.log(
      'info',
      `Banning promoter ${promoterId} for campaign ${campaignId}: ${reason}`
    );

    // TODO: Implement actual ban logic:
    // - Update user status in database
    // - Cancel pending payouts
    // - Send notification
    // - Log to audit trail
  }

  /**
   * Issue warning and hold payout for review
   */
  private async warnPromoter(
    promoterId: string,
    campaignId: string,
    reason: string
  ): Promise<void> {
    // This would integrate with actual notification and payout systems
    this.log(
      'info',
      `Warning promoter ${promoterId} for campaign ${campaignId}: ${reason}`
    );

    // TODO: Implement actual warning logic:
    // - Hold payout for manual review
    // - Send warning notification
    // - Log to review queue
  }

  /**
   * Add promoter to monitoring list
   */
  private async monitorPromoter(
    promoterId: string,
    campaignId: string,
    reason: string
  ): Promise<void> {
    // This would integrate with monitoring systems
    this.log(
      'info',
      `Monitoring promoter ${promoterId} for campaign ${campaignId}: ${reason}`
    );

    // TODO: Implement actual monitoring logic:
    // - Add to monitoring list
    // - Send notification to admins
    // - Increase analysis frequency
  }

  /**
   * Store analysis result to database
   * Requirement 4.5: Menyimpan ke Redis untuk caching dan PostgreSQL untuk persistence
   */
  private async storeAnalysisResult(analysis: BotAnalysis): Promise<void> {
    // This would integrate with actual database connection
    this.log(
      'debug',
      `Storing analysis result for ${analysis.promoterId}:${analysis.campaignId}`
    );

    // TODO: Implement actual database storage:
    // - Store to PostgreSQL for persistence
    // - Update Redis cache
    // - Store in logs directory for audit
  }

  /**
   * Generate cache/analysis key
   */
  private getAnalysisKey(promoterId: string, campaignId: string): string {
    return `${promoterId}:${campaignId}`;
  }

  /**
   * Cache analysis result
   */
  private cacheAnalysis(key: string, analysis: BotAnalysis): void {
    const entry: CacheEntry = {
      analysis,
      timestamp: new Date(),
      ttl: this.config.cacheTimeout,
    };

    this.cache.set(key, entry);

    // Clean up expired cache entries
    this.cleanupCache();
  }

  /**
   * Get cached analysis if available and not expired
   */
  private getCachedAnalysis(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = (Date.now() - entry.timestamp.getTime()) / 1000;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const cacheEntries = Array.from(this.cache.entries());
    for (const [key, entry] of cacheEntries) {
      const age = (now - entry.timestamp.getTime()) / 1000;
      if (age > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logging utility
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string
  ): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      console.log(
        `[${timestamp}] [${level.toUpperCase()}] RealTimeBotAnalyzer: ${message}`
      );
    }
  }
}

/**
 * Factory function to create a real-time bot analyzer with default configuration
 */
export function createRealTimeBotAnalyzer(
  config?: Partial<RealTimeBotAnalyzerConfig>
): RealTimeBotAnalyzer {
  return new RealTimeBotAnalyzer(undefined, config);
}

/**
 * Singleton instance for global use
 */
let globalAnalyzer: RealTimeBotAnalyzer | null = null;

/**
 * Get or create global analyzer instance
 */
export function getGlobalBotAnalyzer(): RealTimeBotAnalyzer {
  if (!globalAnalyzer) {
    globalAnalyzer = createRealTimeBotAnalyzer({
      logLevel: 'info',
      enableAutoActions: true,
    });
  }
  return globalAnalyzer;
}
