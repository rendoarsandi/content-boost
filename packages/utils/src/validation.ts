import { z } from 'zod';

// Common validation schemas
export const EmailSchema = z.string().email('Invalid email format');
export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');
export const URLSchema = z.string().url('Invalid URL format');
export const UUIDSchema = z.string().uuid('Invalid UUID format');

// Platform-specific schemas
export const PlatformSchema = z.enum(['tiktok', 'instagram'], {
  errorMap: () => ({ message: 'Platform must be either tiktok or instagram' })
});

export const UserRoleSchema = z.enum(['creator', 'promoter', 'admin'], {
  errorMap: () => ({ message: 'Role must be creator, promoter, or admin' })
});

export const CampaignStatusSchema = z.enum(['draft', 'active', 'paused', 'completed'], {
  errorMap: () => ({ message: 'Campaign status must be draft, active, paused, or completed' })
});

export const PayoutStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled'], {
  errorMap: () => ({ message: 'Payout status must be pending, processing, completed, failed, or cancelled' })
});

// User validation schemas
export const UserSchema = z.object({
  id: UUIDSchema,
  email: EmailSchema,
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  role: UserRoleSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

export const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true, updatedAt: true });

// Social account validation schemas
export const SocialAccountSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  platform: PlatformSchema,
  platformUserId: z.string().min(1, 'Platform user ID is required'),
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional()
});

// Campaign validation schemas
export const CampaignMaterialSchema = z.object({
  id: UUIDSchema,
  campaignId: UUIDSchema,
  type: z.enum(['google_drive', 'youtube', 'image', 'video'], {
    errorMap: () => ({ message: 'Material type must be google_drive, youtube, image, or video' })
  }),
  url: URLSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional()
});

export const CampaignSchema = z.object({
  id: UUIDSchema,
  creatorId: UUIDSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  budget: z.number().positive('Budget must be positive').max(1000000000, 'Budget too large'),
  ratePerView: z.number().positive('Rate per view must be positive').max(100000, 'Rate per view too large'),
  status: CampaignStatusSchema,
  requirements: z.array(z.string()).default([]),
  materials: z.array(CampaignMaterialSchema).default([]),
  startDate: z.date(),
  endDate: z.date(),
  createdAt: z.date(),
  updatedAt: z.date()
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate']
}).refine(data => data.budget >= data.ratePerView, {
  message: 'Budget must be at least equal to rate per view',
  path: ['budget']
});

export const CreateCampaignSchema = z.object({
  creatorId: UUIDSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  budget: z.number().positive('Budget must be positive').max(1000000000, 'Budget too large'),
  ratePerView: z.number().positive('Rate per view must be positive').max(100000, 'Rate per view too large'),
  status: CampaignStatusSchema,
  requirements: z.array(z.string()).default([]),
  materials: z.array(z.object({
    type: z.enum(['google_drive', 'youtube', 'image', 'video']),
    url: URLSchema,
    title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional()
  })).default([]),
  startDate: z.date(),
  endDate: z.date()
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate']
}).refine(data => data.budget >= data.ratePerView, {
  message: 'Budget must be at least equal to rate per view',
  path: ['budget']
});

// View record validation schemas
export const ViewRecordSchema = z.object({
  id: UUIDSchema,
  campaignId: UUIDSchema,
  promoterId: UUIDSchema,
  platform: PlatformSchema,
  platformPostId: z.string().min(1, 'Platform post ID is required'),
  viewCount: z.number().int().min(0, 'View count must be non-negative'),
  likeCount: z.number().int().min(0, 'Like count must be non-negative'),
  commentCount: z.number().int().min(0, 'Comment count must be non-negative'),
  shareCount: z.number().int().min(0, 'Share count must be non-negative'),
  botScore: z.number().int().min(0).max(100, 'Bot score must be between 0 and 100').default(0),
  isLegitimate: z.boolean().default(true),
  timestamp: z.date()
});

