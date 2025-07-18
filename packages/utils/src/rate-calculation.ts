// Rate calculation utilities for campaigns and payouts

export interface RateCalculationConfig {
  minRatePerView: number;
  maxRatePerView: number;
  defaultPlatformFeePercentage: number;
  minBudget: number;
  maxBudget: number;
}

export interface CampaignBudgetAnalysis {
  budget: number;
  ratePerView: number;
  estimatedViews: number;
  platformFeePercentage: number;
  estimatedPlatformFee: number;
  estimatedCreatorCost: number;
  budgetUtilization: number; // percentage
  isViable: boolean;
  recommendations: string[];
}

export interface ViewsProjection {
  period: 'daily' | 'weekly' | 'monthly';
  estimatedViews: number;
  estimatedLegitimateViews: number;
  estimatedBotViews: number;
  legitimacyRate: number;
  projectedPayout: number;
  projectedPlatformFee: number;
}

/**
 * Default rate calculation configuration
 */
export const DEFAULT_RATE_CONFIG: RateCalculationConfig = {
  minRatePerView: 100, // Rp 100 minimum
  maxRatePerView: 10000, // Rp 10,000 maximum
  defaultPlatformFeePercentage: 5,
  minBudget: 10000, // Rp 10,000 minimum
  maxBudget: 100000000 // Rp 100 million maximum
};

/**
 * Calculate optimal rate per view based on budget and target views
 */
export function calculateOptimalRate(
  budget: number,
  targetViews: number,
  platformFeePercentage: number = DEFAULT_RATE_CONFIG.defaultPlatformFeePercentage,
  config: RateCalculationConfig = DEFAULT_RATE_CONFIG
): {
  ratePerView: number;
  adjustedTargetViews: number;
  budgetUtilization: number;
  isOptimal: boolean;
  reason: string;
} {
  // Validate inputs
  if (budget < config.minBudget) {
    throw new Error(`Budget must be at least ${config.minBudget}`);
  }
  
  if (budget > config.maxBudget) {
    throw new Error(`Budget cannot exceed ${config.maxBudget}`);
  }
  
  if (targetViews <= 0) {
    throw new Error('Target views must be positive');
  }

  // Calculate gross budget (budget - platform fee)
  const grossBudget = budget / (1 + platformFeePercentage / 100);
  
  // Calculate ideal rate per view
  let idealRate = grossBudget / targetViews;
  
  // Adjust rate to fit within constraints
  let adjustedRate = Math.max(config.minRatePerView, Math.min(idealRate, config.maxRatePerView));
  let adjustedTargetViews = Math.floor(grossBudget / adjustedRate);
  let budgetUtilization = (adjustedTargetViews * adjustedRate * (1 + platformFeePercentage / 100)) / budget * 100;
  
  let isOptimal = true;
  let reason = 'Rate calculated optimally';
  
  if (idealRate < config.minRatePerView) {
    isOptimal = false;
    reason = `Rate too low (${idealRate.toFixed(0)}), adjusted to minimum ${config.minRatePerView}`;
  } else if (idealRate > config.maxRatePerView) {
    isOptimal = false;
    reason = `Rate too high (${idealRate.toFixed(0)}), adjusted to maximum ${config.maxRatePerView}`;
  }

  return {
    ratePerView: Math.round(adjustedRate),
    adjustedTargetViews,
    budgetUtilization: Math.round(budgetUtilization * 100) / 100,
    isOptimal,
    reason
  };
}

/**
 * Analyze campaign budget and provide recommendations
 */
