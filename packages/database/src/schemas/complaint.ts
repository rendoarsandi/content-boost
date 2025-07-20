import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { users } from './user';

// Enums
export const complaintStatusEnum = pgEnum('complaint_status', ['open', 'in_progress', 'resolved', 'closed']);
export const complaintPriorityEnum = pgEnum('complaint_priority', ['low', 'medium', 'high']);

// Tables
export const complaints = pgTable('complaints', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description').notNull(),
  status: complaintStatusEnum('status').default('open').notNull(),
  priority: complaintPriorityEnum('priority').default('medium').notNull(),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const complaintsRelations = relations(complaints, ({ one }) => ({
  user: one(users, {
    fields: [complaints.userId],
    references: [users.id],
  }),
}));

// Validation schemas
export const ComplaintSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  subject: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).default('open'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  adminNotes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Complaint = z.infer<typeof ComplaintSchema>;