export const CreateViewRecordSchema = ViewRecordSchema.omit({ id: true });

// Payout validation schemas
export const PayoutSchema = z.object({
  id: UUIDSchema,
  promoterId: UUIDSchema,
  campaignId: UUIDSchema,
  periodStart: z.date(),
  periodEnd: z.date(),
  totalViews: z.number().int().min(0, 'Total views must be non-negative'),
  legitimateViews: z.number().int().min(0, 'Legitimate views must be non-negative'),
  ratePerView: z.number().positive('Rate per view must be positive'),
  grossAmount: z.number().min(0, 'Gross amount must be non-negative'),
  platformFee: z.number().min(0, 'Platform fee must be non-negative'),
  netAmount: z.number().min(0, 'Net amount must be non-negative'),
  status: PayoutStatusSchema,
  processedAt: z.date().optional(),
  failureReason: z.string().optional(),
  createdAt: z.date()
}).refine(data => data.periodEnd > data.periodStart, {
  message: 'Period end must be after period start',
  path: ['periodEnd']
}).refine(data => data.legitimateViews <= data.totalViews, {
  message: 'Legitimate views cannot exceed total views',
  path: ['legitimateViews']
}).refine(data => data.grossAmount >= data.platformFee, {
  message: 'Gross amount must be at least equal to platform fee',
  path: ['grossAmount']
});

// Bot detection validation schemas
export const BotDetectionConfigSchema = z.object({
  thresholds: z.object({
    viewLikeRatio: z.number().positive('View like ratio threshold must be positive'),
    viewCommentRatio: z.number().positive('View comment ratio threshold must be positive'),
    spikePercentage: z.number().positive('Spike percentage threshold must be positive'),
    spikeTimeWindow: z.number().positive('Spike time window must be positive')
  }),
  confidence: z.object({
    ban: z.number().min(0).max(100, 'Ban confidence must be between 0 and 100'),
    warning: z.number().min(0).max(100, 'Warning confidence must be between 0 and 100'),
    monitor: z.number().min(0).max(100, 'Monitor confidence must be between 0 and 100')
  })
}).refine(data => data.confidence.ban > data.confidence.warning, {
  message: 'Ban confidence must be higher than warning confidence',
  path: ['confidence', 'ban']
}).refine(data => data.confidence.warning > data.confidence.monitor, {
  message: 'Warning confidence must be higher than monitor confidence',
  path: ['confidence', 'warning']
});

// API request validation schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const DateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date()
}).refine(data => data.endDate >= data.startDate, {
  message: 'End date must be after or equal to start date',
  path: ['endDate']
});

// Validation utilities
export function validateEmail(email: string): boolean {
  return EmailSchema.safeParse(email).success;
}

export function validatePassword(password: string): boolean {
  return PasswordSchema.safeParse(password).success;
}

export function validateURL(url: string): boolean {
  return URLSchema.safeParse(url).success;
}

export function validateUUID(uuid: string): boolean {
  return UUIDSchema.safeParse(uuid).success;
}

export function validatePlatform(platform: string): boolean {
  return PlatformSchema.safeParse(platform).success;
}

export function validateUserRole(role: string): boolean {
  return UserRoleSchema.safeParse(role).success;
}

export function validateCampaignStatus(status: string): boolean {
  return CampaignStatusSchema.safeParse(status).success;
}

export function validatePayoutStatus(status: string): boolean {
  return PayoutStatusSchema.safeParse(status).success;
}

/**
 * Generic validation function with detailed error messages
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => {
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
    return `${path}${err.message}`;
  });
  
  return { success: false, errors };
}

/**
 * Validate and transform data, throwing error if invalid
 */
export function parseData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = validateData(schema, data);
  
  if (!result.success) {
    throw new Error(`Validation failed: ${result.errors?.join(', ')}`);
  }
  
  return result.data!;
}

/**
 * Create a validation middleware function for API routes
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    return parseData(schema, data);
  };
}