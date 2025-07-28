import { BotAnalysis } from './bot-detection';
import { BotDetectionMonitor, AlertEvent, NotificationPayload } from './bot-detection-monitor';
import { BotDetectionReporter, DailySummary, WeeklySummary, MonthlySummary } from './bot-detection-reporter';
import * as fs from 'fs';
import * as path from 'path';

export interface MonitoringSystemConfig {
  monitoring: {
    enabled: boolean;
    realTimeAlerts: boolean;
    batchProcessing: boolean;
    alertThresholds: {
      criticalBotScore: number; // 90%
      warningBotScore: number; // 50%
      monitorBotScore: number; // 20%
      alertFrequencyLimit: number; // Max alerts per hour
    };
  };
  logging: {
    logPath: string;
    auditTrail: boolean;
    retention: number; // Days
    compression: boolean;
    logLevels: ('debug' | 'info' | 'warn' | 'error')[];
  };
  reporting: {
    enabled: boolean;
    reportPath: string;
    formats: ('json' | 'csv' | 'html')[];
    scheduling: {
      daily: boolean;
      weekly: boolean;
      monthly: boolean;
      realTime: boolean;
    };
  };
  notifications: {
    channels: {
      email: boolean;
      dashboard: boolean;
      webhook: boolean;
      sms: boolean;
    };
    recipients: {
      admins: string[];
      promoters: boolean; // Send notifications to affected promoters
      creators: boolean; // Send notifications to campaign creators
    };
  };
}

export interface SystemAlert {
  id: string;
  timestamp: Date;
  type: 'BOT_DETECTION' | 'SYSTEM_ERROR' | 'PERFORMANCE' | 'SECURITY';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  message: string;
  data: any;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface MonitoringMetrics {
  timestamp: Date;
  totalAnalyses: number;
  botDetections: {
    banned: number;
    warned: number;
    monitored: number;
    clean: number;
  };
  averageBotScore: number;
  systemPerformance: {
    averageProcessingTime: number;
    errorRate: number;
    throughput: number;
  };
  alertsGenerated: number;
  notificationsSent: number;
}

/**
 * Comprehensive Bot Detection Monitoring and Alerting System
 * Requirements: 5.5, 5.6, 5.7, 10.3, 10.4
 */
export class BotDetectionMonitoringSystem {
  private config: MonitoringSystemConfig;
  private monitor: BotDetectionMonitor;
  private reporter: BotDetectionReporter;
  private systemAlerts: SystemAlert[] = [];
  private metrics: MonitoringMetrics[] = [];
  private alertFrequencyTracker: Map<string, number[]> = new Map();

  constructor(config?: Partial<MonitoringSystemConfig>) {
    this.config = {
      monitoring: {
        enabled: true,
        realTimeAlerts: true,
        batchProcessing: true,
        alertThresholds: {
          criticalBotScore: 90,
          warningBotScore: 50,
          monitorBotScore: 20,
          alertFrequencyLimit: 10 // Max 10 alerts per hour per promoter
        }
      },
      logging: {
        logPath: 'logs/bot-detection/',
        auditTrail: true,
        retention: 90, // 90 days
        compression: true,
        logLevels: ['info', 'warn', 'error']
      },
      reporting: {
        enabled: true,
        reportPath: 'reports/bot-detection/',
        formats: ['json', 'html'],
        scheduling: {
          daily: true,
          weekly: true,
          monthly: true,
          realTime: false
        }
      },
      notifications: {
        channels: {
          email: true,
          dashboard: true,
          webhook: true,
          sms: false
        },
        recipients: {
          admins: ['admin@platform.com'],
          promoters: true,
          creators: true
        }
      },
      ...config
    };

    this.monitor = new BotDetectionMonitor({
      alerting: {
        enabled: this.config.monitoring.enabled,
        thresholds: {
          highRiskAlerts: 3,
          warningAlerts: 5,
          timeWindow: 60
        },
        channels: this.config.notifications.channels
      },
      logging: this.config.logging,
      reporting: {
        enabled: this.config.reporting.enabled,
        reportPath: this.config.reporting.reportPath,
        dailySummary: this.config.reporting.scheduling.daily,
        weeklySummary: this.config.reporting.scheduling.weekly,
        monthlySummary: this.config.reporting.scheduling.monthly
      }
    });

    this.reporter = new BotDetectionReporter({
      reportPath: this.config.reporting.reportPath,
      formats: this.config.reporting.formats,
      retention: this.config.logging.retention,
      compression: this.config.logging.compression,
      scheduling: {
        daily: this.config.reporting.scheduling.daily,
        weekly: this.config.reporting.scheduling.weekly,
        monthly: this.config.reporting.scheduling.monthly,
        realTime: this.config.reporting.scheduling.realTime
      }
    });

    this.ensureDirectories();
  }

