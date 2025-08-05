export * from './process';

// Environment configuration
export interface EnvironmentConfig {
  // Database
  DATABASE_URL: string;
  REDIS_URL: string;

  // Authentication
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;

  // Social Media APIs
  TIKTOK_CLIENT_ID: string;
  TIKTOK_CLIENT_SECRET: string;
  INSTAGRAM_CLIENT_ID: string;
  INSTAGRAM_CLIENT_SECRET: string;

  // Platform
  PLATFORM_FEE_PERCENTAGE: number;
  BOT_DETECTION_ENABLED: boolean;

  // Monitoring
  SENTRY_DSN?: string;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

export const getEnvironmentConfig = (): Partial<EnvironmentConfig> => {
  return {
    DATABASE_URL: process.env.DATABASE_URL || '',
    REDIS_URL: process.env.REDIS_URL || '',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
    TIKTOK_CLIENT_ID: process.env.TIKTOK_CLIENT_ID || '',
    TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET || '',
    INSTAGRAM_CLIENT_ID: process.env.INSTAGRAM_CLIENT_ID || '',
    INSTAGRAM_CLIENT_SECRET: process.env.INSTAGRAM_CLIENT_SECRET || '',
    PLATFORM_FEE_PERCENTAGE: Number(process.env.PLATFORM_FEE_PERCENTAGE) || 5,
    BOT_DETECTION_ENABLED: process.env.BOT_DETECTION_ENABLED === 'true',
    SENTRY_DSN: process.env.SENTRY_DSN,
    LOG_LEVEL: (process.env.LOG_LEVEL as any) || 'info',
  };
};
