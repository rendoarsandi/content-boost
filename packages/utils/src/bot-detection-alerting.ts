import { BotAnalysis } from './bot-detection';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Simple Bot Detection Alerting and Monitoring System
 * Requirements: 5.5, 5.6, 5.7, 10.3, 10.4
 */

export interface AlertConfig {
  enabled: boolean;
  logPath: string;
  reportPath: string;
  thresholds: {
    critical: number; // 90%
    warning: number; // 50%
    monitor: number; // 20%
  };
  notifications: {
    email: boolean;
    dashboard: boolean;
    webhook: boolean;
  };
}

export interface AlertNotification {
  id: string;
  timestamp: Date;
  type: 'BAN' | 'WARNING' | 'MONITOR' | 'INFO';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  promoterId: string;
  campaignId: string;
  botScore: number;
  action: string;
  reason: string;
  channels: string[];
}

export interface DailyReport {
  date: string;
  totalAnalyses: number;
  botDetections: {
    banned: number;
    warned: number;
    monitored: number;
    clean: number;
  };
  averageBotScore: number;
  alerts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Bot Detection Alerting System
 * Implements core monitoring and alerting functionality
 */
export class BotDetectionAlerting {
  private config: AlertConfig;
  private notifications: AlertNotification[] = [];
  private dailyStats: Map<string, DailyReport> = new Map();

  constructor(config?: Partial<AlertConfig>) {
    this.config = {
      enabled: true,
      logPath: 'logs/bot-detection/',
      reportPath: 'reports/bot-detection/',
      thresholds: {
        critical: 90,
        warning: 50,
        monitor: 20
      },
      notifications: {
        email: true,
        dashboard: true,
        webhook: true
      },
      ...config
    };

    this.ensureDirectories();
  }

  /**
   * Process bot detection analysis and generate alerts
   * Requirements: 5.5, 5.6, 5.7 - Warning system, notifications, monitoring
   */
  async processAnalysis(
    promoterId: string,
    campaignId: string,
    analysis: BotAnalysis
  ): Promise<void> {
    try {
      // Log the analysis
      await this.logAnalysis(promoterId, campaignId, analysis);

      // Generate notification if needed
      const notification = this.generateNotification(promoterId, campaignId, analysis);
      if (notification) {
        await this.sendNotification(notification);
      }

      // Update daily statistics
      this.updateDailyStats(analysis);

      console.log(`✅ Processed analysis for promoter ${promoterId}, campaign ${campaignId}`);
      console.log(`   Bot Score: ${analysis.botScore}%, Action: ${analysis.action.toUpperCase()}`);

    } catch (error) {
      await this.logError('processAnalysis', error as Error, { promoterId, campaignId });
    }
  }

  /**
   * Generate notification based on analysis
   * Requirement 5.5: Warning system untuk suspicious activity
   * Requirement 5.6: Notification system untuk promoters dan admins
   */
  private generateNotification(
    promoterId: string,
    campaignId: string,
    analysis: BotAnalysis
  ): AlertNotification | null {
    if (!this.config.enabled) return null;

    let type: AlertNotification['type'] = 'INFO';
    let severity: AlertNotification['severity'] = 'LOW';
    let channels: string[] = [];

    // Determine notification type and severity based on bot score
    if (analysis.botScore >= this.config.thresholds.critical) {
      type = 'BAN';
      severity = 'CRITICAL';
      channels = ['email', 'dashboard', 'webhook'];
    } else if (analysis.botScore >= this.config.thresholds.warning) {
      type = 'WARNING';
      severity = 'HIGH';
      channels = ['email', 'dashboard'];
    } else if (analysis.botScore >= this.config.thresholds.monitor) {
      type = 'MONITOR';
      severity = 'MEDIUM';
      channels = ['dashboard'];
    } else {
      return null; // No notification needed for clean activity
    }

    const notification: AlertNotification = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      severity,
      promoterId,
      campaignId,
      botScore: analysis.botScore,
      action: analysis.action,
      reason: analysis.reason,
      channels
    };

    return notification;
  }

  /**
   * Send notification through configured channels
   */
  private async sendNotification(notification: AlertNotification): Promise<void> {
    this.notifications.push(notification);

    // Log notification
    await this.logNotification(notification);

    // Send through each channel
    for (const channel of notification.channels) {
      await this.sendThroughChannel(channel, notification);
    }

    console.log(`🚨 ${notification.severity} Alert: ${notification.type} for promoter ${notification.promoterId}`);
    console.log(`   Bot Score: ${notification.botScore}%, Reason: ${notification.reason}`);
  }