  /**
   * Process bot detection analysis with comprehensive monitoring
   * Requirements: 5.5, 5.6, 5.7 - Warning system, notifications, and monitoring
   */
  async processAnalysis(
    promoterId: string,
    campaignId: string,
    analysis: BotAnalysis
  ): Promise<void> {
    try {
      const startTime = Date.now();

      // Log the analysis
      await this.logAnalysis(promoterId, campaignId, analysis);

      // Check if we should generate alerts based on frequency limits
      if (this.shouldGenerateAlert(promoterId, analysis.botScore)) {
        // Generate system alert
        const systemAlert = await this.generateSystemAlert(promoterId, campaignId, analysis);
        if (systemAlert) {
          await this.processSystemAlert(systemAlert);
        }

        // Generate notifications based on bot score and action
        const notifications = this.generateNotifications(promoterId, campaignId, analysis);
        for (const notification of notifications) {
          await this.sendNotification(notification);
        }

        // Update alert frequency tracker
        this.updateAlertFrequency(promoterId);
      }

      // Update monitoring metrics
      await this.updateMetrics(analysis, Date.now() - startTime);

      // Add to reporter data (create compatible action result)
      const actionResult = {
        action: analysis.action,
        executed: analysis.action !== 'none',
        timestamp: new Date(),
        reason: analysis.reason,
        confidence: analysis.botScore,
        promoterId,
        campaignId,
        details: {
          viewsAnalyzed: analysis.metrics.totalViews,
          suspiciousPatterns: [analysis.reason],
          metrics: analysis.metrics
        }
      };

      this.reporter.addAnalysisData({
        timestamp: new Date(),
        promoterId,
        campaignId,
        analysis,
        actionResult,
        processingTime: Date.now() - startTime
      });

      // Log successful processing
      await this.logInfo('processAnalysis', `Successfully processed analysis for promoter ${promoterId}, campaign ${campaignId}`, {
        botScore: analysis.botScore,
        action: analysis.action,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      await this.logError('processAnalysis', error as Error, {
        promoterId,
        campaignId,
        botScore: analysis.botScore
      });
      
      // Generate system error alert
      await this.generateSystemErrorAlert('processAnalysis', error as Error, { promoterId, campaignId });
    }
  }

  /**
   * Generate warning system for suspicious activity
   * Requirement 5.5: Warning system untuk suspicious activity
   */
  private generateNotifications(
    promoterId: string,
    campaignId: string,
    analysis: BotAnalysis
  ): NotificationPayload[] {
    const notifications: NotificationPayload[] = [];

    switch (analysis.action) {
      case 'ban':
        // Critical notification for ban action
        notifications.push({
          recipient: 'PROMOTER',
          recipientId: promoterId,
          type: 'BAN',
          title: '🚫 Account Suspended - Bot Activity Detected',
          message: `Your account has been automatically suspended due to suspected bot activity.\n\nDetails:\n- Bot Confidence: ${analysis.botScore}%\n- Reason: ${analysis.reason}\n- Campaign: ${campaignId}\n\nThis action is immediate and your payouts have been cancelled. If you believe this is an error, please contact support.`,
          data: {
            promoterId,
            campaignId,
            botScore: analysis.botScore,
            actionTaken: 'ACCOUNT_BANNED',
            timestamp: new Date()
          },
          channels: ['email', 'dashboard'],
          priority: 'HIGH'
        });

        // Admin notification for ban
        notifications.push({
          recipient: 'ADMIN',
          recipientId: 'system',
          type: 'BAN',
          title: '🚨 CRITICAL: Promoter Auto-Banned',
          message: `Promoter ${promoterId} has been automatically banned for high-confidence bot activity.\n\nCampaign: ${campaignId}\nBot Score: ${analysis.botScore}%\nReason: ${analysis.reason}\n\nImmediate review recommended.`,
          data: {
            promoterId,
            campaignId,
            botScore: analysis.botScore,
            actionTaken: 'ACCOUNT_BANNED',
            timestamp: new Date()
          },
          channels: ['email', 'dashboard', 'webhook'],
          priority: 'HIGH'
        });
        break;

      case 'warning':
        // Warning notification for suspicious activity
        notifications.push({
          recipient: 'PROMOTER',
          recipientId: promoterId,
          type: 'WARNING',
          title: '⚠️ Suspicious Activity Warning',
          message: `We've detected potentially suspicious activity on your promotion for campaign ${campaignId}.\n\nDetails:\n- Confidence Level: ${analysis.botScore}%\n- Reason: ${analysis.reason}\n\nYour payout is temporarily on hold for manual review. Please ensure you're following platform guidelines and using legitimate promotion methods.\n\nIf this continues, your account may be suspended.`,
          data: {
            promoterId,
            campaignId,
            botScore: analysis.botScore,
            actionTaken: 'PAYOUT_HOLD',
            timestamp: new Date()
          },
          channels: ['email', 'dashboard'],
          priority: 'MEDIUM'
        });

        // Admin notification for warning
        notifications.push({
          recipient: 'ADMIN',
          recipientId: 'system',
          type: 'WARNING',
          title: '⚠️ Promoter Warning - Manual Review Required',
          message: `Promoter ${promoterId} has been flagged for suspicious activity requiring manual review.\n\nCampaign: ${campaignId}\nBot Score: ${analysis.botScore}%\nReason: ${analysis.reason}\n\nPayout has been held pending review.`,
          data: {
            promoterId,
            campaignId,
            botScore: analysis.botScore,
            actionTaken: 'PAYOUT_HOLD',
            timestamp: new Date()
          },
          channels: ['dashboard', 'webhook'],
          priority: 'MEDIUM'
        });
        break;

      case 'monitor':
        // Monitoring notification (admin only)
        notifications.push({
          recipient: 'ADMIN',
          recipientId: 'system',
          type: 'MONITOR',
          title: '👁️ Enhanced Monitoring Activated',
          message: `Promoter ${promoterId} has been added to enhanced monitoring.\n\nCampaign: ${campaignId}\nBot Score: ${analysis.botScore}%\nReason: ${analysis.reason}\n\nContinuous monitoring active.`,
          data: {
            promoterId,
            campaignId,
            botScore: analysis.botScore,
            actionTaken: 'ENHANCED_MONITORING',
            timestamp: new Date()
          },
          channels: ['dashboard'],
          priority: 'LOW'
        });
        break;
    }

    // Notify campaign creator if enabled
    if (this.config.notifications.recipients.creators && analysis.action !== 'none') {
      notifications.push({
        recipient: 'CREATOR',
        recipientId: `campaign_${campaignId}`,
        type: 'ALERT',
        title: `Campaign Security Alert - ${analysis.action.toUpperCase()}`,
        message: `A promoter in your campaign has been flagged for suspicious activity.\n\nCampaign: ${campaignId}\nAction Taken: ${analysis.action.toUpperCase()}\nBot Confidence: ${analysis.botScore}%\n\nYour campaign security is our priority.`,
        data: {
          promoterId,
          campaignId,
          botScore: analysis.botScore,
          actionTaken: analysis.action.toUpperCase(),
          timestamp: new Date()
        },
        channels: ['email', 'dashboard'],
        priority: analysis.action === 'ban' ? 'HIGH' : 'MEDIUM'
      });
    }

    return notifications;
  }

  /**
   * Generate system alert based on analysis
   */
  private async generateSystemAlert(
    promoterId: string,
    campaignId: string,
    analysis: BotAnalysis
  ): Promise<SystemAlert | null> {
    let severity: SystemAlert['severity'] = 'LOW';
    let type: SystemAlert['type'] = 'BOT_DETECTION';

    // Determine severity based on bot score and action
    if (analysis.botScore >= this.config.monitoring.alertThresholds.criticalBotScore) {
      severity = 'CRITICAL';
    } else if (analysis.botScore >= this.config.monitoring.alertThresholds.warningBotScore) {
      severity = 'HIGH';
    } else if (analysis.botScore >= this.config.monitoring.alertThresholds.monitorBotScore) {
      severity = 'MEDIUM';
    }

    const alert: SystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      severity,
      source: `bot-detection-system`,
      message: `Bot detection alert for promoter ${promoterId} in campaign ${campaignId}. Bot score: ${analysis.botScore}%, Action: ${analysis.action}. Reason: ${analysis.reason}`,
      data: {
        promoterId,
        campaignId,
        analysis,
        metrics: analysis.metrics
      },
      acknowledged: false
    };

    return alert;
  }

  /**
   * Generate system error alert
   */
  private async generateSystemErrorAlert(
    operation: string,
    error: Error,
    context: any
  ): Promise<void> {
    const alert: SystemAlert = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'SYSTEM_ERROR',
      severity: 'HIGH',
      source: `monitoring-system`,
      message: `System error in ${operation}: ${error.message}`,
      data: {
        operation,
        error: error.message,
        stack: error.stack,
        context
      },
      acknowledged: false
    };

    await this.processSystemAlert(alert);
  }

