import { pgTable, uuid, varchar, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { users, socialPlatformEnum } from './user';
import { campaigns, campaignApplications } from './campaign';

// Tables with partitioning support (partitioned by timestamp)
export const viewRecords = pgTable('view_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  promoterId: uuid('promoter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').references(() => campaignApplications.id, { onDelete: 'cascade' }),
  platform: socialPlatformEnum('platform').notNull(),
  platformPostId: varchar('platform_post_id', { length: 255 }).notNull(),
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  shareCount: integer('share_count').notNull().default(0),
  botScore: integer('bot_score').notNull().default(0),
  isLegitimate: boolean('is_legitimate').notNull().default(true),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  // Indexes for performance
  timestampIdx: index('view_records_timestamp_idx').on(table.timestamp),
  campaignPromoterIdx: index('view_records_campaign_promoter_idx').on(table.campaignId, table.promoterId),
  platformPostIdx: index('view_records_platform_post_idx').on(table.platform, table.platformPostId),
  botScoreIdx: index('view_records_bot_score_idx').on(table.botScore),
}));

export const trackingSessions = pgTable('tracking_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  promoterId: uuid('promoter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').references(() => campaignApplications.id, { onDelete: 'cascade' }),
  platform: socialPlatformEnum('platform').notNull(),
  platformPostId: varchar('platform_post_id', { length: 255 }).notNull(),
  startTime: timestamp('start_time').defaultNow().notNull(),
  lastChecked: timestamp('last_checked').defaultNow().notNull(),
  totalViews: integer('total_views').notNull().default(0),
  legitimateViews: integer('legitimate_views').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for performance
  activeSessionsIdx: index('tracking_sessions_active_idx').on(table.isActive, table.lastChecked),
  campaignPromoterIdx: index('tracking_sessions_campaign_promoter_idx').on(table.campaignId, table.promoterId),
  platformPostIdx: index('tracking_sessions_platform_post_idx').on(table.platform, table.platformPostId),
}));

// Relations
export const viewRecordsRelations = relations(viewRecords, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [viewRecords.campaignId],
    references: [campaigns.id],
  }),
  promoter: one(users, {
    fields: [viewRecords.promoterId],
    references: [users.id],
  }),
  application: one(campaignApplications, {
    fields: [viewRecords.applicationId],
    references: [campaignApplications.id],
  }),
}));

export const trackingSessionsRelations = relations(trackingSessions, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [trackingSessions.campaignId],
    references: [campaigns.id],
  }),
  promoter: one(users, {
    fields: [trackingSessions.promoterId],
    references: [users.id],
  }),
  application: one(campaignApplications, {
    fields: [trackingSessions.applicationId],
    references: [campaignApplications.id],
  }),
  viewRecords: many(viewRecords),
}));

// Validation schemas
export const ViewRecordSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  promoterId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  platform: z.enum(['tiktok', 'instagram']),
  platformPostId: z.string(),
  viewCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  shareCount: z.number().int().nonnegative(),
  timestamp: z.date(),
  botScore: z.number().int().min(0).max(100),
  isLegitimate: z.boolean(),
});

export const TrackingSessionSchema = z.object({
  id: z.string().uuid(),
  promoterId: z.string().uuid(),
  campaignId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  platform: z.enum(['tiktok', 'instagram']),
  platformPostId: z.string(),
  startTime: z.date(),
  lastChecked: z.date(),
  totalViews: z.number().int().nonnegative(),
  legitimateViews: z.number().int().nonnegative(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ViewRecord = z.infer<typeof ViewRecordSchema>;
export type TrackingSession = z.infer<typeof TrackingSessionSchema>;