// Payment calculation utilities
export interface PaymentCalculation {
  totalViews: number;
  legitimateViews: number;
  ratePerView: number;
  grossAmount: number;
  platformFeePercentage: number;
  platformFee: number;
  netAmount: number;
}

export function calculatePayout(
  legitimateViews: number,
  ratePerView: number,
  platformFeePercentage: number = 5
): PaymentCalculation {
  const grossAmount = legitimateViews * ratePerView;
  const platformFee = grossAmount * (platformFeePercentage / 100);
  const netAmount = grossAmount - platformFee;

  return {
    totalViews: legitimateViews, // Will be updated when we have bot detection
    legitimateViews,
    ratePerView,
    grossAmount,
    platformFeePercentage,
    platformFee,
    netAmount,
  };
}

export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
  }).format(amount);
}