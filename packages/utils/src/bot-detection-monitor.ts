import { BotAnalysis, ActionResult } from './enhanced-bot-analyzer';
import * as fs from 'fs';
import * as path from 'path';

export interface MonitoringConfig {
  alerting: {
    enabled: boolean;
    thresholds: {
      highRiskAlerts: number; // Number of high-risk detections to trigger alert
      warningAlerts: number; // Number of warnings to trigger alert
      timeWindow: number; // Time window in minutes for alert aggregation
    };
    channels: {
      email: boolean;
      dashboard: boolean;
      webhook: boolean;
      sms: boolean;
    };
  };
  logging: {
    logPath: string;
    auditTrail: boolean;
    retention: number; // Days to retain logs
    compression: boolean;
  };
  reporting: {
    enabled: boolean;
    reportPath: string;
    dailySummary: boolean;
    weeklySummary: boolean;
    monthlySummary: boolean;
  };
}

export interface AlertEvent {
  id: string;
  timestamp: Date;
  type: 'HIGH_RISK' | 'WARNING' | 'MONITOR' | 'SYSTEM';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  promoterId: string;
  campaignId: string;
  botScore: number;
  reason: string;
  actionTaken: string;
  metadata: {
    viewsAnalyzed: number;
    suspiciousPatterns: string[];
    previousAlerts: number;
  };
}

export interface NotificationPayload {
  recipient: 'PROMOTER' | 'ADMIN' | 'CREATOR';
  recipientId: string;
  type: 'WARNING' | 'BAN' | 'MONITOR' | 'ALERT';
  title: string;
  message: string;
  data: {
    promoterId: string;
    campaignId: string;
    botScore: number;
    actionTaken: string;
    timestamp: Date;
  };
  channels: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AuditLogEntry {
  timestamp: Date;
  eventType: 'ANALYSIS' | 'ACTION' | 'ALERT' | 'NOTIFICATION';
  promoterId: string;
  campaignId: string;
  details: {
    botScore: number;
    action: string;
    reason: string;
    executedBy: 'SYSTEM' | 'ADMIN';
    metadata: any;
  };
  outcome: 'SUCCESS' | 'FAILED' | 'PENDING';
}

/**
 * Bot Detection Monitoring and Alerting System
 * Requirements: 5.5, 5.6, 5.7, 10.3, 10.4
 */
export class BotDetectionMonitor {
  private config: MonitoringConfig;
  private alertHistory: Map<string, AlertEvent[]> = new Map();
  private notificationQueue: NotificationPayload[] = [];
  private auditLog: AuditLogEntry[] = [];

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      alerting: {
        enabled: true,
        thresholds: {
          highRiskAlerts: 3, // 3 high-risk detections in time window
          warningAlerts: 5, // 5 warnings in time window
          timeWindow: 60 // 60 minutes
        },
        channels: {
          email: true,
          dashboard: true,
          webhook: true,
          sms: false
        }
      },
      logging: {
        logPath: 'logs/bot-detection/',
        auditTrail: true,
        retention: 90, // 90 days
        compression: true
      },
      reporting: {
        enabled: true,
        reportPath: 'reports/bot-detection/',
        dailySummary: true,
        weeklySummary: true,
        monthlySummary: true
      },
      ...config
    };

