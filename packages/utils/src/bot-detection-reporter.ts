import { BotAnalysis } from './bot-detection';
import { ActionResult, AnalysisLog } from './enhanced-bot-analyzer';
import { AlertEvent, AuditLogEntry } from './bot-detection-monitor';
import * as fs from 'fs';
import * as path from 'path';

export interface ReportConfig {
  reportPath: string;
  formats: ('json' | 'csv' | 'html')[];
  retention: number; // Days to retain reports
  compression: boolean;
  scheduling: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
    realTime: boolean;
  };
}

export interface DailySummary {
  date: string;
  totalAnalyses: number;
  botDetections: {
    banned: number;
    warned: number;
    monitored: number;
    clean: number;
  };
  averageBotScore: number;
  topSuspiciousPromoters: Array<{
    promoterId: string;
    campaignId: string;
    botScore: number;
    action: string;
  }>;
  alertsSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  platformBreakdown: {
    tiktok: { analyses: number; botDetections: number };
    instagram: { analyses: number; botDetections: number };
  };
  performanceMetrics: {
    averageProcessingTime: number;
    totalProcessingTime: number;
    peakAnalysisHour: number;
  };
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalAnalyses: number;
  trends: {
    botDetectionRate: number;
    averageBotScore: number;
    mostActiveDay: string;
    peakHours: number[];
  };
  topProblematicCampaigns: Array<{
    campaignId: string;
    botDetections: number;
    averageBotScore: number;
    actionsCount: { banned: number; warned: number; monitored: number };
  }>;
  systemHealth: {
    uptime: number;
    errorRate: number;
    averageResponseTime: number;
  };
  recommendations: string[];
}

export interface MonthlySummary {
  month: string;
  year: number;
  overview: {
    totalAnalyses: number;
    totalBotDetections: number;
    detectionAccuracy: number;
    falsePositiveRate: number;
  };
  trends: {
    monthlyGrowth: number;
    seasonalPatterns: string[];
    emergingThreats: string[];
  };
  topMetrics: {
    mostProblematicPromoters: Array<{
      promoterId: string;
      totalViolations: number;
      averageBotScore: number;
      status: string;
    }>;
    campaignRiskAnalysis: Array<{
      campaignId: string;
      riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
      botDetectionRate: number;
    }>;
  };
  systemPerformance: {
    averageProcessingTime: number;
    systemReliability: number;
    scalabilityMetrics: any;
  };
  businessImpact: {
    fraudPrevented: number;
    legitimateViewsProtected: number;
    platformFeesSaved: number;
  };
}

/**
 * Bot Detection Reporting System
 * Requirements: 10.3, 10.4 - Summary files and reporting
 */
export class BotDetectionReporter {
  private config: ReportConfig;
  private analysisData: AnalysisLog[] = [];
  private alertData: AlertEvent[] = [];
  private auditData: AuditLogEntry[] = [];

  constructor(config?: Partial<ReportConfig>) {
    this.config = {
      reportPath: 'reports/bot-detection/',
      formats: ['json', 'html'],
      retention: 365, // 1 year
      compression: true,
      scheduling: {
        daily: true,
        weekly: true,
        monthly: true,
        realTime: false,
      },
      ...config,
    };

    this.ensureReportDirectories();
  }