export function analyzeCampaignBudget(
  budget: number,
  ratePerView: number,
  platformFeePercentage: number = DEFAULT_RATE_CONFIG.defaultPlatformFeePercentage,
  config: RateCalculationConfig = DEFAULT_RATE_CONFIG
): CampaignBudgetAnalysis {
  const recommendations: string[] = [];
  
  // Calculate basic metrics
  const grossBudget = budget / (1 + platformFeePercentage / 100);
  const estimatedViews = Math.floor(grossBudget / ratePerView);
  const estimatedPlatformFee = budget - grossBudget;
  const estimatedCreatorCost = budget;
  const budgetUtilization = (estimatedViews * ratePerView * (1 + platformFeePercentage / 100)) / budget * 100;
  
  // Determine viability
  let isViable = true;
  
  // Check rate constraints
  if (ratePerView < config.minRatePerView) {
    isViable = false;
    recommendations.push(`Rate per view (${ratePerView}) is below minimum (${config.minRatePerView})`);
  }
  
  if (ratePerView > config.maxRatePerView) {
    isViable = false;
    recommendations.push(`Rate per view (${ratePerView}) exceeds maximum (${config.maxRatePerView})`);
  }
  
  // Check budget constraints
  if (budget < config.minBudget) {
    isViable = false;
    recommendations.push(`Budget (${budget}) is below minimum (${config.minBudget})`);
  }
  
  if (budget > config.maxBudget) {
    isViable = false;
    recommendations.push(`Budget (${budget}) exceeds maximum (${config.maxBudget})`);
  }
  
  // Check if budget can generate meaningful views
  if (estimatedViews < 10) {
    isViable = false;
    recommendations.push(`Budget too low to generate meaningful views (estimated: ${estimatedViews})`);
  }
  
  // Provide optimization recommendations
  if (budgetUtilization < 90) {
    recommendations.push(`Budget utilization is low (${budgetUtilization.toFixed(1)}%). Consider increasing rate per view or reducing budget.`);
  }
  
  if (ratePerView < 500) {
    recommendations.push('Consider increasing rate per view to attract more promoters');
  }
  
  if (estimatedViews > 100000) {
    recommendations.push('High view target may require longer campaign duration or multiple promoters');
  }

  return {
    budget,
    ratePerView,
    estimatedViews,
    platformFeePercentage,
    estimatedPlatformFee,
    estimatedCreatorCost,
    budgetUtilization: Math.round(budgetUtilization * 100) / 100,
    isViable,
    recommendations
  };
}

/**
 * Project views and earnings for different time periods
 */
export function projectViewsAndEarnings(
  dailyViews: number,
  ratePerView: number,
  legitimacyRate: number = 0.85, // 85% legitimate views by default
  platformFeePercentage: number = DEFAULT_RATE_CONFIG.defaultPlatformFeePercentage
): {
  daily: ViewsProjection;
  weekly: ViewsProjection;
  monthly: ViewsProjection;
} {
  const calculateProjection = (views: number, period: ViewsProjection['period']): ViewsProjection => {
    const estimatedLegitimateViews = Math.floor(views * legitimacyRate);
    const estimatedBotViews = views - estimatedLegitimateViews;
    const grossPayout = estimatedLegitimateViews * ratePerView;
    const projectedPlatformFee = grossPayout * (platformFeePercentage / 100);
    const projectedPayout = grossPayout - projectedPlatformFee;
    
    return {
      period,
      estimatedViews: views,
      estimatedLegitimateViews,
      estimatedBotViews,
      legitimacyRate: legitimacyRate * 100,
      projectedPayout,
      projectedPlatformFee
    };
  };

  return {
    daily: calculateProjection(dailyViews, 'daily'),
    weekly: calculateProjection(dailyViews * 7, 'weekly'),
    monthly: calculateProjection(dailyViews * 30, 'monthly')
  };
}

/**
 * Calculate break-even point for a campaign
 */
export function calculateBreakEven(
  budget: number,
  ratePerView: number,
  platformFeePercentage: number = DEFAULT_RATE_CONFIG.defaultPlatformFeePercentage,
  legitimacyRate: number = 0.85
): {
  requiredTotalViews: number;
  requiredLegitimateViews: number;
  breakEvenDays: number; // assuming average daily views
  isAchievable: boolean;
} {
  const grossBudget = budget / (1 + platformFeePercentage / 100);
  const requiredLegitimateViews = Math.ceil(grossBudget / ratePerView);
  const requiredTotalViews = Math.ceil(requiredLegitimateViews / legitimacyRate);
  
  // Assume average of 1000 views per day per promoter
  const averageDailyViews = 1000;
  const breakEvenDays = Math.ceil(requiredTotalViews / averageDailyViews);
  
  // Consider achievable if break-even is within 30 days
  const isAchievable = breakEvenDays <= 30;

  return {
    requiredTotalViews,
    requiredLegitimateViews,
    breakEvenDays,
    isAchievable
  };
}