  /**
   * Process system alert
   */
  private async processSystemAlert(alert: SystemAlert): Promise<void> {
    // Store alert
    this.systemAlerts.push(alert);

    // Log alert
    await this.logAlert(alert);

    // Send alert notifications to admins
    const alertNotification: NotificationPayload = {
      recipient: 'ADMIN',
      recipientId: 'system',
      type: 'ALERT',
      title: `${alert.severity} System Alert: ${alert.type}`,
      message: alert.message,
      data: {
        promoterId: alert.data.promoterId || 'system',
        campaignId: alert.data.campaignId || 'system',
        botScore: alert.data.analysis?.botScore || 0,
        actionTaken: alert.type,
        timestamp: alert.timestamp
      },
      channels: this.getAlertChannels(alert.severity),
      priority: alert.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM'
    };

    await this.sendNotification(alertNotification);
  }

  /**
   * Check if alert should be generated based on frequency limits
   */
  private shouldGenerateAlert(promoterId: string, botScore: number): boolean {
    if (!this.config.monitoring.enabled) return false;

    // Always generate alerts for critical scores
    if (botScore >= this.config.monitoring.alertThresholds.criticalBotScore) {
      return true;
    }

    // Check frequency limits for non-critical alerts
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    if (!this.alertFrequencyTracker.has(promoterId)) {
      this.alertFrequencyTracker.set(promoterId, []);
    }

    const recentAlerts = this.alertFrequencyTracker.get(promoterId)!
      .filter(timestamp => timestamp > hourAgo);

    return recentAlerts.length < this.config.monitoring.alertThresholds.alertFrequencyLimit;
  }