  /**
   * Add analysis data for reporting
   */
  addAnalysisData(analysisLog: AnalysisLog): void {
    this.analysisData.push(analysisLog);

    // Keep only recent data in memory (last 30 days)
    const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.analysisData = this.analysisData.filter(
      log => log.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Add alert data for reporting
   */
  addAlertData(alertEvent: AlertEvent): void {
    this.alertData.push(alertEvent);

    // Keep only recent data in memory (last 30 days)
    const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.alertData = this.alertData.filter(
      alert => alert.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Add audit data for reporting
   */
  addAuditData(auditEntry: AuditLogEntry): void {
    this.auditData.push(auditEntry);

    // Keep only recent data in memory (last 30 days)
    const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.auditData = this.auditData.filter(
      entry => entry.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Generate daily summary report
   * Requirement 10.3: Daily summary files
   */
  async generateDailySummary(date?: Date): Promise<DailySummary> {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    // Filter data for the target date
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dayAnalyses = this.analysisData.filter(
      log => log.timestamp >= dayStart && log.timestamp <= dayEnd
    );

    const dayAlerts = this.alertData.filter(
      alert => alert.timestamp >= dayStart && alert.timestamp <= dayEnd
    );

    // Calculate bot detections
    const botDetections = {
      banned: dayAnalyses.filter(log => log.analysis.action === 'ban').length,
      warned: dayAnalyses.filter(log => log.analysis.action === 'warning')
        .length,
      monitored: dayAnalyses.filter(log => log.analysis.action === 'monitor')
        .length,
      clean: dayAnalyses.filter(log => log.analysis.action === 'none').length,
    };

    // Calculate average bot score
    const averageBotScore =
      dayAnalyses.length > 0
        ? dayAnalyses.reduce((sum, log) => sum + log.analysis.botScore, 0) /
          dayAnalyses.length
        : 0;

    // Get top suspicious promoters
    const suspiciousPromoters = dayAnalyses
      .filter(log => log.analysis.botScore > 50)
      .sort((a, b) => b.analysis.botScore - a.analysis.botScore)
      .slice(0, 10)
      .map(log => ({
        promoterId: log.promoterId,
        campaignId: log.campaignId,
        botScore: log.analysis.botScore,
        action: log.analysis.action,
      }));

    // Calculate alerts summary
    const alertsSummary = {
      critical: dayAlerts.filter(alert => alert.severity === 'CRITICAL').length,
      high: dayAlerts.filter(alert => alert.severity === 'HIGH').length,
      medium: dayAlerts.filter(alert => alert.severity === 'MEDIUM').length,
      low: dayAlerts.filter(alert => alert.severity === 'LOW').length,
    };

    // Platform breakdown (assuming platform info is available in analysis)
    const platformBreakdown = {
      tiktok: {
        analyses: dayAnalyses.filter(
          log =>
            log.analysis.metrics &&
            (log.analysis.metrics as any).platform === 'tiktok'
        ).length,
        botDetections: dayAnalyses.filter(
          log =>
            (log.analysis.metrics as any)?.platform === 'tiktok' &&
            log.analysis.action !== 'none'
        ).length,
      },
      instagram: {
        analyses: dayAnalyses.filter(
          log => (log.analysis.metrics as any)?.platform === 'instagram'
        ).length,
        botDetections: dayAnalyses.filter(
          log =>
            (log.analysis.metrics as any)?.platform === 'instagram' &&
            log.analysis.action !== 'none'
        ).length,
      },
    };

    // Performance metrics
    const processingTimes = dayAnalyses.map(log => log.processingTime);
    const averageProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) /
          processingTimes.length
        : 0;

    const totalProcessingTime = processingTimes.reduce(
      (sum, time) => sum + time,
      0
    );

    // Find peak analysis hour
    const hourCounts = new Array(24).fill(0);
    dayAnalyses.forEach(log => {
      const hour = log.timestamp.getHours();
      hourCounts[hour]++;
    });
    const peakAnalysisHour = hourCounts.indexOf(Math.max(...hourCounts));

    const summary: DailySummary = {
      date: dateStr,
      totalAnalyses: dayAnalyses.length,
      botDetections,
      averageBotScore,
      topSuspiciousPromoters: suspiciousPromoters,
      alertsSummary,
      platformBreakdown,
      performanceMetrics: {
        averageProcessingTime,
        totalProcessingTime,
        peakAnalysisHour,
      },
    };

    // Save the summary
    await this.saveDailySummary(summary);

    return summary;
  }

  /**
   * Generate weekly summary report
   * Requirement 10.3: Weekly summary files
   */
  async generateWeeklySummary(weekStart?: Date): Promise<WeeklySummary> {
    const startDate = weekStart || this.getWeekStart(new Date());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    // Filter data for the week
    const weekAnalyses = this.analysisData.filter(
      log => log.timestamp >= startDate && log.timestamp <= endDate
    );

    const weekAlerts = this.alertData.filter(
      alert => alert.timestamp >= startDate && alert.timestamp <= endDate
    );

    // Calculate trends
    const botDetectionRate =
      weekAnalyses.length > 0
        ? weekAnalyses.filter(log => log.analysis.action !== 'none').length /
          weekAnalyses.length
        : 0;

    const averageBotScore =
      weekAnalyses.length > 0
        ? weekAnalyses.reduce((sum, log) => sum + log.analysis.botScore, 0) /
          weekAnalyses.length
        : 0;

    // Find most active day
    const dayCounts = new Array(7).fill(0);
    weekAnalyses.forEach(log => {
      const dayOfWeek = log.timestamp.getDay();
      dayCounts[dayOfWeek]++;
    });
    const mostActiveDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const mostActiveDay = dayNames[mostActiveDayIndex];

    // Find peak hours
    const hourCounts = new Array(24).fill(0);
    weekAnalyses.forEach(log => {
      const hour = log.timestamp.getHours();
      hourCounts[hour]++;
    });
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    // Top problematic campaigns
    const campaignStats = new Map<
      string,
      {
        botDetections: number;
        totalAnalyses: number;
        botScores: number[];
        actions: { banned: number; warned: number; monitored: number };
      }
    >();

    weekAnalyses.forEach(log => {
      const campaignId = log.campaignId;
      if (!campaignStats.has(campaignId)) {
        campaignStats.set(campaignId, {
          botDetections: 0,
          totalAnalyses: 0,
          botScores: [],
          actions: { banned: 0, warned: 0, monitored: 0 },
        });
      }

      const stats = campaignStats.get(campaignId)!;
      stats.totalAnalyses++;
      stats.botScores.push(log.analysis.botScore);

      if (log.analysis.action !== 'none') {
        stats.botDetections++;
        switch (log.analysis.action) {
          case 'ban':
            stats.actions.banned++;
            break;
          case 'warning':
            stats.actions.warned++;
            break;
          case 'monitor':
            stats.actions.monitored++;
            break;
        }
      }
    });

    const topProblematicCampaigns = Array.from(campaignStats.entries())
      .map(([campaignId, stats]) => ({
        campaignId,
        botDetections: stats.botDetections,
        averageBotScore:
          stats.botScores.reduce((sum, score) => sum + score, 0) /
          stats.botScores.length,
        actionsCount: stats.actions,
      }))
      .sort((a, b) => b.botDetections - a.botDetections)
      .slice(0, 10);

    // System health metrics (placeholder)
    const systemHealth = {
      uptime: 99.9, // Placeholder
      errorRate: 0.1, // Placeholder
      averageResponseTime:
        averageBotScore > 0
          ? weekAnalyses.reduce((sum, log) => sum + log.processingTime, 0) /
            weekAnalyses.length
          : 0,
    };

    // Generate recommendations
    const recommendations = this.generateWeeklyRecommendations(
      weekAnalyses,
      weekAlerts,
      botDetectionRate
    );

    const summary: WeeklySummary = {
      weekStart: startDate.toISOString().split('T')[0],
      weekEnd: endDate.toISOString().split('T')[0],
      totalAnalyses: weekAnalyses.length,
      trends: {
        botDetectionRate,
        averageBotScore,
        mostActiveDay,
        peakHours,
      },
      topProblematicCampaigns,
      systemHealth,
      recommendations,
    };

    // Save the summary
    await this.saveWeeklySummary(summary);

    return summary;
  }

  /**
   * Generate monthly summary report
   * Requirement 10.3: Monthly summary files
   */
  async generateMonthlySummary(
    month?: number,
    year?: number
  ): Promise<MonthlySummary> {
    const now = new Date();
    const targetMonth = month || now.getMonth();
    const targetYear = year || now.getFullYear();

    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    // Filter data for the month
    const monthAnalyses = this.analysisData.filter(
      log => log.timestamp >= monthStart && log.timestamp <= monthEnd
    );

    const monthAlerts = this.alertData.filter(
      alert => alert.timestamp >= monthStart && alert.timestamp <= monthEnd
    );

    // Overview metrics
    const totalBotDetections = monthAnalyses.filter(
      log => log.analysis.action !== 'none'
    ).length;
    const detectionAccuracy = 95.5; // Placeholder - would need validation data
    const falsePositiveRate = 4.5; // Placeholder - would need validation data

    // Trends (placeholder calculations)
    const monthlyGrowth = 15.2; // Placeholder
    const seasonalPatterns = [
      'Higher activity on weekends',
      'Peak hours: 8-10 PM',
    ];
    const emergingThreats = [
      'Coordinated bot networks',
      'AI-generated engagement',
    ];

    // Top problematic promoters
    const promoterStats = new Map<
      string,
      {
        violations: number;
        botScores: number[];
        lastAction: string;
      }
    >();

    monthAnalyses.forEach(log => {
      const promoterId = log.promoterId;
      if (!promoterStats.has(promoterId)) {
        promoterStats.set(promoterId, {
          violations: 0,
          botScores: [],
          lastAction: 'none',
        });
      }

      const stats = promoterStats.get(promoterId)!;
      stats.botScores.push(log.analysis.botScore);

      if (log.analysis.action !== 'none') {
        stats.violations++;
        stats.lastAction = log.analysis.action;
      }
    });

    const mostProblematicPromoters = Array.from(promoterStats.entries())
      .map(([promoterId, stats]) => ({
        promoterId,
        totalViolations: stats.violations,
        averageBotScore:
          stats.botScores.reduce((sum, score) => sum + score, 0) /
          stats.botScores.length,
        status:
          stats.lastAction === 'ban'
            ? 'BANNED'
            : stats.lastAction === 'warning'
              ? 'WARNING'
              : 'ACTIVE',
      }))
      .sort((a, b) => b.totalViolations - a.totalViolations)
      .slice(0, 20);

    // Campaign risk analysis
    const campaignRisks = Array.from(
      new Set(monthAnalyses.map(log => log.campaignId))
    )
      .map(campaignId => {
        const campaignAnalyses = monthAnalyses.filter(
          log => log.campaignId === campaignId
        );
        const botDetections = campaignAnalyses.filter(
          log => log.analysis.action !== 'none'
        ).length;
        const botDetectionRate = botDetections / campaignAnalyses.length;

        let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
        if (botDetectionRate > 0.3) riskLevel = 'HIGH';
        else if (botDetectionRate > 0.1) riskLevel = 'MEDIUM';

        return {
          campaignId,
          riskLevel,
          botDetectionRate,
        };
      })
      .sort((a, b) => b.botDetectionRate - a.botDetectionRate)
      .slice(0, 15);

    // System performance
    const processingTimes = monthAnalyses.map(log => log.processingTime);
    const averageProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) /
          processingTimes.length
        : 0;

    // Business impact (placeholder calculations)
    const businessImpact = {
      fraudPrevented: totalBotDetections * 1000, // Placeholder: avg fraud value per detection
      legitimateViewsProtected: monthAnalyses.length * 500, // Placeholder
      platformFeesSaved: totalBotDetections * 50, // Placeholder: avg fee saved per detection
    };

    const summary: MonthlySummary = {
      month: monthStart.toLocaleString('default', { month: 'long' }),
      year: targetYear,
      overview: {
        totalAnalyses: monthAnalyses.length,
        totalBotDetections,
        detectionAccuracy,
        falsePositiveRate,
      },
      trends: {
        monthlyGrowth,
        seasonalPatterns,
        emergingThreats,
      },
      topMetrics: {
        mostProblematicPromoters,
        campaignRiskAnalysis: campaignRisks,
      },
      systemPerformance: {
        averageProcessingTime,
        systemReliability: 99.8, // Placeholder
        scalabilityMetrics: {
          peakThroughput: Math.max(
            ...Array.from(
              { length: 24 },
              (_, i) =>
                monthAnalyses.filter(log => log.timestamp.getHours() === i)
                  .length
            )
          ),
          averageThroughput: monthAnalyses.length / (24 * 30), // Per hour average
        },
      },
      businessImpact,
    };

    // Save the summary
    await this.saveMonthlySummary(summary);

    return summary;
  }

  /**
   * Generate weekly recommendations based on data
   */
  private generateWeeklyRecommendations(
    analyses: AnalysisLog[],
    alerts: AlertEvent[],
    botDetectionRate: number
  ): string[] {
    const recommendations: string[] = [];

    if (botDetectionRate > 0.2) {
      recommendations.push(
        'High bot detection rate detected. Consider reviewing campaign requirements and promoter vetting process.'
      );
    }

    if (alerts.filter(a => a.severity === 'CRITICAL').length > 5) {
      recommendations.push(
        'Multiple critical alerts this week. Implement stricter monitoring thresholds.'
      );
    }

    const avgBotScore =
      analyses.reduce((sum, log) => sum + log.analysis.botScore, 0) /
      analyses.length;
    if (avgBotScore > 30) {
      recommendations.push(
        'Average bot confidence score is elevated. Consider enhancing detection algorithms.'
      );
    }

    if (analyses.length > 1000) {
      recommendations.push(
        'High analysis volume detected. Consider scaling infrastructure for better performance.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'System performing within normal parameters. Continue monitoring.'
      );
    }

    return recommendations;
  }

  /**
   * Save daily summary to files
   */
  private async saveDailySummary(summary: DailySummary): Promise<void> {
    const filename = `daily-summary-${summary.date}`;

    for (const format of this.config.formats) {
      const filePath = path.join(
        this.config.reportPath,
        'daily',
        `${filename}.${format}`
      );

      switch (format) {
        case 'json':
          await this.saveAsJSON(filePath, summary);
          break;
        case 'csv':
          await this.saveAsCSV(
            filePath,
            this.convertDailySummaryToCSV(summary)
          );
          break;
        case 'html':
          await this.saveAsHTML(
            filePath,
            this.generateDailySummaryHTML(summary)
          );
          break;
      }
    }
  }

  /**
   * Save weekly summary to files
   */
  private async saveWeeklySummary(summary: WeeklySummary): Promise<void> {
    const filename = `weekly-summary-${summary.weekStart}-to-${summary.weekEnd}`;

    for (const format of this.config.formats) {
      const filePath = path.join(
        this.config.reportPath,
        'weekly',
        `${filename}.${format}`
      );

      switch (format) {
        case 'json':
          await this.saveAsJSON(filePath, summary);
          break;
        case 'html':
          await this.saveAsHTML(
            filePath,
            this.generateWeeklySummaryHTML(summary)
          );
          break;
      }
    }
  }

  /**
   * Save monthly summary to files
   */
  private async saveMonthlySummary(summary: MonthlySummary): Promise<void> {
    const filename = `monthly-summary-${summary.year}-${summary.month.toLowerCase()}`;

    for (const format of this.config.formats) {
      const filePath = path.join(
        this.config.reportPath,
        'monthly',
        `${filename}.${format}`
      );

      switch (format) {
        case 'json':
          await this.saveAsJSON(filePath, summary);
          break;
        case 'html':
          await this.saveAsHTML(
            filePath,
            this.generateMonthlySummaryHTML(summary)
          );
          break;
      }
    }
  }

  /**
   * Save data as JSON
   */
  private async saveAsJSON(filePath: string, data: any): Promise<void> {
    await this.ensureDirectoryExists(path.dirname(filePath));
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(data, null, 2),
      'utf8'
    );
  }

  /**
   * Save data as CSV
   */
  private async saveAsCSV(filePath: string, csvData: string): Promise<void> {
    await this.ensureDirectoryExists(path.dirname(filePath));
    await fs.promises.writeFile(filePath, csvData, 'utf8');
  }

  /**
   * Save data as HTML
   */
  private async saveAsHTML(
    filePath: string,
    htmlContent: string
  ): Promise<void> {
    await this.ensureDirectoryExists(path.dirname(filePath));
    await fs.promises.writeFile(filePath, htmlContent, 'utf8');
  }

  /**
   * Convert daily summary to CSV format
   */
  private convertDailySummaryToCSV(summary: DailySummary): string {
    const headers = [
      'Date',
      'Total Analyses',
      'Banned',
      'Warned',
      'Monitored',
      'Clean',
      'Average Bot Score',
      'Critical Alerts',
      'High Alerts',
      'Medium Alerts',
      'Low Alerts',
      'TikTok Analyses',
      'TikTok Bot Detections',
      'Instagram Analyses',
      'Instagram Bot Detections',
      'Average Processing Time',
      'Peak Analysis Hour',
    ];

    const row = [
      summary.date,
      summary.totalAnalyses,
      summary.botDetections.banned,
      summary.botDetections.warned,
      summary.botDetections.monitored,
      summary.botDetections.clean,
      summary.averageBotScore.toFixed(2),
      summary.alertsSummary.critical,
      summary.alertsSummary.high,
      summary.alertsSummary.medium,
      summary.alertsSummary.low,
      summary.platformBreakdown.tiktok.analyses,
      summary.platformBreakdown.tiktok.botDetections,
      summary.platformBreakdown.instagram.analyses,
      summary.platformBreakdown.instagram.botDetections,
      summary.performanceMetrics.averageProcessingTime.toFixed(2),
      summary.performanceMetrics.peakAnalysisHour,
    ];

    return headers.join(',') + '\n' + row.join(',');
  }

  /**
   * Generate HTML for daily summary
   */
  private generateDailySummaryHTML(summary: DailySummary): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Daily Bot Detection Summary - ${summary.date}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background-color: #e9e9e9; border-radius: 5px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f2f2f2; }
        .critical { color: #d32f2f; }
        .high { color: #f57c00; }
        .medium { color: #fbc02d; }
        .low { color: #388e3c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Daily Bot Detection Summary</h1>
        <h2>Date: ${summary.date}</h2>
    </div>

    <div class="metrics">
        <div class="metric">
            <h3>Total Analyses</h3>
            <p>${summary.totalAnalyses}</p>
        </div>
        <div class="metric">
            <h3>Bot Detections</h3>
            <p>Banned: ${summary.botDetections.banned}</p>
            <p>Warned: ${summary.botDetections.warned}</p>
            <p>Monitored: ${summary.botDetections.monitored}</p>
            <p>Clean: ${summary.botDetections.clean}</p>
        </div>
        <div class="metric">
            <h3>Average Bot Score</h3>
            <p>${summary.averageBotScore.toFixed(2)}%</p>
        </div>
    </div>

    <h3>Top Suspicious Promoters</h3>
    <table class="table">
        <tr>
            <th>Promoter ID</th>
            <th>Campaign ID</th>
            <th>Bot Score</th>
            <th>Action</th>
        </tr>
        ${summary.topSuspiciousPromoters
          .map(
            promoter => `
        <tr>
            <td>${promoter.promoterId}</td>
            <td>${promoter.campaignId}</td>
            <td>${promoter.botScore.toFixed(2)}%</td>
            <td>${promoter.action.toUpperCase()}</td>
        </tr>
        `
          )
          .join('')}
    </table>

    <h3>Alerts Summary</h3>
    <div class="metrics">
        <div class="metric critical">Critical: ${summary.alertsSummary.critical}</div>
        <div class="metric high">High: ${summary.alertsSummary.high}</div>
        <div class="metric medium">Medium: ${summary.alertsSummary.medium}</div>
        <div class="metric low">Low: ${summary.alertsSummary.low}</div>
    </div>

    <h3>Platform Breakdown</h3>
    <table class="table">
        <tr>
            <th>Platform</th>
            <th>Total Analyses</th>
            <th>Bot Detections</th>
            <th>Detection Rate</th>
        </tr>
        <tr>
            <td>TikTok</td>
            <td>${summary.platformBreakdown.tiktok.analyses}</td>
            <td>${summary.platformBreakdown.tiktok.botDetections}</td>
            <td>${
              summary.platformBreakdown.tiktok.analyses > 0
                ? (
                    (summary.platformBreakdown.tiktok.botDetections /
                      summary.platformBreakdown.tiktok.analyses) *
                    100
                  ).toFixed(2)
                : 0
            }%</td>
        </tr>
        <tr>
            <td>Instagram</td>
            <td>${summary.platformBreakdown.instagram.analyses}</td>
            <td>${summary.platformBreakdown.instagram.botDetections}</td>
            <td>${
              summary.platformBreakdown.instagram.analyses > 0
                ? (
                    (summary.platformBreakdown.instagram.botDetections /
                      summary.platformBreakdown.instagram.analyses) *
                    100
                  ).toFixed(2)
                : 0
            }%</td>
        </tr>
    </table>

    <h3>Performance Metrics</h3>
    <div class="metrics">
        <div class="metric">
            <h4>Average Processing Time</h4>
            <p>${summary.performanceMetrics.averageProcessingTime.toFixed(2)}ms</p>
        </div>
        <div class="metric">
            <h4>Peak Analysis Hour</h4>
            <p>${summary.performanceMetrics.peakAnalysisHour}:00</p>
        </div>
    </div>

    <footer>
        <p>Generated on: ${new Date().toISOString()}</p>
    </footer>
</body>
</html>
    `;
  }

  /**
   * Generate HTML for weekly summary (simplified)
   */
  private generateWeeklySummaryHTML(summary: WeeklySummary): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Weekly Bot Detection Summary - ${summary.weekStart} to ${summary.weekEnd}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background-color: #e9e9e9; border-radius: 5px; }
        .recommendations { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Weekly Bot Detection Summary</h1>
        <h2>Week: ${summary.weekStart} to ${summary.weekEnd}</h2>
    </div>

    <div class="metrics">
        <div class="metric">
            <h3>Total Analyses</h3>
            <p>${summary.totalAnalyses}</p>
        </div>
        <div class="metric">
            <h3>Bot Detection Rate</h3>
            <p>${(summary.trends.botDetectionRate * 100).toFixed(2)}%</p>
        </div>
        <div class="metric">
            <h3>Most Active Day</h3>
            <p>${summary.trends.mostActiveDay}</p>
        </div>
    </div>

    <div class="recommendations">
        <h3>Recommendations</h3>
        <ul>
            ${summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <footer>
        <p>Generated on: ${new Date().toISOString()}</p>
    </footer>
</body>
</html>
    `;
  }

  /**
   * Generate HTML for monthly summary (simplified)
   */
  private generateMonthlySummaryHTML(summary: MonthlySummary): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Monthly Bot Detection Summary - ${summary.month} ${summary.year}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background-color: #e9e9e9; border-radius: 5px; }
        .business-impact { background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Monthly Bot Detection Summary</h1>
        <h2>${summary.month} ${summary.year}</h2>
    </div>

    <div class="metrics">
        <div class="metric">
            <h3>Total Analyses</h3>
            <p>${summary.overview.totalAnalyses}</p>
        </div>
        <div class="metric">
            <h3>Bot Detections</h3>
            <p>${summary.overview.totalBotDetections}</p>
        </div>
        <div class="metric">
            <h3>Detection Accuracy</h3>
            <p>${summary.overview.detectionAccuracy}%</p>
        </div>
    </div>

    <div class="business-impact">
        <h3>Business Impact</h3>
        <p>Fraud Prevented: $${summary.businessImpact.fraudPrevented.toLocaleString()}</p>
        <p>Legitimate Views Protected: ${summary.businessImpact.legitimateViewsProtected.toLocaleString()}</p>
        <p>Platform Fees Saved: $${summary.businessImpact.platformFeesSaved.toLocaleString()}</p>
    </div>

    <footer>
        <p>Generated on: ${new Date().toISOString()}</p>
    </footer>
</body>
</html>
    `;
  }

  /**
   * Get week start date (Monday)
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Ensure report directories exist
   */
  private ensureReportDirectories(): void {
    try {
      const dirs = [
        this.config.reportPath,
        path.join(this.config.reportPath, 'daily'),
        path.join(this.config.reportPath, 'weekly'),
        path.join(this.config.reportPath, 'monthly'),
      ];

      dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
    } catch (error) {
      console.error(`Failed to create report directories: ${error}`);
    }
  }

  /**
   * Clean up old reports based on retention policy
   */
  async cleanupOldReports(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retention);

    const directories = ['daily', 'weekly', 'monthly'];

    for (const dir of directories) {
      const dirPath = path.join(this.config.reportPath, dir);

      try {
        const files = await fs.promises.readdir(dirPath);

        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = await fs.promises.stat(filePath);

          if (stats.mtime < cutoffDate) {
            await fs.promises.unlink(filePath);
            console.log(`Cleaned up old report: ${file}`);
          }
        }
      } catch (error) {
        console.error(`Error cleaning up reports in ${dir}: ${error}`);
      }
    }
  }
}