/**
 * Calculate competitive rate analysis
 */
export function analyzeCompetitiveRates(
  currentRate: number,
  marketRates: number[],
  budget: number
): {
  currentRate: number;
  marketAverage: number;
  marketMedian: number;
  percentile: number;
  competitiveness: 'low' | 'average' | 'high' | 'premium';
  recommendation: string;
  suggestedRate?: number;
} {
  if (marketRates.length === 0) {
    return {
      currentRate,
      marketAverage: currentRate,
      marketMedian: currentRate,
      percentile: 50,
      competitiveness: 'average',
      recommendation: 'No market data available for comparison'
    };
  }

  const sortedRates = [...marketRates].sort((a, b) => a - b);
  const marketAverage = marketRates.reduce((sum, rate) => sum + rate, 0) / marketRates.length;
  const marketMedian = sortedRates[Math.floor(sortedRates.length / 2)];
  
  // Calculate percentile
  const lowerRates = sortedRates.filter(rate => rate < currentRate).length;
  const percentile = (lowerRates / sortedRates.length) * 100;
  
  // Determine competitiveness
  let competitiveness: 'low' | 'average' | 'high' | 'premium';
  if (percentile < 25) {
    competitiveness = 'low';
  } else if (percentile < 75) {
    competitiveness = 'average';
  } else if (percentile < 90) {
    competitiveness = 'high';
  } else {
    competitiveness = 'premium';
  }
  
  // Generate recommendation
  let recommendation: string;
  let suggestedRate: number | undefined;
  
  switch (competitiveness) {
    case 'low':
      suggestedRate = Math.ceil(marketMedian * 1.1);
      recommendation = `Rate is below market average. Consider increasing to ${suggestedRate} to attract more promoters.`;
      break;
    case 'average':
      recommendation = 'Rate is competitive with market average.';
      break;
    case 'high':
      recommendation = 'Rate is above market average, should attract quality promoters.';
      break;
    case 'premium':
      recommendation = 'Premium rate - excellent for attracting top promoters but may impact budget efficiency.';
      break;
  }

  return {
    currentRate,
    marketAverage: Math.round(marketAverage),
    marketMedian: Math.round(marketMedian),
    percentile: Math.round(percentile),
    competitiveness,
    recommendation,
    suggestedRate
  };
}

/**
 * Validate rate and budget combination
 */
export function validateRateAndBudget(
  rate: number,
  budget: number,
  config: RateCalculationConfig = DEFAULT_RATE_CONFIG
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate rate
  if (rate < config.minRatePerView) {
    errors.push(`Rate per view (${rate}) is below minimum (${config.minRatePerView})`);
  }
  
  if (rate > config.maxRatePerView) {
    errors.push(`Rate per view (${rate}) exceeds maximum (${config.maxRatePerView})`);
  }
  
  // Validate budget
  if (budget < config.minBudget) {
    errors.push(`Budget (${budget}) is below minimum (${config.minBudget})`);
  }
  
  if (budget > config.maxBudget) {
    errors.push(`Budget (${budget}) exceeds maximum (${config.maxBudget})`);
  }
  
  // Check budget-rate relationship
  const estimatedViews = Math.floor(budget / rate);
  if (estimatedViews < 10) {
    errors.push(`Budget too low for meaningful campaign (estimated views: ${estimatedViews})`);
  }
  
  // Warnings
  if (rate < 500) {
    warnings.push('Low rate may not attract quality promoters');
  }
  
  if (estimatedViews > 50000) {
    warnings.push('High view target may require extended campaign duration');
  }
  
  if (budget > 10000000) { // 10 million
    warnings.push('Large budget - consider splitting into multiple campaigns');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}