import { BotDetectionService, BotAnalysis, ViewRecord, BotDetectionConfig } from './bot-detection';
import { RealTimeBotAnalyzer } from './real-time-bot-analyzer';
import { BotAnalysisWorker } from './bot-analysis-worker';
import * as fs from 'fs';
import * as path from 'path';

export interface EnhancedBotAnalyzerConfig {
  detection: BotDetectionConfig;
  logging: {
    enabled: boolean;
    logPath: string;
    auditTrail: boolean;
    detailedAnalysis: boolean;
  };
  actions: {
    autoExecute: boolean;
    requireConfirmation: boolean;
    notifyAdmins: boolean;
  };
  thresholds: {
    highConfidenceBan: number; // 90%
    mediumConfidenceWarning: number; // 50%
    lowConfidenceMonitor: number; // 20%
  };
}

export interface ActionResult {
  action: 'ban' | 'warning' | 'monitor' | 'none';
  executed: boolean;
  reason: string;
  confidence: number;
  timestamp: Date;
  promoterId: string;
  campaignId: string;
  details: {
    viewsAnalyzed?: number;
    suspiciousPatterns: string[];
    metrics: BotAnalysis['metrics'];
  };
}

export interface AnalysisLog {
  timestamp: Date;
  promoterId: string;
  campaignId: string;
  analysis: BotAnalysis;
  actionResult: ActionResult;
  processingTime: number;
}

