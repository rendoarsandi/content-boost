// Cron Job Scheduler for Background Workers
export interface CronJob {
  id: string;
  name: string;
  schedule: string; // cron expression or interval in ms
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
  lastError?: string;
}

export interface CronSchedulerConfig {
  timezone?: string;
  maxConcurrentJobs?: number;
  errorRetryDelay?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// Simple cron expression parser for basic patterns
export class CronParser {
  static parseInterval(schedule: string): number | null {
    // Handle simple interval patterns like "1m", "30s", "1h"
    const intervalMatch = schedule.match(/^(\d+)(s|m|h)$/);
    if (intervalMatch) {
      const value = parseInt(intervalMatch[1]);
      const unit = intervalMatch[2];

      switch (unit) {
        case 's':
          return value * 1000;
        case 'm':
          return value * 60 * 1000;
        case 'h':
          return value * 60 * 60 * 1000;
        default:
          return null;
      }
    }

    // Handle millisecond intervals
    const msMatch = schedule.match(/^(\d+)ms$/);
    if (msMatch) {
      return parseInt(msMatch[1]);
    }

    return null;
  }

  static getNextRunTime(schedule: string, lastRun?: Date): Date {
    const interval = this.parseInterval(schedule);
    if (interval) {
      const baseTime = lastRun || new Date();
      return new Date(baseTime.getTime() + interval);
    }

    // For more complex cron expressions, we'd need a full cron parser
    // For now, default to 1 minute interval
    const baseTime = lastRun || new Date();
    return new Date(baseTime.getTime() + 60000);
  }
}

export class CronScheduler {
  private jobs: Map<string, CronJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private config: CronSchedulerConfig;
  private isRunning: boolean = false;
  private runningJobs: Set<string> = new Set();

  constructor(config: CronSchedulerConfig = {}) {
    this.config = {
      timezone: 'UTC',
      maxConcurrentJobs: 10,
      errorRetryDelay: 5000,
      logLevel: 'info',
      ...config,
    };
  }

  // Add a new cron job
  addJob(job: Omit<CronJob, 'runCount' | 'errorCount'>): void {
    const fullJob: CronJob = {
      ...job,
      runCount: 0,
      errorCount: 0,
      nextRun: CronParser.getNextRunTime(job.schedule),
    };

    this.jobs.set(job.id, fullJob);

    if (this.isRunning && job.enabled) {
      this.scheduleJob(fullJob);
    }

    this.log(
      'info',
      `Added cron job: ${job.name} (${job.id}) with schedule: ${job.schedule}`
    );
  }

  // Remove a cron job
  removeJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    // Clear timer if exists
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }

    // Remove from running jobs
    this.runningJobs.delete(jobId);

    // Remove job
    this.jobs.delete(jobId);

