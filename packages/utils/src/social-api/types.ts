export type SocialPlatform = 'tiktok' | 'instagram';

export interface SocialMediaMetrics {
  platform: SocialPlatform;
  postId: string;
  userId: string;
  campaignId: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  timestamp: Date;
  isValid: boolean;
}

export interface APIClientConfig {
  accessToken: string;
  userId: string;
  platform: SocialPlatform;
  rateLimitConfig?: RateLimitConfig;
  retryConfig?: RetryConfig;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  rateLimitInfo?: {
    remaining: number;
    resetTime: Date;
  };
}

export interface APIError {
  code: string;
  message: string;
  statusCode?: number;
  retryAfter?: number;
  details?: any;
}

export interface MetricsCollectionResult {
  success: boolean;
  metrics?: SocialMediaMetrics;
  error?: APIError;
  rateLimited: boolean;
  retryAfter?: number;
}

export interface APIClientInterface {
  platform: SocialPlatform;
  getUserMetrics(postId: string): Promise<APIResponse<SocialMediaMetrics>>;
  getPostMetrics(postId: string): Promise<APIResponse<SocialMediaMetrics>>;
  validateToken(): Promise<boolean>;
  refreshToken?(): Promise<boolean>;
}

export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isValid: boolean;
}

export interface RateLimitStatus {
  platform: SocialPlatform;
  userId: string;
  remaining: number;
  resetTime: Date;
  isLimited: boolean;
}