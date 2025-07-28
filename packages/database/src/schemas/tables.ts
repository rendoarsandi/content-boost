import { pgTable, uuid, varchar, text, decimal, timestamp, pgEnum, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['creator', 'promoter', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'banned']);
export const socialPlatformEnum = pgEnum('social_platform', ['tiktok', 'instagram']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed']);
export const materialTypeEnum = pgEnum('material_type', ['google_drive', 'youtube', 'image', 'video']);
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'approved', 'rejected']);
export const payoutStatusEnum = pgEnum('payout_status', ['pending', 'processing', 'completed', 'failed']);

// User tables
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }),
  role: userRoleEnum('role').notNull(),
  status: userStatusEnum('status').default('active').notNull(),
  lastActive: timestamp('last_active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const socialAccounts = pgTable('social_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: socialPlatformEnum('platform').notNull(),
  platformUserId: varchar('platform_user_id', { length: 255 }).notNull(),
  accessToken: varchar('access_token', { length: 1000 }).notNull(),
  refreshToken: varchar('refresh_token', { length: 1000 }),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Campaign tables
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  budget: decimal('budget', { precision: 15, scale: 2 }).notNull(),
  ratePerView: decimal('rate_per_view', { precision: 10, scale: 2 }).notNull(),
  status: campaignStatusEnum('status').default('draft').notNull(),
  requirements: jsonb('requirements'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const campaignMaterials = pgTable('campaign_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  type: materialTypeEnum('type').notNull(),
  url: varchar('url', { length: 1000 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const campaignApplications = pgTable('campaign_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  promoterId: uuid('promoter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: applicationStatusEnum('status').default('pending').notNull(),
  submittedContent: text('submitted_content'),
  trackingLink: varchar('tracking_link', { length: 500 }).notNull(),
  metadata: jsonb('metadata'),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
});

// Tracking tables
export const viewRecords = pgTable('view_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  promoterId: uuid('promoter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').references(() => campaignApplications.id, { onDelete: 'cascade' }),
  platform: socialPlatformEnum('platform').notNull(),
  contentId: varchar('content_id', { length: 255 }).notNull(),
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  shareCount: integer('share_count').notNull().default(0),
  botScore: integer('bot_score').notNull().default(0),
  isLegitimate: boolean('is_legitimate').notNull().default(true),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  timestampIdx: index('view_records_timestamp_idx').on(table.timestamp),
  campaignPromoterIdx: index('view_records_campaign_promoter_idx').on(table.campaignId, table.promoterId),
  platformPostIdx: index('view_records_platform_post_idx').on(table.platform, table.contentId),
  botScoreIdx: index('view_records_bot_score_idx').on(table.botScore),
}));

export const trackingSessions = pgTable('tracking_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  promoterId: uuid('promoter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').references(() => campaignApplications.id, { onDelete: 'cascade' }),
  platform: socialPlatformEnum('platform').notNull(),
  contentId: varchar('content_id', { length: 255 }).notNull(),
  startTime: timestamp('start_time').defaultNow().notNull(),
  lastChecked: timestamp('last_checked').defaultNow().notNull(),
  totalViews: integer('total_views').notNull().default(0),
  legitimateViews: integer('legitimate_views').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  activeSessionsIdx: index('tracking_sessions_active_idx').on(table.isActive, table.lastChecked),
  campaignPromoterIdx: index('tracking_sessions_campaign_promoter_idx').on(table.campaignId, table.promoterId),
  platformPostIdx: index('tracking_sessions_platform_post_idx').on(table.platform, table.contentId),
}));

// Payment tables
export const payouts = pgTable('payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  promoterId: uuid('promoter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').notNull().references(() => campaignApplications.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  legitimateViews: integer('legitimate_views').notNull(),
  status: payoutStatusEnum('status').default('pending').notNull(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  payoutId: uuid('payout_id').notNull().references(() => payouts.id, { onDelete: 'cascade' }),
  transactionHash: varchar('transaction_hash', { length: 255 }).unique(),
  blockchainNetwork: varchar('blockchain_network', { length: 50 }).notNull(),
  toAddress: varchar('to_address', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  gasUsed: decimal('gas_used', { precision: 15, scale: 8 }),
  status: varchar('status', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at'),
});