    this.log('info', `Removed cron job: ${job.name} (${jobId})`);
    return true;
  }

  // Enable/disable a job
  toggleJob(jobId: string, enabled: boolean): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    job.enabled = enabled;

    if (this.isRunning) {
      if (enabled) {
        this.scheduleJob(job);
      } else {
        const timer = this.timers.get(jobId);
        if (timer) {
          clearTimeout(timer);
          this.timers.delete(jobId);
        }
      }
    }

    this.log(
      'info',
      `${enabled ? 'Enabled' : 'Disabled'} cron job: ${job.name} (${jobId})`
    );
    return true;
  }

  // Start the scheduler
  start(): void {
    if (this.isRunning) {
      this.log('warn', 'Cron scheduler is already running');
      return;
    }

    this.isRunning = true;
    this.log('info', 'Starting cron scheduler');

    // Schedule all enabled jobs
    for (const job of this.jobs.values()) {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }
  }

  // Stop the scheduler
  stop(): void {
    if (!this.isRunning) {
      this.log('warn', 'Cron scheduler is not running');
      return;
    }

    this.isRunning = false;
    this.log('info', 'Stopping cron scheduler');

    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // Wait for running jobs to complete (optional)
    this.log(
      'info',
      `Waiting for ${this.runningJobs.size} running jobs to complete`
    );
  }

  // Schedule a specific job
  private scheduleJob(job: CronJob): void {
    // Clear existing timer if any
    const existingTimer = this.timers.get(job.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Calculate delay until next run
    const now = new Date();
    const nextRun =
      job.nextRun || CronParser.getNextRunTime(job.schedule, job.lastRun);
    const delay = Math.max(0, nextRun.getTime() - now.getTime());

    // Schedule the job
    const timer = setTimeout(async () => {
      await this.executeJob(job);
    }, delay);

    this.timers.set(job.id, timer);
    job.nextRun = nextRun;

    this.log('debug', `Scheduled job ${job.name} to run in ${delay}ms`);
  }

  // Execute a job
  private async executeJob(job: CronJob): Promise<void> {
    if (!this.isRunning || !job.enabled) {
      return;
    }

    // Check concurrent job limit
    if (this.runningJobs.size >= this.config.maxConcurrentJobs!) {
      this.log(
        'warn',
        `Skipping job ${job.name} - concurrent job limit reached`
      );
      this.scheduleJob(job); // Reschedule for next run
      return;
    }

    this.runningJobs.add(job.id);
    job.lastRun = new Date();
    job.runCount++;

    this.log('info', `Executing job: ${job.name} (run #${job.runCount})`);

    try {
      await job.handler();
      this.log('info', `Job completed successfully: ${job.name}`);
    } catch (error) {
      job.errorCount++;
      job.lastError = error instanceof Error ? error.message : 'Unknown error';

      this.log('error', `Job failed: ${job.name} - ${job.lastError}`);

      // Optional: implement retry logic here
      if (job.errorCount <= 3) {
        this.log(
          'info',
          `Scheduling retry for job: ${job.name} in ${this.config.errorRetryDelay}ms`
        );
        setTimeout(() => {
          if (this.isRunning && job.enabled) {
            this.executeJob(job);
          }
        }, this.config.errorRetryDelay);
      }
    } finally {
      this.runningJobs.delete(job.id);

      // Schedule next run
      if (this.isRunning && job.enabled) {
        this.scheduleJob(job);
      }
    }
  }

  // Get job status
  getJob(jobId: string): CronJob | undefined {
    return this.jobs.get(jobId);
  }

  // Get all jobs
  getAllJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  // Get scheduler stats
  getStats(): {
    totalJobs: number;
    enabledJobs: number;
    runningJobs: number;
    totalRuns: number;
    totalErrors: number;
  } {
    const jobs = Array.from(this.jobs.values());

    return {
      totalJobs: jobs.length,
      enabledJobs: jobs.filter(job => job.enabled).length,
      runningJobs: this.runningJobs.size,
      totalRuns: jobs.reduce((sum, job) => sum + job.runCount, 0),
      totalErrors: jobs.reduce((sum, job) => sum + job.errorCount, 0),
    };
  }

  // Check if scheduler is healthy
  isHealthy(): boolean {
    return this.isRunning;
  }

  // Logging utility
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string
  ): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel || 'info');
    const messageLevel = levels.indexOf(level);

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      console[level](`[${timestamp}] [CronScheduler] ${message}`);
    }
  }

  // Manual job execution (for testing)
  async executeJobManually(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    this.log('info', `Manually executing job: ${job.name}`);
    await this.executeJob(job);
    return true;
  }

  // Update job schedule
  updateJobSchedule(jobId: string, newSchedule: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    job.schedule = newSchedule;
    job.nextRun = CronParser.getNextRunTime(newSchedule, job.lastRun);

    // Reschedule if running and enabled
    if (this.isRunning && job.enabled) {
      this.scheduleJob(job);
    }

    this.log('info', `Updated schedule for job ${job.name}: ${newSchedule}`);
    return true;
  }
}

// Predefined job schedules
export const SCHEDULES = {
  EVERY_MINUTE: '1m',
  EVERY_5_MINUTES: '5m',
  EVERY_15_MINUTES: '15m',
  EVERY_30_MINUTES: '30m',
  EVERY_HOUR: '1h',
  EVERY_2_HOURS: '2h',
  EVERY_6_HOURS: '6h',
  EVERY_12_HOURS: '12h',
  EVERY_DAY: '24h',
} as const;

// Export factory function
export const createCronScheduler = (config?: CronSchedulerConfig) => {
  return new CronScheduler(config);
};
