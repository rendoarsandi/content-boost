import { z } from 'zod';

export const PayoutSchema = z.object({
  id: z.string().uuid(),
  promoterId: z.string().uuid(),
  campaignId: z.string().uuid(),
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  metrics: z.object({
    totalViews: z.number().int().nonnegative(),
    legitimateViews: z.number().int().nonnegative(),
    botViews: z.number().int().nonnegative(),
    ratePerView: z.number().positive(),
  }),
  amounts: z.object({
    gross: z.number().nonnegative(),
    platformFee: z.number().nonnegative(),
    net: z.number().nonnegative(),
  }),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  processedAt: z.date().optional(),
  failureReason: z.string().optional(),
});

export const PlatformRevenueSchema = z.object({
  id: z.string().uuid(),
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  totalFees: z.number().nonnegative(),
  withdrawnAmount: z.number().nonnegative(),
  availableBalance: z.number().nonnegative(),
  createdAt: z.date(),
});

export type Payout = z.infer<typeof PayoutSchema>;
export type PlatformRevenue = z.infer<typeof PlatformRevenueSchema>;