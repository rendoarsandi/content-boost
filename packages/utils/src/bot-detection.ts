// Bot detection utilities
export interface BotDetectionConfig {
  thresholds: {
    viewLikeRatio: number; // 10:1
    viewCommentRatio: number; // 100:1 (10:0.1)
    spikePercentage: number; // 500%
    spikeTimeWindow: number; // 5 minutes in milliseconds
  };
  confidence: {
    ban: number; // 90%
    warning: number; // 50%
    monitor: number; // 20%
  };
}

export interface ViewRecord {
  id: string;
  promoterId: string;
  campaignId: string;
  platform: 'tiktok' | 'instagram';
  platformPostId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  timestamp: Date;
  botScore?: number;
  isLegitimate?: boolean;
}

export interface BotAnalysis {
  promoterId: string;
  campaignId: string;
  analysisWindow: {
    start: Date;
    end: Date;
  };
  metrics: {
    avgViewsPerMinute: number;
    avgLikesPerMinute: number;
    avgCommentsPerMinute: number;
    viewLikeRatio: number;
    viewCommentRatio: number;
    spikeDetected: boolean;
    spikePercentage?: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
  };
  botScore: number;
  action: 'none' | 'monitor' | 'warning' | 'ban';
  reason: string;
  confidence: number;
}

export class BotDetectionService {
  private config: BotDetectionConfig = {
    thresholds: {
      viewLikeRatio: 10,
      viewCommentRatio: 100,
      spikePercentage: 500,
      spikeTimeWindow: 5 * 60 * 1000 // 5 minutes
    },
    confidence: {
      ban: 90,
      warning: 50,
      monitor: 20
    }
  };