  /**
   * Send notification through specific channel
   */
  private async sendThroughChannel(
    channel: string,
    notification: AlertNotification
  ): Promise<void> {
    const channelLog = {
      timestamp: new Date().toISOString(),
      channel,
      notificationId: notification.id,
      type: notification.type,
      severity: notification.severity,
      promoterId: notification.promoterId,
      campaignId: notification.campaignId,
      success: true
    };

    try {
      switch (channel) {
        case 'email':
          console.log(`📧 EMAIL: ${notification.type} alert for promoter ${notification.promoterId}`);
          break;
        case 'dashboard':
          console.log(`📊 DASHBOARD: ${notification.type} alert displayed`);
          break;
        case 'webhook':
          console.log(`🔗 WEBHOOK: ${notification.type} alert sent`);
          break;
        default:
          console.warn(`Unknown notification channel: ${channel}`);
      }

      await this.logChannelActivity(channel, channelLog);

    } catch (error) {
      channelLog.success = false;
      await this.logChannelActivity(channel, { ...channelLog, error: (error as Error).message });
    }
  }

  /**
   * Update daily statistics
   */
  private updateDailyStats(analysis: BotAnalysis): void {
    const today = new Date().toISOString().split('T')[0];
    
    if (!this.dailyStats.has(today)) {
      this.dailyStats.set(today, {
        date: today,
        totalAnalyses: 0,
        botDetections: {
          banned: 0,
          warned: 0,
          monitored: 0,
          clean: 0
        },
        averageBotScore: 0,
        alerts: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      });
    }

    const stats = this.dailyStats.get(today)!;
    stats.totalAnalyses++;

    // Update bot detections
    switch (analysis.action) {
      case 'ban':
        stats.botDetections.banned++;
        break;
      case 'warning':
        stats.botDetections.warned++;
        break;
      case 'monitor':
        stats.botDetections.monitored++;
        break;
      default:
        stats.botDetections.clean++;
    }

    // Update average bot score
    stats.averageBotScore = (
      (stats.averageBotScore * (stats.totalAnalyses - 1)) + analysis.botScore
    ) / stats.totalAnalyses;

    // Update alert counts
    if (analysis.botScore >= this.config.thresholds.critical) {
      stats.alerts.critical++;
    } else if (analysis.botScore >= this.config.thresholds.warning) {
      stats.alerts.high++;
    } else if (analysis.botScore >= this.config.thresholds.monitor) {
      stats.alerts.medium++;
    } else {
      stats.alerts.low++;
    }
  }

  /**
   * Generate daily summary report
   * Requirement 10.3: Summary files di reports/bot-detection/
   */
  async generateDailySummary(date?: Date): Promise<DailyReport> {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];
    
    const report = this.dailyStats.get(dateStr) || {
      date: dateStr,
      totalAnalyses: 0,
      botDetections: {
        banned: 0,
        warned: 0,
        monitored: 0,
        clean: 0
      },
      averageBotScore: 0,
      alerts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    // Save report to file
    await this.saveDailyReport(report);

    console.log(`📋 Daily Summary Generated for ${dateStr}:`);
    console.log(`   Total Analyses: ${report.totalAnalyses}`);
    console.log(`   Bot Detections: ${JSON.stringify(report.botDetections)}`);
    console.log(`   Average Bot Score: ${report.averageBotScore.toFixed(2)}%`);

    return report;
  }

  /**
   * Save daily report to file
   */
  private async saveDailyReport(report: DailyReport): Promise<void> {
    try {
      // Save as JSON
      const jsonFile = path.join(this.config.reportPath, `daily-summary-${report.date}.json`);
      await fs.promises.writeFile(jsonFile, JSON.stringify(report, null, 2), 'utf8');

      // Save as HTML
      const htmlFile = path.join(this.config.reportPath, `daily-summary-${report.date}.html`);
      const htmlContent = this.generateReportHTML(report);
      await fs.promises.writeFile(htmlFile, htmlContent, 'utf8');

    } catch (error) {
      console.error(`Failed to save daily report: ${error}`);
    }
  }

