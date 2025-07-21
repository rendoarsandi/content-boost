import * as Sentry from '@sentry/node';
import { appLogger } from './logging';

/**
 * Initialize Sentry for error tracking
 * @param dsn Sentry DSN
 * @param environment Environment name (production, staging, development)
 * @param release Release version
 */
export const initSentry = (
  dsn: string | undefined,
  environment: string = 'development',
  release: string = '1.0.0'
) => {
  if (!dsn) {
    appLogger.warn('Sentry DSN not provided, error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment,
      release,
      tracesSampleRate: environment === 'production' ? 0.2 : 1.0,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express(),
        new Sentry.Integrations.Postgres(),
      ],
    });

    appLogger.info('Sentry initialized successfully', { environment });
  } catch (error) {
    appLogger.error('Failed to initialize Sentry', { error });
  }
};

/**
 * Capture an exception in Sentry
 * @param error Error object
 * @param context Additional context
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
};

/**
 * Capture a message in Sentry
 * @param message Message to capture
 * @param level Severity level
 * @param context Additional context
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) => {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureMessage(message, level);
};

/**
 * Start a new transaction for performance monitoring
 * @param name Transaction name
 * @param op Operation type
 */
export const startTransaction = (name: string, op: string) => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

export default {
  initSentry,
  captureException,
  captureMessage,
  startTransaction,
};