/**
 * Enhanced Bot Analysis Engine with comprehensive confidence scoring and action triggers
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
export class EnhancedBotAnalyzer {
  private botDetectionService: BotDetectionService;
  private realTimeAnalyzer: RealTimeBotAnalyzer;
  private worker: BotAnalysisWorker;
  private config: EnhancedBotAnalyzerConfig;
  private analysisHistory: Map<string, AnalysisLog[]> = new Map();

  constructor(config?: Partial<EnhancedBotAnalyzerConfig>) {
    this.config = {
      detection: new BotDetectionService().config,
      logging: {
        enabled: true,
        logPath: 'logs/bot-detection/',
        auditTrail: true,
        detailedAnalysis: true
      },
      actions: {
        autoExecute: true,
        requireConfirmation: false,
        notifyAdmins: true
      },
      thresholds: {
        highConfidenceBan: 90,
        mediumConfidenceWarning: 50,
        lowConfidenceMonitor: 20
      },
      ...config
    };

    this.botDetectionService = new BotDetectionService(this.config.detection);
    this.realTimeAnalyzer = new RealTimeBotAnalyzer(this.botDetectionService);
    this.worker = new BotAnalysisWorker();

    this.ensureLogDirectories();
  }

  /**
   * Perform comprehensive bot analysis with enhanced confidence scoring
   * Requirements: 5.1, 5.2, 5.3 - Calculate ratios, detect spikes, score confidence
   */
  async performAnalysis(
    promoterId: string,
    campaignId: string,
    viewRecords: ViewRecord[]
  ): Promise<{ analysis: BotAnalysis; actionResult: ActionResult }> {
    const startTime = Date.now();
    
    try {
      // Perform bot detection analysis
      const analysis = await this.botDetectionService.analyzeViews(
        promoterId,
        campaignId,
        viewRecords
      );

      // Enhanced confidence scoring with additional patterns
      const enhancedAnalysis = this.enhanceConfidenceScoring(analysis, viewRecords);

      // Determine and execute actions based on confidence
      const actionResult = await this.executeConfidenceBasedActions(
        enhancedAnalysis,
        viewRecords
      );

      // Log the analysis
      const analysisLog: AnalysisLog = {
        timestamp: new Date(),
        promoterId,
        campaignId,
        analysis: enhancedAnalysis,
        actionResult,
        processingTime: Date.now() - startTime
      };

      await this.logAnalysis(analysisLog);
      this.storeAnalysisHistory(promoterId, campaignId, analysisLog);

      return { analysis: enhancedAnalysis, actionResult };

    } catch (error) {
      await this.logError(promoterId, campaignId, error as Error);
      throw error;
    }
  }

  /**
   * Enhanced confidence scoring with additional suspicious patterns
   * Requirements: 5.1, 5.2, 5.3 - Comprehensive pattern detection
   */
  private enhanceConfidenceScoring(
    analysis: BotAnalysis,
    viewRecords: ViewRecord[]
  ): BotAnalysis {
    let additionalScore = 0;
    const additionalReasons: string[] = [];

    // Pattern 1: Consistent timing patterns (bot-like regularity)
    const timingScore = this.analyzeTimingPatterns(viewRecords);
    if (timingScore > 0) {
      additionalScore += timingScore;
      additionalReasons.push(`Suspicious timing patterns (+${timingScore})`);
    }

    // Pattern 2: Engagement velocity analysis
    const velocityScore = this.analyzeEngagementVelocity(viewRecords);
    if (velocityScore > 0) {
      additionalScore += velocityScore;
      additionalReasons.push(`Abnormal engagement velocity (+${velocityScore})`);
    }

    // Pattern 3: Platform-specific suspicious patterns
    const platformScore = this.analyzePlatformSpecificPatterns(viewRecords);
    if (platformScore > 0) {
      additionalScore += platformScore;
      additionalReasons.push(`Platform-specific anomalies (+${platformScore})`);
    }

    // Update bot score and reason
    const enhancedBotScore = Math.min(analysis.botScore + additionalScore, 100);
    const enhancedReason = additionalReasons.length > 0 
      ? `${analysis.reason}; ${additionalReasons.join('; ')}`
      : analysis.reason;

    // Re-determine action based on enhanced score
    const enhancedAction = this.determineEnhancedAction(enhancedBotScore);

    return {
      ...analysis,
      botScore: enhancedBotScore,
      reason: enhancedReason,
      action: enhancedAction,
      confidence: enhancedBotScore
    };
  }

  /**
   * Analyze timing patterns for bot-like regularity
   */
  private analyzeTimingPatterns(viewRecords: ViewRecord[]): number {
    if (viewRecords.length < 3) return 0;

    const sortedRecords = [...viewRecords].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    const intervals: number[] = [];
    for (let i = 1; i < sortedRecords.length; i++) {
      const interval = sortedRecords[i].timestamp.getTime() - sortedRecords[i-1].timestamp.getTime();
      intervals.push(interval);
    }

    // Check for suspiciously regular intervals (within 5% variance)
    if (intervals.length >= 3) {
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => 
        sum + Math.pow(interval - avgInterval, 2), 0
      ) / intervals.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avgInterval;

      // Very low variation suggests bot-like regularity
      if (coefficientOfVariation < 0.05) {
        return 15; // Add 15 points for suspicious regularity
      }
    }

    return 0;
  }

  /**
   * Analyze engagement velocity for suspicious patterns
   */
  private analyzeEngagementVelocity(viewRecords: ViewRecord[]): number {
    if (viewRecords.length < 2) return 0;

    let score = 0;
    const sortedRecords = [...viewRecords].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    for (let i = 1; i < sortedRecords.length; i++) {
      const prev = sortedRecords[i - 1];
      const curr = sortedRecords[i];
      
      const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000; // seconds
      const viewDiff = curr.viewCount - prev.viewCount;
      const likeDiff = curr.likeCount - prev.likeCount;
      const commentDiff = curr.commentCount - prev.commentCount;

      if (timeDiff > 0 && viewDiff > 0) {
        const viewVelocity = viewDiff / timeDiff; // views per second
        const likeVelocity = likeDiff / timeDiff; // likes per second
        const commentVelocity = commentDiff / timeDiff; // comments per second

        // Suspicious: High view velocity with disproportionately low engagement velocity
        if (viewVelocity > 10 && likeVelocity < 0.1 && commentVelocity < 0.01) {
          score += 10;
        }

        // Suspicious: Negative engagement (likes/comments decreasing while views increase)
        if (viewDiff > 0 && (likeDiff < 0 || commentDiff < 0)) {
          score += 5;
        }
      }
    }

    return Math.min(score, 25); // Cap at 25 points
  }

  /**
   * Analyze platform-specific suspicious patterns
   */
  private analyzePlatformSpecificPatterns(viewRecords: ViewRecord[]): number {
    let score = 0;

    const tiktokRecords = viewRecords.filter(r => r.platform === 'tiktok');
    const instagramRecords = viewRecords.filter(r => r.platform === 'instagram');

    // TikTok specific patterns
    if (tiktokRecords.length > 0) {
      const avgTikTokViews = tiktokRecords.reduce((sum, r) => sum + r.viewCount, 0) / tiktokRecords.length;
      const avgTikTokLikes = tiktokRecords.reduce((sum, r) => sum + r.likeCount, 0) / tiktokRecords.length;
      
      // TikTok typically has higher engagement rates
      if (avgTikTokViews > 1000 && avgTikTokLikes / avgTikTokViews < 0.02) {
        score += 8; // Low engagement for TikTok
      }
    }

    // Instagram specific patterns
    if (instagramRecords.length > 0) {
      const avgInstagramViews = instagramRecords.reduce((sum, r) => sum + r.viewCount, 0) / instagramRecords.length;
      const avgInstagramComments = instagramRecords.reduce((sum, r) => sum + r.commentCount, 0) / instagramRecords.length;
      
      // Instagram typically has more comments relative to views
      if (avgInstagramViews > 500 && avgInstagramComments / avgInstagramViews < 0.005) {
        score += 7; // Low comment rate for Instagram
      }
    }

    return score;
  }

  /**
   * Determine action based on enhanced confidence scoring
   * Requirements: 5.4, 5.5, 5.6 - Confidence-based actions
   */
  private determineEnhancedAction(botScore: number): 'none' | 'monitor' | 'warning' | 'ban' {
    if (botScore >= this.config.thresholds.highConfidenceBan) {
      return 'ban';
    } else if (botScore >= this.config.thresholds.mediumConfidenceWarning) {
      return 'warning';
    } else if (botScore >= this.config.thresholds.lowConfidenceMonitor) {
      return 'monitor';
    }
    return 'none';
  }

  /**
   * Execute confidence-based actions with proper triggers
   * Requirements: 5.4, 5.5, 5.6, 5.7 - Action execution and logging
   */
  private async executeConfidenceBasedActions(
    analysis: BotAnalysis,
    viewRecords: ViewRecord[]
  ): Promise<ActionResult> {
    const actionResult: ActionResult = {
      action: analysis.action,
      executed: false,
      reason: analysis.reason,
      confidence: analysis.botScore,
      timestamp: new Date(),
      promoterId: analysis.promoterId,
      campaignId: analysis.campaignId,
      details: {
        viewsAnalyzed: viewRecords.length,
        suspiciousPatterns: this.extractSuspiciousPatterns(analysis),
        metrics: analysis.metrics
      }
    };

    if (analysis.action === 'none') {
      return actionResult;
    }

    try {
      if (this.config.actions.autoExecute && !this.config.actions.requireConfirmation) {
        switch (analysis.action) {
          case 'ban':
            // Requirement 5.4: >90% confidence - auto ban and cancel payout
            await this.executeBanAction(analysis);
            actionResult.executed = true;
            break;

          case 'warning':
            // Requirement 5.5: 50-90% confidence - warning and hold payout
            await this.executeWarningAction(analysis);
            actionResult.executed = true;
            break;

          case 'monitor':
            // Requirement 5.6: 20-50% confidence - monitoring notification
            await this.executeMonitorAction(analysis);
            actionResult.executed = true;
            break;
        }

        if (this.config.actions.notifyAdmins) {
          await this.notifyAdmins(analysis, actionResult);
        }
      }

      return actionResult;

    } catch (error) {
      await this.logError(analysis.promoterId, analysis.campaignId, error as Error);
      return actionResult;
    }
  }

  /**
   * Execute ban action for high-confidence bot detection
   * Requirement 5.4: Auto ban and cancel payout for >90% confidence
   */
  private async executeBanAction(analysis: BotAnalysis): Promise<void> {
    const logMessage = `EXECUTING BAN ACTION: Promoter ${analysis.promoterId} banned for campaign ${analysis.campaignId}`;
    await this.logAction('BAN', analysis, logMessage);

    // TODO: Integrate with actual systems:
    // 1. Update user status in database to 'banned'
    // 2. Cancel all pending payouts for this promoter/campaign
    // 3. Remove promoter from active campaigns
    // 4. Send notification to promoter
    // 5. Alert admin dashboard
    // 6. Update campaign statistics
  }

  /**
   * Execute warning action for medium-confidence detection
   * Requirement 5.5: Warning and hold payout for 50-90% confidence
   */
  private async executeWarningAction(analysis: BotAnalysis): Promise<void> {
    const logMessage = `EXECUTING WARNING ACTION: Promoter ${analysis.promoterId} warned for campaign ${analysis.campaignId}`;
    await this.logAction('WARNING', analysis, logMessage);

    // TODO: Integrate with actual systems:
    // 1. Hold payout for manual review
    // 2. Send warning notification to promoter
    // 3. Add to admin review queue
    // 4. Increase monitoring frequency
    // 5. Flag future activities for closer scrutiny
  }

  /**
   * Execute monitor action for low-confidence detection
   * Requirement 5.6: Monitoring notification for 20-50% confidence
   */
  private async executeMonitorAction(analysis: BotAnalysis): Promise<void> {
    const logMessage = `EXECUTING MONITOR ACTION: Promoter ${analysis.promoterId} added to monitoring for campaign ${analysis.campaignId}`;
    await this.logAction('MONITOR', analysis, logMessage);

    // TODO: Integrate with actual systems:
    // 1. Add to monitoring list
    // 2. Send notification to admin dashboard
    // 3. Increase analysis frequency for this promoter
    // 4. Track patterns over longer time periods
  }

  /**
   * Extract suspicious patterns from analysis for detailed logging
   */
  private extractSuspiciousPatterns(analysis: BotAnalysis): string[] {
    const patterns: string[] = [];

    if (analysis.metrics.viewLikeRatio > 10) {
      patterns.push(`High view:like ratio (${analysis.metrics.viewLikeRatio.toFixed(1)}:1)`);
    }

    if (analysis.metrics.viewCommentRatio > 100) {
      patterns.push(`High view:comment ratio (${analysis.metrics.viewCommentRatio.toFixed(1)}:1)`);
    }

    if (analysis.metrics.spikeDetected) {
      patterns.push(`View spike detected (${analysis.metrics.spikePercentage?.toFixed(1)}%)`);
    }

    if (analysis.metrics.totalViews > 0 && analysis.metrics.totalLikes === 0) {
      patterns.push('Zero engagement despite views');
    }

    if (analysis.metrics.avgViewsPerMinute > 1000) {
      patterns.push(`Extremely high view rate (${analysis.metrics.avgViewsPerMinute.toFixed(0)}/min)`);
    }

    return patterns;
  }

  /**
   * Log analysis results to file system
   * Requirement 5.7: Store bot detection score and logs
   */
  private async logAnalysis(analysisLog: AnalysisLog): Promise<void> {
    if (!this.config.logging.enabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      promoterId: analysisLog.promoterId,
      campaignId: analysisLog.campaignId,
      botScore: analysisLog.analysis.botScore,
      action: analysisLog.analysis.action,
      reason: analysisLog.analysis.reason,
      metrics: analysisLog.analysis.metrics,
      actionExecuted: analysisLog.actionResult.executed,
      processingTime: analysisLog.processingTime
    };

    // Write to daily log file
    const logFileName = `bot-analysis-${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(this.config.logging.logPath, logFileName);
    
    const logLine = JSON.stringify(logEntry) + '\n';
    await this.appendToFile(logFilePath, logLine);

    // Write detailed analysis if enabled
    if (this.config.logging.detailedAnalysis) {
      const detailedFileName = `detailed-analysis-${new Date().toISOString().split('T')[0]}.log`;
      const detailedFilePath = path.join(this.config.logging.logPath, detailedFileName);
      
      const detailedEntry = {
        ...logEntry,
        fullAnalysis: analysisLog.analysis,
        actionResult: analysisLog.actionResult
      };
      
      const detailedLine = JSON.stringify(detailedEntry, null, 2) + '\n---\n';
      await this.appendToFile(detailedFilePath, detailedLine);
    }
  }

  /**
   * Log specific actions taken
   */
  private async logAction(
    actionType: 'BAN' | 'WARNING' | 'MONITOR',
    analysis: BotAnalysis,
    message: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const actionLog = {
      timestamp,
      actionType,
      promoterId: analysis.promoterId,
      campaignId: analysis.campaignId,
      botScore: analysis.botScore,
      reason: analysis.reason,
      message
    };

    const actionFileName = `actions-${new Date().toISOString().split('T')[0]}.log`;
    const actionFilePath = path.join(this.config.logging.logPath, actionFileName);
    
    const actionLine = JSON.stringify(actionLog) + '\n';
    await this.appendToFile(actionFilePath, actionLine);
  }

  /**
   * Log errors
   */
  private async logError(promoterId: string, campaignId: string, error: Error): Promise<void> {
    const timestamp = new Date().toISOString();
    const errorLog = {
      timestamp,
      promoterId,
      campaignId,
      error: error.message,
      stack: error.stack
    };

    const errorFileName = `errors-${new Date().toISOString().split('T')[0]}.log`;
    const errorFilePath = path.join(this.config.logging.logPath, errorFileName);
    
    const errorLine = JSON.stringify(errorLog) + '\n';
    await this.appendToFile(errorFilePath, errorLine);
  }

  /**
   * Notify admins of bot detection actions
   */
  private async notifyAdmins(analysis: BotAnalysis, actionResult: ActionResult): Promise<void> {
    // TODO: Implement admin notification system
    // This would integrate with:
    // 1. Email notifications
    // 2. Admin dashboard alerts
    // 3. Slack/Discord webhooks
    // 4. SMS for critical actions
    
    console.log(`ADMIN NOTIFICATION: ${actionResult.action.toUpperCase()} action for promoter ${analysis.promoterId}`);
  }

  /**
   * Store analysis history for pattern tracking
   */
  private storeAnalysisHistory(promoterId: string, campaignId: string, analysisLog: AnalysisLog): void {
    const key = `${promoterId}:${campaignId}`;
    
    if (!this.analysisHistory.has(key)) {
      this.analysisHistory.set(key, []);
    }
    
    const history = this.analysisHistory.get(key)!;
    history.push(analysisLog);
    
    // Keep only last 100 analyses per promoter/campaign
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Get analysis history for a promoter/campaign
   */
  getAnalysisHistory(promoterId: string, campaignId: string): AnalysisLog[] {
    const key = `${promoterId}:${campaignId}`;
    return this.analysisHistory.get(key) || [];
  }

  /**
   * Ensure log directories exist
   */
  private ensureLogDirectories(): void {
    try {
      if (!fs.existsSync(this.config.logging.logPath)) {
        fs.mkdirSync(this.config.logging.logPath, { recursive: true });
      }
    } catch (error) {
      console.error(`Failed to create log directory: ${error}`);
    }
  }

  /**
   * Append content to file
   */
  private async appendToFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.promises.appendFile(filePath, content, 'utf8');
    } catch (error) {
      console.error(`Failed to write to log file ${filePath}: ${error}`);
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStatistics(): {
    totalAnalyses: number;
    actionsSummary: { [key: string]: number };
    averageConfidence: number;
    recentActivity: number;
  } {
    const allHistory = Array.from(this.analysisHistory.values()).flat();
    const recentHistory = allHistory.filter(log => 
      Date.now() - log.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const actionsSummary = allHistory.reduce((acc, log) => {
      acc[log.actionResult.action] = (acc[log.actionResult.action] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const averageConfidence = allHistory.length > 0
      ? allHistory.reduce((sum, log) => sum + log.analysis.botScore, 0) / allHistory.length
      : 0;

    return {
      totalAnalyses: allHistory.length,
      actionsSummary,
      averageConfidence,
      recentActivity: recentHistory.length
    };
  }

  /**
   * Start the enhanced analyzer
   */
  async start(): Promise<void> {
    this.realTimeAnalyzer.start();
    await this.worker.start();
    
    const startLog = {
      timestamp: new Date().toISOString(),
      event: 'ENHANCED_BOT_ANALYZER_STARTED',
      config: this.config
    };
    
    const startLogPath = path.join(this.config.logging.logPath, 'system.log');
    await this.appendToFile(startLogPath, JSON.stringify(startLog) + '\n');
  }

  /**
   * Stop the enhanced analyzer
   */
  async stop(): Promise<void> {
    this.realTimeAnalyzer.stop();
    await this.worker.stop();
    
    const stopLog = {
      timestamp: new Date().toISOString(),
      event: 'ENHANCED_BOT_ANALYZER_STOPPED',
      statistics: this.getStatistics()
    };
    
    const stopLogPath = path.join(this.config.logging.logPath, 'system.log');
    await this.appendToFile(stopLogPath, JSON.stringify(stopLog) + '\n');
  }
}

/**
 * Factory function to create enhanced bot analyzer
 */
export function createEnhancedBotAnalyzer(
  config?: Partial<EnhancedBotAnalyzerConfig>
): EnhancedBotAnalyzer {
  return new EnhancedBotAnalyzer(config);
}

/**
 * Global enhanced analyzer instance
 */
let globalEnhancedAnalyzer: EnhancedBotAnalyzer | null = null;

/**
 * Get or create global enhanced analyzer
 */
export function getGlobalEnhancedBotAnalyzer(): EnhancedBotAnalyzer {
  if (!globalEnhancedAnalyzer) {
    globalEnhancedAnalyzer = createEnhancedBotAnalyzer({
      actions: {
        autoExecute: true,
        requireConfirmation: false,
        notifyAdmins: true
      },
      logging: {
        enabled: true,
        logPath: 'logs/bot-detection/',
        auditTrail: true,
        detailedAnalysis: true
      }
    });
  }
  return globalEnhancedAnalyzer;
}