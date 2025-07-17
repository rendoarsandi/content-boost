import { z } from 'zod';

export const ViewRecordSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  promoterId: z.string().uuid(),
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
  platform: z.enum(['tiktok', 'instagram']),
  platformPostId: z.string(),
  startTime: z.date(),
  lastChecked: z.date(),
  totalViews: z.number().int().nonnegative(),
  legitimateViews: z.number().int().nonnegative(),
  isActive: z.boolean(),
});

export type ViewRecord = z.infer<typeof ViewRecordSchema>;
export type TrackingSession = z.infer<typeof TrackingSessionSchema>;