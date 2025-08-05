const { appLogger, botLogger, LogLevel } =
  typeof window === 'undefined'
    ? require('./logging')
    : require('./logging.client');

const Sentry =
  typeof window === 'undefined'
    ? require('./sentry')
    : require('./sentry.client');
const { captureMessage } = Sentry;

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Alert categories
 */
export enum AlertCategory {
  BOT_DETECTION = 'bot_detection',
  PAYMENT = 'payment',
  API = 'api',
  DATABASE = 'database',
  SECURITY = 'security',
  SYSTEM = 'system',
}

/**
 * Alert interface
 */
export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * In-memory alert storage
 * In a production environment, this would be stored in a database
 */
const alerts: Alert[] = [];

/**
 * Create a new alert
 * @param severity Alert severity
 * @param category Alert category
 * @param message Alert message
 * @param details Additional details
 * @returns The created alert
 */
export function createAlert(
  severity: AlertSeverity,
  category: AlertCategory,
  message: string,
  details?: Record<string, any>
): Alert {
  const alert: Alert = {
    id: crypto.randomUUID(),
    severity,
    category,
    message,
    details,
    timestamp: new Date(),
    resolved: false,
  };

  // Store the alert
  alerts.push(alert);

  // Log the alert
  const logLevel = getLogLevelForSeverity(severity);

  if (category === AlertCategory.BOT_DETECTION) {
    botLogger.log(logLevel, `ALERT: ${message}`, {
      alertId: alert.id,
      severity,
      category,
      ...details,
    });
  } else {
    appLogger.log(logLevel, `ALERT: ${message}`, {
      alertId: alert.id,
      severity,
      category,
      ...details,
    });
  }

  // Send to Sentry if critical or high
  if (severity === AlertSeverity.CRITICAL || severity === AlertSeverity.HIGH) {
    captureMessage(
      `ALERT: ${message}`,
      severity === AlertSeverity.CRITICAL ? 'fatal' : 'error',
      {
        alertId: alert.id,
        category,
        ...details,
      }
    );
  }

  return alert;
}

/**
 * Resolve an alert
 * @param alertId Alert ID
 * @returns The resolved alert or undefined if not found
 */
export function resolveAlert(alertId: string): Alert | undefined {
  const alert = alerts.find(a => a.id === alertId);

  if (alert && !alert.resolved) {
    alert.resolved = true;
    alert.resolvedAt = new Date();

    appLogger.info(`Alert resolved: ${alert.message}`, {
      alertId: alert.id,
      severity: alert.severity,
      category: alert.category,
    });
  }

  return alert;
}

/**
 * Get all active alerts
 * @param category Optional category filter
 * @param severity Optional severity filter
 * @returns Array of active alerts
 */
export function getActiveAlerts(
  category?: AlertCategory,
  severity?: AlertSeverity
): Alert[] {
  return alerts.filter(
    alert =>
      !alert.resolved &&
      (!category || alert.category === category) &&
      (!severity || alert.severity === severity)
  );
}

/**
 * Get all alerts (active and resolved)
 * @param category Optional category filter
 * @param severity Optional severity filter
 * @returns Array of all alerts
 */
export function getAllAlerts(
  category?: AlertCategory,
  severity?: AlertSeverity
): Alert[] {
  return alerts.filter(
    alert =>
      (!category || alert.category === category) &&
      (!severity || alert.severity === severity)
  );
}

/**
 * Map alert severity to log level
 * @param severity Alert severity
 * @returns Corresponding log level
 */
function getLogLevelForSeverity(severity: AlertSeverity): typeof LogLevel {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return LogLevel.ERROR;
    case AlertSeverity.HIGH:
      return LogLevel.ERROR;
    case AlertSeverity.MEDIUM:
      return LogLevel.WARN;
    case AlertSeverity.LOW:
      return LogLevel.INFO;
    default:
      return LogLevel.INFO;
  }
}

export default {
  createAlert,
  resolveAlert,
  getActiveAlerts,
  getAllAlerts,
  AlertSeverity,
  AlertCategory,
};
