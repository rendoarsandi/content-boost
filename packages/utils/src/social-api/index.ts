// Social Media API Integration with Rate Limiting
export { SocialMediaAPIManager } from './manager';
export { TikTokAPIClient } from './tiktok-client';
export { InstagramAPIClient } from './instagram-client';
export { RateLimiter } from './rate-limiter';
export { APIErrorHandler } from './error-handler';

export type {
  SocialMediaMetrics,
  APIClientConfig,
  RateLimitConfig,
  APIResponse,
  APIError,
  RetryConfig,
  SocialPlatform,
  MetricsCollectionResult,
  APIClientInterface
} from './types';

export {
  RATE_LIMIT_DEFAULTS,
  RETRY_DEFAULTS,
  API_ENDPOINTS
} from './constants';