    this.ensureDirectories();
  }

  /**
   * Process bot detection analysis and trigger appropriate monitoring actions
   * Requirements: 5.5, 5.6, 5.7 - Warning system and notifications
   */
  async processAnalysis(
    analysis: BotAnalysis,
    actionResult: ActionResult
  ): Promise<void> {
    try {
      // Create audit log entry
      const auditEntry = this.createAuditLogEntry(analysis, actionResult);
      await this.logAuditEntry(auditEntry);

      // Generate alert if necessary
      const alertEvent = await this.evaluateForAlert(analysis, actionResult);
      if (alertEvent) {
        await this.processAlert(alertEvent);
      }

      // Generate notifications based on action
      const notifications = this.generateNotifications(analysis, actionResult);
      for (const notification of notifications) {
        await this.sendNotification(notification);
      }

      // Update monitoring statistics
      await this.updateMonitoringStats(analysis, actionResult);

    } catch (error) {
      await this.logError('processAnalysis', error as Error, {
        promoterId: analysis.promoterId,
        campaignId: analysis.campaignId
      });
    }
  }

  /**
   * Create warning system for suspicious activity
   * Requirement 5.5: Warning and hold payout for 50-90% confidence
   */
  private generateNotifications(
    analysis: BotAnalysis,
    actionResult: ActionResult
  ): NotificationPayload[] {
    const notifications: NotificationPayload[] = [];

    switch (analysis.action) {
      case 'ban':
        // Notify promoter about ban
        notifications.push({
          recipient: 'PROMOTER',
          recipientId: analysis.promoterId,
          type: 'BAN',
          title: 'Account Suspended - Bot Activity Detected',
          message: `Your account has been suspended due to suspected bot activity. Bot confidence: ${analysis.botScore}%. Reason: ${analysis.reason}`,
          data: {
            promoterId: analysis.promoterId,
            campaignId: analysis.campaignId,
            botScore: analysis.botScore,
            actionTaken: 'BANNED',
            timestamp: new Date()
          },
          channels: ['email', 'dashboard'],
          priority: 'HIGH'
        });

        // Notify admin about ban
        notifications.push({
          recipient: 'ADMIN',
          recipientId: 'system',
          type: 'BAN',
          title: 'Promoter Banned - High Bot Confidence',
          message: `Promoter ${analysis.promoterId} has been automatically banned for campaign ${analysis.campaignId}. Bot confidence: ${analysis.botScore}%`,
          data: {
            promoterId: analysis.promoterId,
            campaignId: analysis.campaignId,
            botScore: analysis.botScore,
            actionTaken: 'BANNED',
            timestamp: new Date()
          },
          channels: ['dashboard', 'webhook'],
          priority: 'HIGH'
        });
        break;

      case 'warning':
        // Notify promoter about warning
        notifications.push({
          recipient: 'PROMOTER',
          recipientId: analysis.promoterId,
          type: 'WARNING',
          title: 'Suspicious Activity Warning',
          message: `We've detected potentially suspicious activity on your promotion. Your payout is on hold for review. Bot confidence: ${analysis.botScore}%. Please ensure you're following platform guidelines.`,
          data: {
            promoterId: analysis.promoterId,
            campaignId: analysis.campaignId,
            botScore: analysis.botScore,
            actionTaken: 'WARNING_ISSUED',
            timestamp: new Date()
          },
          channels: ['email', 'dashboard'],
          priority: 'MEDIUM'
        });

        // Notify admin about warning
        notifications.push({
          recipient: 'ADMIN',
          recipientId: 'system',
          type: 'WARNING',
          title: 'Promoter Warning - Manual Review Required',
          message: `Promoter ${analysis.promoterId} has been warned for campaign ${analysis.campaignId}. Manual review required. Bot confidence: ${analysis.botScore}%`,
          data: {
            promoterId: analysis.promoterId,
            campaignId: analysis.campaignId,
            botScore: analysis.botScore,
            actionTaken: 'WARNING_ISSUED',
            timestamp: new Date()
          },
          channels: ['dashboard'],
          priority: 'MEDIUM'
        });
        break;

      case 'monitor':
        // Notify admin about monitoring
        notifications.push({
          recipient: 'ADMIN',
          recipientId: 'system',
          type: 'MONITOR',
          title: 'Promoter Added to Monitoring',
          message: `Promoter ${analysis.promoterId} has been added to enhanced monitoring for campaign ${analysis.campaignId}. Bot confidence: ${analysis.botScore}%`,
          data: {
            promoterId: analysis.promoterId,
            campaignId: analysis.campaignId,
            botScore: analysis.botScore,
            actionTaken: 'MONITORING_ENABLED',
            timestamp: new Date()
          },
          channels: ['dashboard'],
          priority: 'LOW'
        });
        break;
    }

    return notifications;
  }

  /**
   * Evaluate if an alert should be triggered based on patterns
   */
  private async evaluateForAlert(
    analysis: BotAnalysis,
    actionResult: ActionResult
  ): Promise<AlertEvent | null> {
    const promoterKey = `${analysis.promoterId}:${analysis.campaignId}`;
    const now = new Date();
    const timeWindowMs = this.config.alerting.thresholds.timeWindow * 60 * 1000;

    // Get recent alerts for this promoter/campaign
    const recentAlerts = this.getRecentAlerts(promoterKey, timeWindowMs);

    let shouldAlert = false;
    let alertType: AlertEvent['type'] = 'MONITOR';
    let severity: AlertEvent['severity'] = 'LOW';

    // Check for high-risk pattern
    if (analysis.action === 'ban' || analysis.botScore >= 90) {
      alertType = 'HIGH_RISK';
      severity = 'CRITICAL';
      shouldAlert = true;
    }
    // Check for warning pattern threshold
    else if (analysis.action === 'warning') {
      const warningCount = recentAlerts.filter(a => a.type === 'WARNING').length;
      if (warningCount >= this.config.alerting.thresholds.warningAlerts) {
        alertType = 'WARNING';
        severity = 'HIGH';
        shouldAlert = true;
      }
    }
    // Check for monitoring pattern
    else if (analysis.action === 'monitor') {
      const monitorCount = recentAlerts.filter(a => a.type === 'MONITOR').length;
      if (monitorCount >= 10) { // Many monitoring events might indicate systematic issue
        alertType = 'MONITOR';
        severity = 'MEDIUM';
        shouldAlert = true;
      }
    }

    if (!shouldAlert || !this.config.alerting.enabled) {
      return null;
    }

    const alertEvent: AlertEvent = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
      type: alertType,
      severity,
      promoterId: analysis.promoterId,
      campaignId: analysis.campaignId,
      botScore: analysis.botScore,
      reason: analysis.reason,
      actionTaken: actionResult.action,
      metadata: {
        viewsAnalyzed: actionResult.details.viewsAnalyzed,
        suspiciousPatterns: actionResult.details.suspiciousPatterns,
        previousAlerts: recentAlerts.length
      }
    };

    return alertEvent;
  }

  /**
   * Process and log alert events
   */
  private async processAlert(alertEvent: AlertEvent): Promise<void> {
    // Store alert in history
    const key = `${alertEvent.promoterId}:${alertEvent.campaignId}`;
    if (!this.alertHistory.has(key)) {
      this.alertHistory.set(key, []);
    }
    this.alertHistory.get(key)!.push(alertEvent);

    // Log alert to file
    await this.logAlert(alertEvent);

    // Send alert notifications to admins
    const alertNotification: NotificationPayload = {
      recipient: 'ADMIN',
      recipientId: 'system',
      type: 'ALERT',
      title: `${alertEvent.severity} Alert: ${alertEvent.type}`,
      message: `Alert triggered for promoter ${alertEvent.promoterId} in campaign ${alertEvent.campaignId}. Bot score: ${alertEvent.botScore}%. ${alertEvent.metadata.previousAlerts} previous alerts in time window.`,
      data: {
        promoterId: alertEvent.promoterId,
        campaignId: alertEvent.campaignId,
        botScore: alertEvent.botScore,
        actionTaken: alertEvent.actionTaken,
        timestamp: alertEvent.timestamp
      },
      channels: this.getAlertChannels(alertEvent.severity),
      priority: alertEvent.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM'
    };

    await this.sendNotification(alertNotification);
  }

  /**
   * Get appropriate notification channels based on severity
   */
  private getAlertChannels(severity: AlertEvent['severity']): string[] {
    const channels: string[] = [];
    
    if (this.config.alerting.channels.dashboard) {
      channels.push('dashboard');
    }
    
    if (this.config.alerting.channels.webhook) {
      channels.push('webhook');
    }
    
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      if (this.config.alerting.channels.email) {
        channels.push('email');
      }
      if (this.config.alerting.channels.sms && severity === 'CRITICAL') {
        channels.push('sms');
      }
    }
    
    return channels;
  }

  /**
   * Send notification through appropriate channels
   */
  private async sendNotification(notification: NotificationPayload): Promise<void> {
    try {
      // Add to notification queue
      this.notificationQueue.push(notification);

      // Log notification
      await this.logNotification(notification);

      // Process notification through channels
      for (const channel of notification.channels) {
        await this.sendThroughChannel(channel, notification);
      }

    } catch (error) {
      await this.logError('sendNotification', error as Error, {
        notificationId: `${notification.recipient}_${notification.recipientId}`,
        type: notification.type
      });
    }
  }

  /**
   * Send notification through specific channel
   */
  private async sendThroughChannel(
    channel: string,
    notification: NotificationPayload
  ): Promise<void> {
    switch (channel) {
      case 'email':
        await this.sendEmailNotification(notification);
        break;
      case 'dashboard':
        await this.sendDashboardNotification(notification);
        break;
      case 'webhook':
        await this.sendWebhookNotification(notification);
        break;
      case 'sms':
        await this.sendSMSNotification(notification);
        break;
      default:
        console.warn(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Send email notification (placeholder implementation)
   */
  private async sendEmailNotification(notification: NotificationPayload): Promise<void> {
    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    console.log(`EMAIL NOTIFICATION: ${notification.title} to ${notification.recipientId}`);
    
    const emailLog = {
      timestamp: new Date().toISOString(),
      channel: 'email',
      recipient: notification.recipientId,
      subject: notification.title,
      message: notification.message,
      priority: notification.priority
    };
    
    await this.logChannelActivity('email', emailLog);
  }

  /**
   * Send dashboard notification (placeholder implementation)
   */
  private async sendDashboardNotification(notification: NotificationPayload): Promise<void> {
    // TODO: Integrate with actual dashboard system (WebSocket, Server-Sent Events)
    console.log(`DASHBOARD NOTIFICATION: ${notification.title}`);
    
    const dashboardLog = {
      timestamp: new Date().toISOString(),
      channel: 'dashboard',
      recipient: notification.recipientId,
      type: notification.type,
      data: notification.data
    };
    
    await this.logChannelActivity('dashboard', dashboardLog);
  }

  /**
   * Send webhook notification (placeholder implementation)
   */
  private async sendWebhookNotification(notification: NotificationPayload): Promise<void> {
    // TODO: Integrate with actual webhook endpoints (Slack, Discord, custom webhooks)
    console.log(`WEBHOOK NOTIFICATION: ${notification.title}`);
    
    const webhookLog = {
      timestamp: new Date().toISOString(),
      channel: 'webhook',
      payload: {
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority
      }
    };
    
    await this.logChannelActivity('webhook', webhookLog);
  }

  /**
   * Send SMS notification (placeholder implementation)
   */
  private async sendSMSNotification(notification: NotificationPayload): Promise<void> {
    // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
    console.log(`SMS NOTIFICATION: ${notification.title} to ${notification.recipientId}`);
    
    const smsLog = {
      timestamp: new Date().toISOString(),
      channel: 'sms',
      recipient: notification.recipientId,
      message: notification.message.substring(0, 160), // SMS length limit
      priority: notification.priority
    };
    
    await this.logChannelActivity('sms', smsLog);
  }

  /**
   * Create audit log entry
   * Requirement 10.4: Audit trail for bot detection decisions
   */
  private createAuditLogEntry(
    analysis: BotAnalysis,
    actionResult: ActionResult
  ): AuditLogEntry {
    return {
      timestamp: new Date(),
      eventType: 'ANALYSIS',
      promoterId: analysis.promoterId,
      campaignId: analysis.campaignId,
      details: {
        botScore: analysis.botScore,
        action: analysis.action,
        reason: analysis.reason,
        executedBy: 'SYSTEM',
        metadata: {
          metrics: analysis.metrics,
          actionResult: actionResult,
          confidence: analysis.botScore
        }
      },
      outcome: actionResult.executed ? 'SUCCESS' : 'PENDING'
    };
  }

  /**
   * Get recent alerts within time window
   */
  private getRecentAlerts(promoterKey: string, timeWindowMs: number): AlertEvent[] {
    const alerts = this.alertHistory.get(promoterKey) || [];
    const cutoffTime = Date.now() - timeWindowMs;
    
    return alerts.filter(alert => alert.timestamp.getTime() > cutoffTime);
  }

  /**
   * Update monitoring statistics
   */
  private async updateMonitoringStats(
    analysis: BotAnalysis,
    actionResult: ActionResult
  ): Promise<void> {
    const stats = {
      timestamp: new Date().toISOString(),
      promoterId: analysis.promoterId,
      campaignId: analysis.campaignId,
      botScore: analysis.botScore,
      action: analysis.action,
      executed: actionResult.executed,
      processingTime: Date.now() - actionResult.timestamp.getTime()
    };

    const statsFile = path.join(this.config.logging.logPath, 'monitoring-stats.jsonl');
    await this.appendToFile(statsFile, JSON.stringify(stats) + '\n');
  }

  /**
   * Log audit entry to file system
   * Requirement 10.4: Audit trail logging
   */
  private async logAuditEntry(entry: AuditLogEntry): Promise<void> {
    if (!this.config.logging.auditTrail) return;

    this.auditLog.push(entry);

    const auditFile = path.join(
      this.config.logging.logPath,
      `audit-${new Date().toISOString().split('T')[0]}.log`
    );

    const logLine = JSON.stringify(entry) + '\n';
    await this.appendToFile(auditFile, logLine);
  }

  /**
   * Log alert to file system
   */
  private async logAlert(alert: AlertEvent): Promise<void> {
    const alertFile = path.join(
      this.config.logging.logPath,
      `alerts-${new Date().toISOString().split('T')[0]}.log`
    );

    const logLine = JSON.stringify(alert) + '\n';
    await this.appendToFile(alertFile, logLine);
  }

  /**
   * Log notification to file system
   */
  private async logNotification(notification: NotificationPayload): Promise<void> {
    const notificationFile = path.join(
      this.config.logging.logPath,
      `notifications-${new Date().toISOString().split('T')[0]}.log`
    );

    const logLine = JSON.stringify(notification) + '\n';
    await this.appendToFile(notificationFile, logLine);
  }

  /**
   * Log channel activity
   */
  private async logChannelActivity(channel: string, activity: any): Promise<void> {
    const channelFile = path.join(
      this.config.logging.logPath,
      `channel-${channel}-${new Date().toISOString().split('T')[0]}.log`
    );

    const logLine = JSON.stringify(activity) + '\n';
    await this.appendToFile(channelFile, logLine);
  }

  /**
   * Log errors
   */
  private async logError(operation: string, error: Error, context: any): Promise<void> {
    const errorLog = {
      timestamp: new Date().toISOString(),
      operation,
      error: error.message,
      stack: error.stack,
      context
    };

    const errorFile = path.join(
      this.config.logging.logPath,
      `monitor-errors-${new Date().toISOString().split('T')[0]}.log`
    );

    const logLine = JSON.stringify(errorLog) + '\n';
    await this.appendToFile(errorFile, logLine);
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    try {
      if (!fs.existsSync(this.config.logging.logPath)) {
        fs.mkdirSync(this.config.logging.logPath, { recursive: true });
      }
      if (!fs.existsSync(this.config.reporting.reportPath)) {
        fs.mkdirSync(this.config.reporting.reportPath, { recursive: true });
      }
    } catch (error) {
      console.error(`Failed to create directories: ${error}`);
    }
  }

  /**
   * Append content to file
   */
  private async appendToFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.promises.appendFile(filePath, content, 'utf8');
    } catch (error) {
      console.error(`Failed to write to file ${filePath}: ${error}`);
    }
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    totalAlerts: number;
    alertsByType: { [key: string]: number };
    notificationsSent: number;
    auditEntries: number;
    recentActivity: number;
  } {
    const allAlerts = Array.from(this.alertHistory.values()).flat();
    const recentAlerts = allAlerts.filter(alert => 
      Date.now() - alert.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    const alertsByType = allAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      totalAlerts: allAlerts.length,
      alertsByType,
      notificationsSent: this.notificationQueue.length,
      auditEntries: this.auditLog.length,
      recentActivity: recentAlerts.length
    };
  }
}