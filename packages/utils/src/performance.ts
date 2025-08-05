const { appLogger, LogLevel } =
  typeof window === 'undefined'
    ? require('./logging')
    : require('./logging.client');

// Use browser performance API or Node.js perf_hooks or fallback
const getPerformance = () => {
  // Browser environment
  if (typeof window !== 'undefined' && window.performance) {
    return window.performance;
  }

  // Node.js environment (but not Edge Runtime)
  if (typeof process !== 'undefined' && typeof require !== 'undefined') {
    try {
      // Only use perf_hooks if we're not in Edge Runtime
      if (process.env.NEXT_RUNTIME !== 'edge') {
        const { performance } = require('perf_hooks');
        return performance;
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback for Edge Runtime and other environments
  return { now: () => Date.now() };
};

const performance = getPerformance();

let Sentry: any = null;

const initializeSentry = async () => {
  if (
    typeof process !== 'undefined' &&
    typeof window === 'undefined' && // Ensure it's a Node.js environment
    process.env.NEXT_RUNTIME !== 'edge'
  ) {
    try {
      Sentry = await import('@sentry/node');
    } catch (e) {
      appLogger.error('Failed to dynamically import Sentry', e);
      Sentry = null;
    }
  }
};

// Initialize Sentry on module load in a server environment
initializeSentry();

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private metrics: Map<string, { start: number; measurements: number[] }> =
    new Map();
  private thresholds: Map<string, number> = new Map();

  /**
   * Start measuring performance for a specific operation
   * @param name Operation name
   */
  startMeasure(name: string): void {
    this.metrics.set(name, {
      start: performance.now(),
      measurements: [],
    });
  }

  /**
   * End measuring performance for a specific operation
   * @param name Operation name
   * @param logLevel Log level for the measurement
   * @returns Duration in milliseconds
   */
  endMeasure(name: string, logLevel: typeof LogLevel = LogLevel.DEBUG): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      appLogger.warn(`No performance measurement started for: ${name}`);
      return 0;
    }

    const duration = performance.now() - metric.start;
    metric.measurements.push(duration);

    // Log the measurement
    appLogger.log(logLevel, `Performance: ${name}`, {
      durationMs: duration.toFixed(2),
      operation: name,
    });

    // Check if duration exceeds threshold
    const threshold = this.thresholds.get(name);
    if (threshold && duration > threshold) {
      appLogger.warn(`Performance threshold exceeded for ${name}`, {
        durationMs: duration.toFixed(2),
        thresholdMs: threshold,
        operation: name,
      });

      // Send to Sentry if available
      if (Sentry) {
        try {
          Sentry.captureMessage(
            `Performance threshold exceeded for ${name}`,
            'warning'
          );
          Sentry.setContext('performance', {
            operation: name,
            durationMs: duration.toFixed(2),
            thresholdMs: threshold,
          });
        } catch (e) {
          // Sentry might not be initialized
        }
      }
    }

    return duration;
  }

  /**
   * Set a performance threshold for an operation
   * @param name Operation name
   * @param thresholdMs Threshold in milliseconds
   */
  setThreshold(name: string, thresholdMs: number): void {
    this.thresholds.set(name, thresholdMs);
  }

  /**
   * Get statistics for a specific operation
   * @param name Operation name
   */
  getStats(
    name: string
  ): { avg: number; min: number; max: number; count: number } | null {
    const metric = this.metrics.get(name);
    if (!metric || metric.measurements.length === 0) {
      return null;
    }

    const measurements = metric.measurements;
    const sum = measurements.reduce((a, b) => a + b, 0);

    return {
      avg: sum / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      count: measurements.length,
    };
  }

  /**
   * Reset measurements for a specific operation
   * @param name Operation name
   */
  reset(name: string): void {
    this.metrics.delete(name);
  }

  /**
   * Reset all measurements
   */
  resetAll(): void {
    this.metrics.clear();
  }
}

// Create a singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring method performance
 * @param threshold Optional threshold in milliseconds
 */
export function measure(threshold?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const operationName = `${target.constructor.name}.${propertyKey}`;

      if (threshold) {
        performanceMonitor.setThreshold(operationName, threshold);
      }

      performanceMonitor.startMeasure(operationName);

      try {
        const result = originalMethod.apply(this, args);

        // Handle promises
        if (result instanceof Promise) {
          return result.finally(() => {
            performanceMonitor.endMeasure(operationName);
          });
        }

        performanceMonitor.endMeasure(operationName);
        return result;
      } catch (error) {
        performanceMonitor.endMeasure(operationName);
        throw error;
      }
    };

    return descriptor;
  };
}

export default performanceMonitor;
