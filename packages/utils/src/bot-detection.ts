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
  private cache: Map<string, { result: BotAnalysis; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config?: Partial<BotDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async analyzeViews(
    promoterId: string,
    campaignId: string,
    viewMetrics: ViewMetrics[]
  ): Promise<BotAnalysis> {
    // Create cache key
    const cacheKey = `${promoterId}-${campaignId}-${viewMetrics.length}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    // For large datasets, use batch processing
    const result =
      viewMetrics.length > 1000
        ? await this.analyzeBatched(promoterId, campaignId, viewMetrics)
        : detectBot(promoterId, campaignId, viewMetrics, this.config);

    // Cache the result
    this.cache.set(cacheKey, { result, timestamp: Date.now() });

    // Clean old cache entries periodically
    this.cleanCache();

    return result;
  }

  private async analyzeBatched(
    promoterId: string,
    campaignId: string,
    viewMetrics: ViewMetrics[]
  ): Promise<BotAnalysis> {
    const batchSize = 500;
    const batches = [];

    // Split into batches
    for (let i = 0; i < viewMetrics.length; i += batchSize) {
      batches.push(viewMetrics.slice(i, i + batchSize));
    }

    // Process batches and aggregate results
    const batchResults = batches.map(batch =>
      detectBot(promoterId, campaignId, batch, this.config)
    );

    // Aggregate batch results
    return this.aggregateBatchResults(
      promoterId,
      campaignId,
      batchResults,
      viewMetrics
    );
  }

  private aggregateBatchResults(
    promoterId: string,
    campaignId: string,
    batchResults: BotAnalysis[],
    originalMetrics: ViewMetrics[]
  ): BotAnalysis {
    const totalViews = batchResults.reduce(
      (sum, batch) => sum + (batch.metrics.totalViews || 0),
      0
    );
    const totalLikes = batchResults.reduce(
      (sum, batch) => sum + (batch.metrics.totalLikes || 0),
      0
    );
    const totalComments = batchResults.reduce(
      (sum, batch) => sum + (batch.metrics.totalComments || 0),
      0
    );

    const avgBotScore =
      batchResults.reduce((sum, batch) => sum + batch.botScore, 0) /
      batchResults.length;
    const maxBotScore = Math.max(...batchResults.map(batch => batch.botScore));

    // Use the higher of average or max for final score (more conservative)
    const finalBotScore = Math.max(avgBotScore, maxBotScore * 0.8);

    const viewLikeRatio = totalLikes > 0 ? totalViews / totalLikes : Infinity;
    const viewCommentRatio =
      totalComments > 0 ? totalViews / totalComments : Infinity;

    const action = this.determineAction(finalBotScore);
    const reasons = batchResults
      .flatMap(batch => batch.reason.split('; '))
      .filter((v, i, a) => a.indexOf(v) === i);

    return {
      promoterId,
      campaignId,
      analysisWindow: {
        start: originalMetrics[0]?.timestamp || new Date(),
        end:
          originalMetrics[originalMetrics.length - 1]?.timestamp || new Date(),
      },
      metrics: {
        avgViewsPerMinute: 0, // Simplified for batched processing
        avgLikesPerMinute: 0,
        avgCommentsPerMinute: 0,
        viewLikeRatio,
        viewCommentRatio,
        spikeDetected: batchResults.some(batch => batch.metrics.spikeDetected),
        totalViews,
        totalLikes,
        totalComments,
      },
      botScore: Math.round(finalBotScore),
      action,
      reason: reasons.join('; '),
      confidence: finalBotScore,
    };
  }

  private determineAction(
    botScore: number
  ): 'none' | 'monitor' | 'warning' | 'ban' {
    if (botScore >= this.config.confidence.ban) return 'ban';
    if (botScore >= this.config.confidence.warning) return 'warning';
    if (botScore >= this.config.confidence.monitor) return 'monitor';
    return 'none';
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  updateConfig(config: Partial<BotDetectionConfig>): void {
    this.config = { ...this.config, ...config };
    // Clear cache when config changes
    this.cache.clear();
  }

  getConfig(): BotDetectionConfig {
    return { ...this.config };
  }

  // Method to manually clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats for monitoring
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Could implement hit rate tracking if needed
    };
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

  // Detect spikes - use optimized version for large datasets
  const { spikeDetected, spikePercentage } =
    sortedMetrics.length > 1000
      ? detectViewSpikesOptimized(
          sortedMetrics,
          config.thresholds.spikeTimeWindow,
          config.thresholds.spikePercentage
        )
      : detectViewSpikes(
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
 * Optimized spike detection for large datasets
 * Uses sampling and early termination for better performance
 */
function detectViewSpikesOptimized(
  metrics: ViewMetrics[],
  timeWindowMs: number,
  thresholdPercentage: number
): { spikeDetected: boolean; spikePercentage?: number } {
  if (metrics.length < 3) {
    return { spikeDetected: false };
  }

  let maxSpikePercentage = 0;
  let spikeDetected = false;

  // Calculate baseline using more efficient approach
  const totalViews = metrics.reduce((sum, m) => sum + m.viewCount, 0);
  const baselineAvg = totalViews / metrics.length;

  // Use sampling for very large datasets
  const sampleRate =
    metrics.length > 5000
      ? Math.ceil(metrics.length / 2000)
      : metrics.length > 2000
        ? Math.ceil(metrics.length / 1000)
        : 1;
  const sampledMetrics =
    sampleRate > 1
      ? metrics.filter((_, index) => index % sampleRate === 0)
      : metrics;

  // Use sliding window approach for better performance
  const windowSize = Math.min(20, Math.floor(sampledMetrics.length / 5));

  for (let i = windowSize; i < sampledMetrics.length && !spikeDetected; i++) {
    const current = sampledMetrics[i];

    // Calculate moving average of previous window
    const prevWindow = sampledMetrics.slice(i - windowSize, i);
    const prevAvg =
      prevWindow.reduce((sum, m) => sum + m.viewCount, 0) / prevWindow.length;

    // Skip if previous average is too low
    if (prevAvg < 10) continue;

    // Calculate percentage increase
    const percentageIncrease = ((current.viewCount - prevAvg) / prevAvg) * 100;

    // Check for spike with relaxed threshold for performance
    if (
      percentageIncrease > thresholdPercentage &&
      current.viewCount > baselineAvg * 1.5
    ) {
      spikeDetected = true;
      maxSpikePercentage = percentageIncrease;
      break; // Early exit for performance
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
