/**
 * Bot Detection Algorithm
 *
 * This module implements the bot detection algorithm for identifying suspicious
 * view patterns in social media content promotion.
 */

export interface BotDetectionConfig {
  thresholds: {
    viewLikeRatio: number; // Threshold for view:like ratio (e.g., 10:1)
    viewCommentRatio: number; // Threshold for view:comment ratio (e.g., 100:1)
    spikePercentage: number; // Percentage increase to consider a spike (e.g., 500%)
    spikeTimeWindow: number; // Time window to detect spikes in milliseconds (e.g., 5 minutes)
  };
  confidence: {
    ban: number; // Confidence threshold for automatic ban (e.g., 90%)
    warning: number; // Confidence threshold for warning (e.g., 50%)
    monitor: number; // Confidence threshold for monitoring (e.g., 20%)
  };
}

export interface ViewMetrics {
  timestamp: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
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
    totalViews?: number;
    totalLikes?: number;
    totalComments?: number;
  };
  botScore: number; // 0-100
  action: 'none' | 'monitor' | 'warning' | 'ban';
  reason: string;
  confidence?: number;
}

export interface ViewRecord {
  id: string;
  promoterId: string;
  campaignId: string;
  timestamp: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  platform: 'tiktok' | 'instagram';
  contentId: string;
}

export class BotDetectionService {
  private config: BotDetectionConfig;

