export const appLogger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  log: console.log,
};

export const botLogger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  log: console.log,
};

export const createServiceLogger = (serviceName: string) => {
  return {
    info: (...args: any[]) => console.log(`[${serviceName}]`, ...args),
    warn: (...args: any[]) => console.warn(`[${serviceName}]`, ...args),
    error: (...args: any[]) => console.error(`[${serviceName}]`, ...args),
    debug: (...args: any[]) => console.debug(`[${serviceName}]`, ...args),
    log: (...args: any[]) => console.log(`[${serviceName}]`, ...args),
  };
};

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export const logStructured = (
  logger: any,
  level: LogLevel,
  message: string,
  data?: Record<string, any>
) => {
  logger[level](message, data || {});
};

export default appLogger;
