import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// Enums
export const userRoleEnum = pgEnum('user_role', ['creator', 'promoter', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'banned']);
export const socialPlatformEnum = pgEnum('social_platform', ['tiktok', 'instagram']);

// Tables
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  socialAccounts: many(socialAccounts),
  campaigns: many(campaigns),
  campaignApplications: many(campaignApplications),
  viewRecords: many(viewRecords),
  payouts: many(payouts),
}));

export const socialAccountsRelations = relations(socialAccounts, ({ one }) => ({
  user: one(users, {
    fields: [socialAccounts.userId],
    references: [users.id],
  }),
}));

// Validation schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().optional(),
  role: z.enum(['creator', 'promoter', 'admin']),
  status: z.enum(['active', 'banned']).default('active'),
  lastActive: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SocialAccountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  platform: z.enum(['tiktok', 'instagram']),
  platformUserId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;
export type SocialAccount = z.infer<typeof SocialAccountSchema>;

// Import forward declarations for relations
import { campaigns } from './campaign';
import { campaignApplications } from './campaign';
import { viewRecords } from './tracking';
import { payouts } from './payment';