  constructor(config?: Partial<BotDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async analyzeViews(
    promoterId: string,
    campaignId: string,
    viewMetrics: ViewMetrics[]
  ): Promise<BotAnalysis> {
    return detectBot(promoterId, campaignId, viewMetrics, this.config);
  }

  updateConfig(config: Partial<BotDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): BotDetectionConfig {
    return { ...this.config };
  }
}

/**
 * Default configuration for bot detection
 */
const DEFAULT_CONFIG: BotDetectionConfig = {
  thresholds: {
    viewLikeRatio: 10,
    viewCommentRatio: 100,
    spikePercentage: 500,
    spikeTimeWindow: 5 * 60 * 1000, // 5 minutes
  },
  confidence: {
    ban: 90,
    warning: 50,
    monitor: 20,
  },
};

/**
 * Analyzes view metrics to detect bot activity
 *
 * @param promoterId - ID of the promoter
 * @param campaignId - ID of the campaign
 * @param viewMetrics - Array of view metrics data points
 * @param config - Bot detection configuration (optional)
 * @returns Bot analysis result with confidence score and recommended action
 */
export function detectBot(
  promoterId: string,
  campaignId: string,
  viewMetrics: ViewMetrics[],
  config: BotDetectionConfig = DEFAULT_CONFIG
): BotAnalysis {
  // Sort metrics by timestamp (oldest first)
  const sortedMetrics = [...viewMetrics].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  if (sortedMetrics.length === 0) {
    return createEmptyAnalysis(promoterId, campaignId);
  }

  // Calculate time window
  const startTime = sortedMetrics[0].timestamp;
  const endTime = sortedMetrics[sortedMetrics.length - 1].timestamp;
  const totalMinutes = (endTime.getTime() - startTime.getTime()) / (60 * 1000);

  // Calculate averages
  const totalViews = sortedMetrics.reduce(
    (sum, metric) => sum + metric.viewCount,
    0
  );
  const totalLikes = sortedMetrics.reduce(
    (sum, metric) => sum + metric.likeCount,
    0
  );
  const totalComments = sortedMetrics.reduce(
    (sum, metric) => sum + metric.commentCount,
    0
  );

  const avgViewsPerMinute = totalMinutes > 0 ? totalViews / totalMinutes : 0;
  const avgLikesPerMinute = totalMinutes > 0 ? totalLikes / totalMinutes : 0;
  const avgCommentsPerMinute =
    totalMinutes > 0 ? totalComments / totalMinutes : 0;

  // Calculate ratios
  const viewLikeRatio = totalLikes > 0 ? totalViews / totalLikes : Infinity;
  const viewCommentRatio =
    totalComments > 0 ? totalViews / totalComments : Infinity;

  // Detect spikes
  const { spikeDetected, spikePercentage } = detectViewSpikes(
    sortedMetrics,
    config.thresholds.spikeTimeWindow,
    config.thresholds.spikePercentage
  );

  // Calculate bot score
  let botScore = 0;
  let reasons: string[] = [];

  // Check view:like ratio
  if (viewLikeRatio > config.thresholds.viewLikeRatio) {
    const severity = Math.min(
      100,
      (viewLikeRatio / config.thresholds.viewLikeRatio) * 30
    );
    botScore += severity;
    reasons.push(`High view:like ratio (${viewLikeRatio.toFixed(1)}:1)`);
  }

  // Check view:comment ratio
  if (viewCommentRatio > config.thresholds.viewCommentRatio) {
    const severity = Math.min(
      100,
      (viewCommentRatio / config.thresholds.viewCommentRatio) * 25
    );
    botScore += severity;
    reasons.push(`High view:comment ratio (${viewCommentRatio.toFixed(1)}:1)`);
  }

  // Check for spikes
  if (
    spikeDetected &&
    spikePercentage &&
    spikePercentage > config.thresholds.spikePercentage
  ) {
    const severity = Math.min(
      100,
      (spikePercentage / config.thresholds.spikePercentage) * 45
    );
    botScore += severity;
    reasons.push(
      `View spike detected (${spikePercentage.toFixed(1)}% increase)`
    );
  }

  // Normalize bot score to 0-100 range
  botScore = Math.min(100, botScore);

  // Determine action
  let action: 'none' | 'monitor' | 'warning' | 'ban' = 'none';
  if (botScore >= config.confidence.ban) {
    action = 'ban';
  } else if (botScore >= config.confidence.warning) {
    action = 'warning';
  } else if (botScore >= config.confidence.monitor) {
    action = 'monitor';
  }

  return {
    promoterId,
    campaignId,
    analysisWindow: {
      start: startTime,
      end: endTime,
    },
    metrics: {
      avgViewsPerMinute,
      avgLikesPerMinute,
      avgCommentsPerMinute,
      viewLikeRatio,
      viewCommentRatio,
      spikeDetected,
      spikePercentage,
    },
    botScore,
    action,
    reason: reasons.join('; '),
  };
}

/**
 * Detects abnormal spikes in view counts
 */
function detectViewSpikes(
  metrics: ViewMetrics[],
  timeWindowMs: number,
  thresholdPercentage: number
): { spikeDetected: boolean; spikePercentage?: number } {
  if (metrics.length < 3) {
    return { spikeDetected: false };
  }

  let maxSpikePercentage = 0;
  let spikeDetected = false;

  // Calculate baseline average (excluding potential spikes)
  const baselineMetrics = metrics.slice(0, Math.floor(metrics.length * 0.7));
  const baselineTotal = baselineMetrics.reduce(
    (sum, m) => sum + m.viewCount,
    0
  );
  const baselineAvg = baselineTotal / baselineMetrics.length;

  // Check each data point for spikes
  for (let i = 1; i < metrics.length; i++) {
    const current = metrics[i];

    // Find all points within the time window before current
    const windowStart = new Date(current.timestamp.getTime() - timeWindowMs);
    const previousPoints = metrics.filter(
      m => m.timestamp >= windowStart && m.timestamp < current.timestamp
    );

    if (previousPoints.length > 0) {
      // Calculate average views in previous window
      const prevAvg =
        previousPoints.reduce((sum, m) => sum + m.viewCount, 0) /
        previousPoints.length;

      // Skip if previous average is too low (avoid division by small numbers)
      if (prevAvg < 10) continue;

      // Calculate percentage increase
      const percentageIncrease =
        ((current.viewCount - prevAvg) / prevAvg) * 100;

      if (
        percentageIncrease > thresholdPercentage &&
        current.viewCount > baselineAvg * 2
      ) {
        spikeDetected = true;
        maxSpikePercentage = Math.max(maxSpikePercentage, percentageIncrease);
      }
    }
  }

  return {
    spikeDetected,
    spikePercentage: spikeDetected ? maxSpikePercentage : undefined,
  };
}

/**
 * Creates an empty analysis result when no data is available
 */
function createEmptyAnalysis(
  promoterId: string,
  campaignId: string
): BotAnalysis {
  const now = new Date();
  return {
    promoterId,
    campaignId,
    analysisWindow: {
      start: now,
      end: now,
    },
    metrics: {
      avgViewsPerMinute: 0,
      avgLikesPerMinute: 0,
      avgCommentsPerMinute: 0,
      viewLikeRatio: 0,
      viewCommentRatio: 0,
      spikeDetected: false,
    },
    botScore: 0,
    action: 'none',
    reason: 'Insufficient data for analysis',
  };
}

// Export the module
export default {
  detectBot,
  DEFAULT_CONFIG,
};
