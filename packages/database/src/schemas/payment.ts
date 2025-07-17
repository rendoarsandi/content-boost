import { pgTable, uuid, decimal, integer, timestamp, varchar, text, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { users } from './user';
import { campaigns, campaignApplications } from './campaign';

// Enums
export const payoutStatusEnum = pgEnum('payout_status', ['pending', 'processing', 'completed', 'failed', 'cancelled']);

// Tables
export const payouts = pgTable('payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  promoterId: uuid('promoter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').references(() => campaignApplications.id, { onDelete: 'cascade' }),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  totalViews: integer('total_views').notNull().default(0),
  legitimateViews: integer('legitimate_views').notNull().default(0),
  botViews: integer('bot_views').notNull().default(0),
  ratePerView: decimal('rate_per_view', { precision: 10, scale: 2 }).notNull(),
  grossAmount: decimal('gross_amount', { precision: 15, scale: 2 }).notNull(),
  platformFee: decimal('platform_fee', { precision: 15, scale: 2 }).notNull(),
  netAmount: decimal('net_amount', { precision: 15, scale: 2 }).notNull(),
  status: payoutStatusEnum('status').default('pending').notNull(),
  processedAt: timestamp('processed_at'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for performance
  statusIdx: index('payouts_status_idx').on(table.status),
  periodIdx: index('payouts_period_idx').on(table.periodStart, table.periodEnd),
  promoterIdx: index('payouts_promoter_idx').on(table.promoterId),
  campaignIdx: index('payouts_campaign_idx').on(table.campaignId),
  processedAtIdx: index('payouts_processed_at_idx').on(table.processedAt),
}));

export const platformRevenue = pgTable('platform_revenue', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  totalFees: decimal('total_fees', { precision: 15, scale: 2 }).notNull().default('0'),
  withdrawnAmount: decimal('withdrawn_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  availableBalance: decimal('available_balance', { precision: 15, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for performance
  periodIdx: index('platform_revenue_period_idx').on(table.periodStart, table.periodEnd),
}));

export const withdrawals = pgTable('withdrawals', {
  id: uuid('id').primaryKey().defaultRandom(),
  revenueId: uuid('revenue_id').notNull().references(() => platformRevenue.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  status: payoutStatusEnum('status').default('pending').notNull(),
  processedAt: timestamp('processed_at'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const payoutsRelations = relations(payouts, ({ one }) => ({
  promoter: one(users, {
    fields: [payouts.promoterId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [payouts.campaignId],
    references: [campaigns.id],
  }),
  application: one(campaignApplications, {
    fields: [payouts.applicationId],
    references: [campaignApplications.id],
  }),
}));

export const platformRevenueRelations = relations(platformRevenue, ({ many }) => ({
  withdrawals: many(withdrawals),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  revenue: one(platformRevenue, {
    fields: [withdrawals.revenueId],
    references: [platformRevenue.id],
  }),
}));

// Validation schemas
export const PayoutSchema = z.object({
  id: z.string().uuid(),
  promoterId: z.string().uuid(),
  campaignId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  periodStart: z.date(),
  periodEnd: z.date(),
  totalViews: z.number().int().nonnegative(),
  legitimateViews: z.number().int().nonnegative(),
  botViews: z.number().int().nonnegative(),
  ratePerView: z.number().positive(),
  grossAmount: z.number().nonnegative(),
  platformFee: z.number().nonnegative(),
  netAmount: z.number().nonnegative(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  processedAt: z.date().optional(),
  failureReason: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PlatformRevenueSchema = z.object({
  id: z.string().uuid(),
  periodStart: z.date(),
  periodEnd: z.date(),
  totalFees: z.number().nonnegative(),
  withdrawnAmount: z.number().nonnegative(),
  availableBalance: z.number().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const WithdrawalSchema = z.object({
  id: z.string().uuid(),
  revenueId: z.string().uuid(),
  amount: z.number().positive(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  processedAt: z.date().optional(),
  failureReason: z.string().optional(),
  createdAt: z.date(),
});

export type Payout = z.infer<typeof PayoutSchema>;
export type PlatformRevenue = z.infer<typeof PlatformRevenueSchema>;
export type Withdrawal = z.infer<typeof WithdrawalSchema>;