  /**
   * Update alert frequency tracker
   */
  private updateAlertFrequency(promoterId: string): void {
    const now = Date.now();
    if (!this.alertFrequencyTracker.has(promoterId)) {
      this.alertFrequencyTracker.set(promoterId, []);
    }
    this.alertFrequencyTracker.get(promoterId)!.push(now);

    // Clean up old entries (older than 1 hour)
    const hourAgo = now - (60 * 60 * 1000);
    this.alertFrequencyTracker.set(
      promoterId,
      this.alertFrequencyTracker.get(promoterId)!.filter(timestamp => timestamp > hourAgo)
    );
  }

  /**
   * Get appropriate notification channels based on severity
   */
  private getAlertChannels(severity: SystemAlert['severity']): string[] {
    const channels: string[] = [];
    
    if (this.config.notifications.channels.dashboard) {
      channels.push('dashboard');
    }
    
    if (this.config.notifications.channels.webhook) {
      channels.push('webhook');
    }
    
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      if (this.config.notifications.channels.email) {
        channels.push('email');
      }
      if (this.config.notifications.channels.sms && severity === 'CRITICAL') {
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
    const channelLog = {
      timestamp: new Date().toISOString(),
      channel,
      recipient: notification.recipientId,
      type: notification.type,
      title: notification.title,
      priority: notification.priority,
      success: true
    };

    try {
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
          throw new Error(`Unknown notification channel: ${channel}`);
      }

      await this.logChannelActivity(channel, channelLog);

    } catch (error) {
      channelLog.success = false;
      await this.logChannelActivity(channel, { ...channelLog, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Send email notification (implementation placeholder)
   */
  private async sendEmailNotification(notification: NotificationPayload): Promise<void> {
    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    console.log(`📧 EMAIL: ${notification.title} → ${notification.recipientId}`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send dashboard notification (implementation placeholder)
   */
  private async sendDashboardNotification(notification: NotificationPayload): Promise<void> {
    // TODO: Integrate with actual dashboard system (WebSocket, Server-Sent Events)
    console.log(`📊 DASHBOARD: ${notification.title}`);
    
    // Simulate dashboard update
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Send webhook notification (implementation placeholder)
   */
  private async sendWebhookNotification(notification: NotificationPayload): Promise<void> {
    // TODO: Integrate with actual webhook endpoints (Slack, Discord, custom webhooks)
    console.log(`🔗 WEBHOOK: ${notification.title}`);
    
    // Simulate webhook call
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  /**
   * Send SMS notification (implementation placeholder)
   */
  private async sendSMSNotification(notification: NotificationPayload): Promise<void> {
    // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
    console.log(`📱 SMS: ${notification.title.substring(0, 50)}... → ${notification.recipientId}`);
    
    // Simulate SMS sending delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Update monitoring metrics
   */
  private async updateMetrics(analysis: BotAnalysis, processingTime: number): Promise<void> {
    const now = new Date();
    
    // Find or create current hour metrics
    let currentMetrics = this.metrics.find(m => 
      m.timestamp.getHours() === now.getHours() &&
      m.timestamp.getDate() === now.getDate()
    );

    if (!currentMetrics) {
      currentMetrics = {
        timestamp: now,
        totalAnalyses: 0,
        botDetections: {
          banned: 0,
          warned: 0,
          monitored: 0,
          clean: 0
        },
        averageBotScore: 0,
        systemPerformance: {
          averageProcessingTime: 0,
          errorRate: 0,
          throughput: 0
        },
        alertsGenerated: 0,
        notificationsSent: 0
      };
      this.metrics.push(currentMetrics);
    }

    // Update metrics
    currentMetrics.totalAnalyses++;
    
    switch (analysis.action) {
      case 'ban':
        currentMetrics.botDetections.banned++;
        break;
      case 'warning':
        currentMetrics.botDetections.warned++;
        break;
      case 'monitor':
        currentMetrics.botDetections.monitored++;
        break;
      default:
        currentMetrics.botDetections.clean++;
    }

    // Update average bot score
    currentMetrics.averageBotScore = (
      (currentMetrics.averageBotScore * (currentMetrics.totalAnalyses - 1)) + analysis.botScore
    ) / currentMetrics.totalAnalyses;

    // Update processing time
    currentMetrics.systemPerformance.averageProcessingTime = (
      (currentMetrics.systemPerformance.averageProcessingTime * (currentMetrics.totalAnalyses - 1)) + processingTime
    ) / currentMetrics.totalAnalyses;

    // Update throughput (analyses per hour)
    currentMetrics.systemPerformance.throughput = currentMetrics.totalAnalyses;

    // Save metrics to file
    await this.saveMetrics(currentMetrics);
  }

  /**
   * Generate daily summary report
   * Requirement 10.3: Daily summary files
   */
  async generateDailySummary(date?: Date): Promise<DailySummary> {
    return await this.reporter.generateDailySummary(date);
  }

  /**
   * Generate weekly summary report
   * Requirement 10.3: Weekly summary files
   */
  async generateWeeklySummary(weekStart?: Date): Promise<WeeklySummary> {
    return await this.reporter.generateWeeklySummary(weekStart);
  }

  /**
   * Generate monthly summary report
   * Requirement 10.3: Monthly summary files
   */
  async generateMonthlySummary(month?: number, year?: number): Promise<MonthlySummary> {
    return await this.reporter.generateMonthlySummary(month, year);
  }

  /**
   * Logging methods
   * Requirement 10.4: Audit trail logging
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
      metrics: analysis.metrics
    };

    await this.writeLog('analysis', logEntry);
  }

  private async logAlert(alert: SystemAlert): Promise<void> {
    const logEntry = {
      timestamp: alert.timestamp.toISOString(),
      level: alert.severity.toLowerCase(),
      event: 'system_alert',
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      data: alert.data
    };

    await this.writeLog('alerts', logEntry);
  }

  private async logNotification(notification: NotificationPayload): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'notification_sent',
      recipient: notification.recipient,
      recipientId: notification.recipientId,
      type: notification.type,
      title: notification.title,
      channels: notification.channels,
      priority: notification.priority
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

  private async logInfo(operation: string, message: string, data?: any): Promise<void> {
    if (!this.config.logging.logLevels.includes('info')) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      operation,
      message,
      data
    };

    await this.writeLog('system', logEntry);
  }

  private async logError(operation: string, error: Error, context?: any): Promise<void> {
    if (!this.config.logging.logLevels.includes('error')) return;

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
      const logFile = path.join(this.config.logging.logPath, `${logType}-${date}.log`);
      const logLine = JSON.stringify(entry) + '\n';
      
      await fs.promises.appendFile(logFile, logLine, 'utf8');
    } catch (error) {
      console.error(`Failed to write log entry: ${error}`);
    }
  }

  /**
   * Save metrics to file
   */
  private async saveMetrics(metrics: MonitoringMetrics): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0];
      const metricsFile = path.join(this.config.logging.logPath, `metrics-${date}.log`);
      const metricsLine = JSON.stringify(metrics) + '\n';
      
      await fs.promises.appendFile(metricsFile, metricsLine, 'utf8');
    } catch (error) {
      console.error(`Failed to save metrics: ${error}`);
    }
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    try {
      const directories = [
        this.config.logging.logPath,
        this.config.reporting.reportPath,
        path.join(this.config.reporting.reportPath, 'daily'),
        path.join(this.config.reporting.reportPath, 'weekly'),
        path.join(this.config.reporting.reportPath, 'monthly')
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
   * Get system status and statistics
   */
  getSystemStatus(): {
    monitoring: {
      enabled: boolean;
      totalAnalyses: number;
      recentAlerts: number;
      systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    };
    alerts: {
      total: number;
      unacknowledged: number;
      byType: { [key: string]: number };
      bySeverity: { [key: string]: number };
    };
    performance: {
      averageProcessingTime: number;
      throughput: number;
      errorRate: number;
    };
  } {
    const recentMetrics = this.metrics.slice(-24); // Last 24 hours
    const totalAnalyses = recentMetrics.reduce((sum, m) => sum + m.totalAnalyses, 0);
    const recentAlerts = this.systemAlerts.filter(a => 
      Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000
    ).length;

    // Determine system health
    let systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    const criticalAlerts = this.systemAlerts.filter(a => 
      a.severity === 'CRITICAL' && !a.acknowledged
    ).length;
    const highAlerts = this.systemAlerts.filter(a => 
      a.severity === 'HIGH' && !a.acknowledged
    ).length;

    if (criticalAlerts > 0) {
      systemHealth = 'CRITICAL';
    } else if (highAlerts > 3 || recentAlerts > 20) {
      systemHealth = 'WARNING';
    }

    // Alert statistics
    const alertsByType = this.systemAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const alertsBySeverity = this.systemAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    // Performance metrics
    const avgProcessingTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.systemPerformance.averageProcessingTime, 0) / recentMetrics.length
      : 0;

    const throughput = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.systemPerformance.throughput, 0) / recentMetrics.length
      : 0;

    const errorRate = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.systemPerformance.errorRate, 0) / recentMetrics.length
      : 0;

    return {
      monitoring: {
        enabled: this.config.monitoring.enabled,
        totalAnalyses,
        recentAlerts,
        systemHealth
      },
      alerts: {
        total: this.systemAlerts.length,
        unacknowledged: this.systemAlerts.filter(a => !a.acknowledged).length,
        byType: alertsByType,
        bySeverity: alertsBySeverity
      },
      performance: {
        averageProcessingTime: avgProcessingTime,
        throughput,
        errorRate
      }
    };
  }

  /**
   * Acknowledge system alert
   */
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.systemAlerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    
    await this.logInfo('acknowledgeAlert', `Alert ${alertId} acknowledged`, { alertId });
    return true;
  }

  /**
   * Resolve system alert
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.systemAlerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.resolvedAt = new Date();
    
    await this.logInfo('resolveAlert', `Alert ${alertId} resolved`, { alertId });
    return true;
  }
}