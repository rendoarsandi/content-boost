import { createLogger, format, transports } from 'winston';
import { join } from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs', 'app');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Bot detection logs directory
const botLogsDir = join(process.cwd(), 'logs', 'bot-detection');
if (!fs.existsSync(botLogsDir)) {
  fs.mkdirSync(botLogsDir, { recursive: true });
}

// Get current date for log file naming
const getCurrentDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Create formatters
const commonFormat = format.combine(
  format.timestamp(),
  format.json(),
  format.errors({ stack: true })
);

// Create the application logger
const appLogger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: commonFormat,
  defaultMeta: { service: 'creator-platform' },
  transports: [
    // Console transport
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, service, ...meta }) => {
          return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
    }),
    // File transport with daily rotation
    new transports.File({
      filename: join(logsDir, `${getCurrentDate()}.log`),
      maxsize: 10485760, // 10MB
      maxFiles: 14, // Keep logs for 14 days
    }),
  ],
});

// Create the bot detection logger
const botLogger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: commonFormat,
  defaultMeta: { service: 'bot-detection' },
  transports: [
    // Console transport
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, service, ...meta }) => {
          return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
    }),
    // File transport with daily rotation
    new transports.File({
      filename: join(botLogsDir, `${getCurrentDate()}.log`),
      maxsize: 10485760, // 10MB
      maxFiles: 30, // Keep bot logs for 30 days
    }),
  ],
});

// Create a logger factory for different services
const createServiceLogger = (serviceName: string) => {
  return appLogger.child({ service: serviceName });
};

// Helper function to log structured data
const logStructured = (
  logger: any,
  level: any,
  message: string,
  data?: Record<string, any>
) => {
  logger.log(level, message, data || {});
};
