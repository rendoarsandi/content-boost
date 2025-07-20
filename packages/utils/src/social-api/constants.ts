import { RateLimitConfig, RetryConfig } from './types';

export const RATE_LIMIT_DEFAULTS: Record<string, RateLimitConfig> = {
  tiktok: {
    maxRequests: 100, // TikTok allows 100 requests per hour per app
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'tiktok_rate_limit'
  },
  instagram: {
    maxRequests: 200, // Instagram allows 200 requests per hour per user
    windowMs: 60 * 60 * 1000, // 1 hour  
    keyPrefix: 'instagram_rate_limit'
  }
};

export const RETRY_DEFAULTS: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2
};

export const API_ENDPOINTS = {
  tiktok: {
    base: 'https://open-api.tiktok.com',
    userInfo: '/v2/user/info/',
    videoList: '/v2/video/list/',
    videoQuery: '/v2/video/query/',
    videoStats: '/v2/video/query/'
  },
  instagram: {
    base: 'https://graph.instagram.com',
    userInfo: '/me',
    userMedia: '/me/media',
    mediaInsights: '/{media-id}/insights',
    userInsights: '/me/insights'
  }
};

export const ERROR_CODES = {
  RATE_LIMITED: 'RATE_LIMITED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export const HTTP_STATUS = {
  TOO_MANY_REQUESTS: 429,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;