  /**
   * Generate HTML report
   */
  private generateReportHTML(report: DailyReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Bot Detection Daily Summary - ${report.date}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background-color: #e9e9e9; border-radius: 5px; }
        .critical { color: #d32f2f; }
        .high { color: #f57c00; }
        .medium { color: #fbc02d; }
        .low { color: #388e3c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Bot Detection Daily Summary</h1>
        <h2>Date: ${report.date}</h2>
    </div>

    <div class="metrics">
        <div class="metric">
            <h3>Total Analyses</h3>
            <p>${report.totalAnalyses}</p>
        </div>
        <div class="metric">
            <h3>Bot Detections</h3>
            <p>Banned: ${report.botDetections.banned}</p>
            <p>Warned: ${report.botDetections.warned}</p>
            <p>Monitored: ${report.botDetections.monitored}</p>
            <p>Clean: ${report.botDetections.clean}</p>
        </div>
        <div class="metric">
            <h3>Average Bot Score</h3>
            <p>${report.averageBotScore.toFixed(2)}%</p>
        </div>
    </div>

    <h3>Alerts Summary</h3>
    <div class="metrics">
        <div class="metric critical">Critical: ${report.alerts.critical}</div>
        <div class="metric high">High: ${report.alerts.high}</div>
        <div class="metric medium">Medium: ${report.alerts.medium}</div>
        <div class="metric low">Low: ${report.alerts.low}</div>
    </div>

    <footer>
        <p>Generated on: ${new Date().toISOString()}</p>
    </footer>
</body>
</html>
    `;
  }

  /**
   * Logging methods
   * Requirement 10.4: Audit trail logging di logs/bot-detection/
   */
  private async logAnalysis(promoterId: string, campaignId: string, analysis: BotAnalysis): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'bot_analysis',
      promoterId,
      campaignId,
      botScore: analysis.botScore,
      action: analysis.action,
      reason: analysis.reason,
      metrics: {
        totalViews: analysis.metrics.totalViews,
        totalLikes: analysis.metrics.totalLikes,
        totalComments: analysis.metrics.totalComments,
        viewLikeRatio: analysis.metrics.viewLikeRatio,
        viewCommentRatio: analysis.metrics.viewCommentRatio,
        spikeDetected: analysis.metrics.spikeDetected
      }
    };

    await this.writeLog('analysis', logEntry);
  }

  private async logNotification(notification: AlertNotification): Promise<void> {
    const logEntry = {
      timestamp: notification.timestamp.toISOString(),
      level: 'info',
      event: 'notification_sent',
      notificationId: notification.id,
      type: notification.type,
      severity: notification.severity,
      promoterId: notification.promoterId,
      campaignId: notification.campaignId,
      botScore: notification.botScore,
      channels: notification.channels
    };

    await this.writeLog('notifications', logEntry);
  }

  private async logChannelActivity(channel: string, activity: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'channel_activity',
      channel,
      ...activity
    };

    await this.writeLog(`channel-${channel}`, logEntry);
  }

  private async logError(operation: string, error: Error, context?: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      operation,
      error: error.message,
      stack: error.stack,
      context
    };

    await this.writeLog('errors', logEntry);
  }

  /**
   * Write log entry to file
   */
  private async writeLog(logType: string, entry: any): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.config.logPath, `${logType}-${date}.log`);
      const logLine = JSON.stringify(entry) + '\n';
      
      await fs.promises.appendFile(logFile, logLine, 'utf8');
    } catch (error) {
      console.error(`Failed to write log entry: ${error}`);
    }
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    try {
      const directories = [
        this.config.logPath,
        this.config.reportPath
      ];

      for (const dir of directories) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
    } catch (error) {
      console.error(`Failed to create directories: ${error}`);
    }
  }

  /**
   * Get system statistics
   */
  getStats(): {
    totalNotifications: number;
    notificationsByType: { [key: string]: number };
    notificationsBySeverity: { [key: string]: number };
    recentActivity: number;
  } {
    const recentNotifications = this.notifications.filter(n => 
      Date.now() - n.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    const byType = this.notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const bySeverity = this.notifications.reduce((acc, n) => {
      acc[n.severity] = (acc[n.severity] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      totalNotifications: this.notifications.length,
      notificationsByType: byType,
      notificationsBySeverity: bySeverity,
      recentActivity: recentNotifications.length
    };
  }
}