  constructor(config?: Partial<BotDetectionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Analyzes view records for bot detection
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
   */
  async analyzeViews(
    promoterId: string, 
    campaignId: string, 
    viewRecords: ViewRecord[]
  ): Promise<BotAnalysis> {
    const analysisWindow = {
      start: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
      end: new Date()
    };

    // Filter records within analysis window
    const recentViews = viewRecords.filter(record => 
      record.timestamp >= analysisWindow.start && 
      record.timestamp <= analysisWindow.end &&
      record.promoterId === promoterId &&
      record.campaignId === campaignId
    );

    // Calculate metrics
    const metrics = this.calculateMetrics(recentViews, analysisWindow);
    
    // Calculate bot score
    const botScore = this.calculateBotScore(metrics);
    
    // Determine action based on confidence levels
    const action = this.determineAction(botScore);
    
    // Generate reason for the decision
    const reason = this.generateReason(metrics, botScore);

    return {
      promoterId,
      campaignId,
      analysisWindow,
      metrics,
      botScore,
      action,
      reason,
      confidence: botScore
    };
  }

  /**
   * Calculate metrics from view records
   * Requirement 5.1: Calculate rata-rata views, likes, dan comments per menit
   */
  private calculateMetrics(
    viewRecords: ViewRecord[], 
    analysisWindow: { start: Date; end: Date }
  ): BotAnalysis['metrics'] {
    if (viewRecords.length === 0) {
      return {
        avgViewsPerMinute: 0,
        avgLikesPerMinute: 0,
        avgCommentsPerMinute: 0,
        viewLikeRatio: 0,
        viewCommentRatio: 0,
        spikeDetected: false,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0
      };
    }

    // Calculate totals
    const totalViews = viewRecords.reduce((sum, record) => sum + record.viewCount, 0);
    const totalLikes = viewRecords.reduce((sum, record) => sum + record.likeCount, 0);
    const totalComments = viewRecords.reduce((sum, record) => sum + record.commentCount, 0);

    // Calculate time window in minutes
    const timeWindowMinutes = (analysisWindow.end.getTime() - analysisWindow.start.getTime()) / (1000 * 60);
    
    // Calculate averages per minute
    const avgViewsPerMinute = totalViews / timeWindowMinutes;
    const avgLikesPerMinute = totalLikes / timeWindowMinutes;
    const avgCommentsPerMinute = totalComments / timeWindowMinutes;

    // Calculate ratios
    const viewLikeRatio = totalLikes > 0 ? totalViews / totalLikes : totalViews;
    const viewCommentRatio = totalComments > 0 ? totalViews / totalComments : totalViews;

    // Detect spikes
    const { spikeDetected, spikePercentage } = this.detectSpikes(viewRecords);

    return {
      avgViewsPerMinute,
      avgLikesPerMinute,
      avgCommentsPerMinute,
      viewLikeRatio,
      viewCommentRatio,
      spikeDetected,
      spikePercentage,
      totalViews,
      totalLikes,
      totalComments
    };
  }

  /**
   * Detect view spikes
   * Requirement 5.3: Detect spike views >500% dari rata-rata normal dalam <5 menit
   */
  private detectSpikes(viewRecords: ViewRecord[]): { spikeDetected: boolean; spikePercentage?: number } {
    if (viewRecords.length < 2) {
      return { spikeDetected: false };
    }

    // Sort by timestamp
    const sortedRecords = [...viewRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Look for spikes by comparing consecutive records
    let maxSpikePercentage = 0;
    let spikeDetected = false;

    for (let i = 1; i < sortedRecords.length; i++) {
      const previous = sortedRecords[i - 1];
      const current = sortedRecords[i];
      
      // Check if records are within spike time window (5 minutes)
      const timeDiff = current.timestamp.getTime() - previous.timestamp.getTime();
      if (timeDiff <= this.config.thresholds.spikeTimeWindow) {
        if (previous.viewCount > 0) {
          const spikePercentage = ((current.viewCount - previous.viewCount) / previous.viewCount) * 100;
          if (spikePercentage > maxSpikePercentage) {
            maxSpikePercentage = spikePercentage;
          }
          
          if (spikePercentage > this.config.thresholds.spikePercentage) {
            spikeDetected = true;
          }
        }
      }
    }

    return { 
      spikeDetected, 
      spikePercentage: maxSpikePercentage > 0 ? maxSpikePercentage : undefined 
    };
  }

  /**
   * Calculate bot confidence score
   * Requirements: 5.2, 5.3 - Check ratios and spikes
   */
  private calculateBotScore(metrics: BotAnalysis['metrics']): number {
    let botScore = 0;

    // Check view:like ratio (Requirement 5.2)
    // Abnormal ratio >10:1 in 1 minute
    if (metrics.viewLikeRatio > this.config.thresholds.viewLikeRatio) {
      botScore += 30;
    }

    // Check view:comment ratio (Requirement 5.2)
    // Abnormal ratio >10:0.1 (100:1) in 1 minute
    if (metrics.viewCommentRatio > this.config.thresholds.viewCommentRatio) {
      botScore += 25;
    }

    // Check for spikes (Requirement 5.3)
    if (metrics.spikeDetected && metrics.spikePercentage && metrics.spikePercentage > this.config.thresholds.spikePercentage) {
      botScore += 45;
    }

    // Additional suspicious patterns
    if (metrics.totalViews > 0 && metrics.totalLikes === 0 && metrics.totalComments === 0) {
      // Views with no engagement at all
      botScore += 20;
    }

    if (metrics.avgViewsPerMinute > 1000) {
      // Extremely high view rate
      botScore += 15;
    }

    return Math.min(botScore, 100); // Cap at 100
  }

  /**
   * Determine action based on bot score
   * Requirements: 5.4, 5.5, 5.6
   */
  private determineAction(botScore: number): 'none' | 'monitor' | 'warning' | 'ban' {
    if (botScore >= this.config.confidence.ban) {
      return 'ban'; // Requirement 5.4: >90% confidence
    } else if (botScore >= this.config.confidence.warning) {
      return 'warning'; // Requirement 5.5: 50-90% confidence
    } else if (botScore >= this.config.confidence.monitor) {
      return 'monitor'; // Requirement 5.6: 20-50% confidence
    }
    return 'none';
  }

  /**
   * Generate human-readable reason for bot detection decision
   */
  private generateReason(metrics: BotAnalysis['metrics'], botScore: number): string {
    const reasons: string[] = [];

    if (metrics.viewLikeRatio > this.config.thresholds.viewLikeRatio) {
      reasons.push(`Abnormal view:like ratio (${metrics.viewLikeRatio.toFixed(1)}:1)`);
    }

    if (metrics.viewCommentRatio > this.config.thresholds.viewCommentRatio) {
      reasons.push(`Abnormal view:comment ratio (${metrics.viewCommentRatio.toFixed(1)}:1)`);
    }

    if (metrics.spikeDetected && metrics.spikePercentage) {
      reasons.push(`View spike detected (${metrics.spikePercentage.toFixed(1)}% increase)`);
    }

    if (metrics.totalViews > 0 && metrics.totalLikes === 0 && metrics.totalComments === 0) {
      reasons.push('No engagement despite high views');
    }

    if (metrics.avgViewsPerMinute > 1000) {
      reasons.push(`Extremely high view rate (${metrics.avgViewsPerMinute.toFixed(0)} views/min)`);
    }

    if (reasons.length === 0) {
      return `Normal activity detected (confidence: ${botScore}%)`;
    }

    return `Suspicious patterns: ${reasons.join(', ')} (confidence: ${botScore}%)`;
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(): BotDetectionConfig {
    return {
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
  }
}