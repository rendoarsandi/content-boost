import { appLogger } from './logging';

// Conditional Sentry import - not available in Edge Runtime
const getSentry = () => {
  if (
    typeof process !== 'undefined' &&
    typeof require !== 'undefined' &&
    process.env.NEXT_RUNTIME !== 'edge'
  ) {
    try {
      return require('@sentry/node');
    } catch {
      return null;
    }
  }
  return null;
};

const Sentry = getSentry();

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
  if (!dsn || !Sentry) {
    appLogger.warn(
      'Sentry DSN not provided or Sentry not available, error tracking disabled'
    );
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
export const captureException = (
  error: Error,
  context?: Record<string, any>
) => {
  if (!Sentry) {
    appLogger.error('Sentry not available, logging error locally', {
      error,
      context,
    });
    return;
  }

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
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
) => {
  if (!Sentry) {
    appLogger.warn('Sentry not available, logging message locally', {
      message,
      level,
      context,
    });
    return;
  }

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
  if (!Sentry) {
    appLogger.debug('Sentry not available, transaction not started', {
      name,
      op,
    });
    return null;
  }

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
