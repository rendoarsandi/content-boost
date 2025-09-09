// logging.d.ts
import { Logger } from 'winston';

export const appLogger: Logger;
export const botLogger: Logger;
export function createServiceLogger(serviceName: string): Logger;
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}
export function logStructured(
  logger: any,
  level: LogLevel,
  message: string,
  data?: Record<string, any>
): void;

export default appLogger;
