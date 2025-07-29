import { appLogger } from './logging';

// This is a mock Sentry client for use in the browser
// It logs to the console instead of sending to Sentry

export const initSentry = (
  dsn: string | undefined,
  environment: string = 'development',
  release: string = '1.0.0'
) => {
  if (!dsn) {
    appLogger.warn('Sentry DSN not provided, error tracking disabled');
    return;
  }
  appLogger.info('Sentry mock initialized for client', { environment, release });
};

export const captureException = (error: Error, context?: Record<string, any>) => {
  appLogger.error('Sentry mock: logging error locally', { error, context });
};

export const captureMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
) => {
  appLogger.warn('Sentry mock: logging message locally', { message, level, context });
};

export const startTransaction = (name: string, op: string) => {
  appLogger.debug('Sentry mock: transaction not started', { name, op });
  return null;
};

export default {
  initSentry,
  captureException,
  captureMessage,
  startTransaction,
};
