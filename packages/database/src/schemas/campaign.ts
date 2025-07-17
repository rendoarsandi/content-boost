import { pgTable, uuid, varchar, text, decimal, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { users } from './user';

// Enums
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed']);
export const materialTypeEnum = pgEnum('material_type', ['google_drive', 'youtube', 'image', 'video']);
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'approved', 'rejected']);

// Tables
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
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
});

// Relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  creator: one(users, {
    fields: [campaigns.creatorId],
    references: [users.id],
  }),
  materials: many(campaignMaterials),
  applications: many(campaignApplications),
  viewRecords: many(viewRecords),
}));

export const campaignMaterialsRelations = relations(campaignMaterials, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignMaterials.campaignId],
    references: [campaigns.id],
  }),
}));

export const campaignApplicationsRelations = relations(campaignApplications, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [campaignApplications.campaignId],
    references: [campaigns.id],
  }),
  promoter: one(users, {
    fields: [campaignApplications.promoterId],
    references: [users.id],
  }),
  viewRecords: many(viewRecords),
  payouts: many(payouts),
}));

// Validation schemas
export const CampaignSchema = z.object({
  id: z.string().uuid(),
  creatorId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  budget: z.number().positive(),
  ratePerView: z.number().positive(),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  requirements: z.array(z.string()),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CampaignMaterialSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  type: z.enum(['google_drive', 'youtube', 'image', 'video']),
  url: z.string().url(),
  title: z.string(),
  description: z.string().optional(),
  createdAt: z.date(),
});

export const CampaignApplicationSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  promoterId: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'rejected']),
  submittedContent: z.string().optional(),
  trackingLink: z.string(),
  appliedAt: z.date(),
  reviewedAt: z.date().optional(),
});

export type Campaign = z.infer<typeof CampaignSchema>;
export type CampaignMaterial = z.infer<typeof CampaignMaterialSchema>;
export type CampaignApplication = z.infer<typeof CampaignApplicationSchema>;

// Import forward declarations for relations
import { viewRecords } from './tracking';
import { payouts } from './payment';