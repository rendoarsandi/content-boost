import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || '1.0.0',

  // Adjust this value in production, or use tracesSampler for greater control
  replaysSessionSampleRate: 0.1,

  // Capture errors in development mode
  enabled: !!SENTRY_DSN,
});
