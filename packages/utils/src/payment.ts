// Payment calculation utilities
export interface PaymentCalculation {
  totalViews: number;
  legitimateViews: number;
  botViews: number;
  ratePerView: number;
  grossAmount: number;
  platformFeePercentage: number;
  platformFee: number;
  netAmount: number;
  calculatedAt: Date;
}

export interface PayoutPeriod {
  start: Date;
  end: Date;
  promoterId: string;
  campaignId: string;
}

export interface PaymentRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Calculate payout based on legitimate views
 * Requirements: 6.1, 6.2, 6.3 - Calculate views, multiply by rate, deduct platform fee
 */
export function calculatePayout(
  totalViews: number,
  legitimateViews: number,
  ratePerView: number,
  platformFeePercentage: number = 5
): PaymentCalculation {
  // Validate inputs
  if (totalViews < 0 || legitimateViews < 0 || ratePerView < 0) {
    throw new Error('Views and rate must be non-negative numbers');
  }
  
  if (legitimateViews > totalViews) {
    throw new Error('Legitimate views cannot exceed total views');
  }

  if (platformFeePercentage < 0 || platformFeePercentage > 100) {
    throw new Error('Platform fee percentage must be between 0 and 100');
  }

  const botViews = totalViews - legitimateViews;
  const grossAmount = legitimateViews * ratePerView;
  const platformFee = grossAmount * (platformFeePercentage / 100);
  const netAmount = grossAmount - platformFee;

  return {
    totalViews,
    legitimateViews,
    botViews,
    ratePerView,
    grossAmount,
    platformFeePercentage,
    platformFee,
    netAmount,
    calculatedAt: new Date()
  };
}

/**
 * Calculate daily payout for a specific period
 * Requirement 6.1: Calculate total views legitimate per promoter at end of day
 */
export function calculateDailyPayout(
  payoutPeriod: PayoutPeriod,
  viewRecords: Array<{
    viewCount: number;
    isLegitimate: boolean;
    timestamp: Date;
  }>,
  ratePerView: number,
  platformFeePercentage: number = 5
): PaymentCalculation {
  // Filter records within the payout period
  const periodRecords = viewRecords.filter(record => 
    record.timestamp >= payoutPeriod.start && 
    record.timestamp <= payoutPeriod.end
  );

  const totalViews = periodRecords.reduce((sum, record) => sum + record.viewCount, 0);
  const legitimateViews = periodRecords
    .filter(record => record.isLegitimate)
    .reduce((sum, record) => sum + record.viewCount, 0);

  return calculatePayout(totalViews, legitimateViews, ratePerView, platformFeePercentage);
}

/**
 * Format currency amount for Indonesian Rupiah
 */
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
  
  // Remove space after Rp for consistency
  return formatted.replace(/^Rp\s+/, 'Rp');
}

/**
 * Format currency with decimal places
 */
export function formatCurrencyDetailed(amount: number, currency: string = 'IDR'): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  
  // Remove space after Rp for consistency
  return formatted.replace(/^Rp\s+/, 'Rp');
}

/**
 * Calculate exponential backoff delay for payment retries
 * Requirement 6.6: Retry maksimal 3x dengan exponential backoff
 */
export function calculateRetryDelay(
  attemptNumber: number,
  config: PaymentRetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2
  }
): number {
  if (attemptNumber > config.maxRetries) {
    throw new Error(`Attempt number ${attemptNumber} exceeds max retries ${config.maxRetries}`);
  }

  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attemptNumber - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number, minAmount: number = 1000): boolean {
  return amount >= minAmount && amount <= Number.MAX_SAFE_INTEGER;
}

/**
 * Calculate platform revenue from fees
 */
export function calculatePlatformRevenue(
  payouts: PaymentCalculation[],
  period: { start: Date; end: Date }
): {
  totalGrossAmount: number;
  totalPlatformFees: number;
  totalNetPayouts: number;
  payoutCount: number;
  period: { start: Date; end: Date };
} {
  const totalGrossAmount = payouts.reduce((sum, payout) => sum + payout.grossAmount, 0);
  const totalPlatformFees = payouts.reduce((sum, payout) => sum + payout.platformFee, 0);
  const totalNetPayouts = payouts.reduce((sum, payout) => sum + payout.netAmount, 0);

  return {
    totalGrossAmount,
    totalPlatformFees,
    totalNetPayouts,
    payoutCount: payouts.length,
    period
  };
}

/**
 * Generate payout summary for reporting
 */
export function generatePayoutSummary(calculation: PaymentCalculation): string {
  const legitimacyRate = calculation.totalViews > 0 
    ? (calculation.legitimateViews / calculation.totalViews * 100).toFixed(1)
    : '0.0';

  return [
    `Total Views: ${calculation.totalViews.toLocaleString('id-ID')}`,
    `Legitimate Views: ${calculation.legitimateViews.toLocaleString('id-ID')} (${legitimacyRate}%)`,
    `Bot Views: ${calculation.botViews.toLocaleString('id-ID')}`,
    `Rate per View: ${formatCurrency(calculation.ratePerView)}`,
    `Gross Amount: ${formatCurrency(calculation.grossAmount)}`,
    `Platform Fee (${calculation.platformFeePercentage}%): ${formatCurrency(calculation.platformFee)}`,
    `Net Payout: ${formatCurrency(calculation.netAmount)}`
  ].join('\n');
}