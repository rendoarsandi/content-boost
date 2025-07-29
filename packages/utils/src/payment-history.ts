import { z } from 'zod';

// Payment history types
export interface PaymentHistoryEntry {
  id: string;
  payoutId: string;
  promoterId: string;
  campaignId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  gatewayProvider: string;
  transactionId?: string;
  failureReason?: string;
  retryCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export interface PaymentAuditLog {
  id: string;
  paymentHistoryId: string;
  action: 'created' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retried';
  previousStatus?: string;
  newStatus: string;
  details?: Record<string, any>;
  timestamp: Date;
  source: 'system' | 'gateway' | 'manual';
}

export interface PaymentSummary {
  period: {
    start: Date;
    end: Date;
  };
  totalPayments: number;
  totalAmount: number;
  currency: string;
  statusBreakdown: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  amountBreakdown: {
    completed: number;
    failed: number;
    pending: number;
  };
  averageAmount: number;
  successRate: number;
  retryRate: number;
}

// Validation schemas
export const PaymentHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  payoutId: z.string().uuid(),
  promoterId: z.string().uuid(),
  campaignId: z.string().uuid(),
  paymentId: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  gatewayProvider: z.string(),
  transactionId: z.string().optional(),
  failureReason: z.string().optional(),
  retryCount: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date(),
  processedAt: z.date().optional(),
  completedAt: z.date().optional(),
  updatedAt: z.date(),
});

export const PaymentAuditLogSchema = z.object({
  id: z.string().uuid(),
  paymentHistoryId: z.string().uuid(),
  action: z.enum(['created', 'processing', 'completed', 'failed', 'cancelled', 'retried']),
  previousStatus: z.string().optional(),
  newStatus: z.string(),
  details: z.record(z.string(), z.any()).optional(),
  timestamp: z.date(),
  source: z.enum(['system', 'gateway', 'manual']),
});

/**
 * Payment History Manager
 * Requirement 6.6: Implementasi payment history tracking dengan audit logs
 */
export class PaymentHistoryManager {
  private historyEntries: Map<string, PaymentHistoryEntry> = new Map();
  private auditLogs: Map<string, PaymentAuditLog[]> = new Map();

  /**
   * Create a new payment history entry
   */
  async createPaymentHistory(entry: Omit<PaymentHistoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentHistoryEntry> {
    const historyEntry: PaymentHistoryEntry = {
      ...entry,
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate entry
    PaymentHistoryEntrySchema.parse(historyEntry);

    // Store entry
    this.historyEntries.set(historyEntry.id, historyEntry);

    // Create audit log
    await this.addAuditLog(historyEntry.id, {
      action: 'created',
      newStatus: entry.status,
      details: {
        amount: entry.amount,
        currency: entry.currency,
        gatewayProvider: entry.gatewayProvider,
      },
      source: 'system',
    });

    this.log('info', `Created payment history entry: ${historyEntry.id} for payout ${entry.payoutId}`);

    return historyEntry;
  }

  /**
   * Update payment history status
   */
  async updatePaymentStatus(
    historyId: string,
    status: PaymentHistoryEntry['status'],
    details?: {
      transactionId?: string;
      failureReason?: string;
      gatewayResponse?: any;
      processedAt?: Date;
      completedAt?: Date;
    }
  ): Promise<PaymentHistoryEntry> {
    const entry = this.historyEntries.get(historyId);
    if (!entry) {
      throw new Error(`Payment history entry not found: ${historyId}`);
    }

    const previousStatus = entry.status;

    // Update entry
    entry.status = status;
    entry.updatedAt = new Date();

    if (details?.transactionId) {
      entry.transactionId = details.transactionId;
    }

    if (details?.failureReason) {
      entry.failureReason = details.failureReason;
    }

    if (details?.processedAt) {
      entry.processedAt = details.processedAt;
    }

    if (details?.completedAt) {
      entry.completedAt = details.completedAt;
    }

    // Add metadata if provided
    if (details?.gatewayResponse) {
      entry.metadata = {
        ...entry.metadata,
        gatewayResponse: details.gatewayResponse,
      };
    }

    // Create audit log
    await this.addAuditLog(historyId, {
      action: status as any,
      previousStatus,
      newStatus: status,
      details: details || {},
      source: 'gateway',
    });

    this.log('info', `Updated payment status: ${historyId} from ${previousStatus} to ${status}`);

    return entry;
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(historyId: string, retryDetails?: Record<string, any>): Promise<PaymentHistoryEntry> {
    const entry = this.historyEntries.get(historyId);
    if (!entry) {
      throw new Error(`Payment history entry not found: ${historyId}`);
    }

    entry.retryCount++;
    entry.updatedAt = new Date();

    // Create audit log
    await this.addAuditLog(historyId, {
      action: 'retried',
      previousStatus: entry.status,
      newStatus: entry.status,
      details: {
        retryCount: entry.retryCount,
        ...retryDetails,
      },
      source: 'system',
    });

    this.log('info', `Incremented retry count for payment: ${historyId} (attempt ${entry.retryCount})`);

    return entry;
  }

  /**
   * Get payment history by ID
   */
  async getPaymentHistory(historyId: string): Promise<PaymentHistoryEntry | null> {
    return this.historyEntries.get(historyId) || null;
  }

  /**
   * Get payment history by payout ID
   */
  async getPaymentHistoryByPayout(payoutId: string): Promise<PaymentHistoryEntry[]> {
    return Array.from(this.historyEntries.values())
      .filter(entry => entry.payoutId === payoutId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get payment history by promoter ID
   */
  async getPaymentHistoryByPromoter(
    promoterId: string,
    filters?: {
      status?: PaymentHistoryEntry['status'];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<PaymentHistoryEntry[]> {
    let entries = Array.from(this.historyEntries.values())
      .filter(entry => entry.promoterId === promoterId);

    // Apply filters
    if (filters?.status) {
      entries = entries.filter(entry => entry.status === filters.status);
    }

    if (filters?.startDate) {
      entries = entries.filter(entry => entry.createdAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      entries = entries.filter(entry => entry.createdAt <= filters.endDate!);
    }

    // Sort by creation date (newest first)
    entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply limit
    if (filters?.limit) {
      entries = entries.slice(0, filters.limit);
    }

    return entries;
  }

  /**
   * Get audit logs for a payment
   */
  async getAuditLogs(historyId: string): Promise<PaymentAuditLog[]> {
    return this.auditLogs.get(historyId) || [];
  }

  /**
   * Add audit log entry
   */
  private async addAuditLog(
    historyId: string,
    logData: Omit<PaymentAuditLog, 'id' | 'paymentHistoryId' | 'timestamp'>
  ): Promise<PaymentAuditLog> {
    const auditLog: PaymentAuditLog = {
      ...logData,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentHistoryId: historyId,
      timestamp: new Date(),
    };

    // Validate audit log
    PaymentAuditLogSchema.parse(auditLog);

    // Store audit log
    if (!this.auditLogs.has(historyId)) {
      this.auditLogs.set(historyId, []);
    }
    this.auditLogs.get(historyId)!.push(auditLog);

    return auditLog;
  }

  /**
   * Generate payment summary for a period
   */
  async generatePaymentSummary(
    startDate: Date,
    endDate: Date,
    filters?: {
      promoterId?: string;
      campaignId?: string;
      status?: PaymentHistoryEntry['status'];
    }
  ): Promise<PaymentSummary> {
    let entries = Array.from(this.historyEntries.values())
      .filter(entry => 
        entry.createdAt >= startDate && 
        entry.createdAt <= endDate
      );

    // Apply filters
    if (filters?.promoterId) {
      entries = entries.filter(entry => entry.promoterId === filters.promoterId);
    }

    if (filters?.campaignId) {
      entries = entries.filter(entry => entry.campaignId === filters.campaignId);
    }

    if (filters?.status) {
      entries = entries.filter(entry => entry.status === filters.status);
    }

    // Calculate statistics
    const totalPayments = entries.length;
    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const currency = entries.length > 0 ? entries[0].currency : 'IDR';

    const statusBreakdown = {
      pending: entries.filter(e => e.status === 'pending').length,
      processing: entries.filter(e => e.status === 'processing').length,
      completed: entries.filter(e => e.status === 'completed').length,
      failed: entries.filter(e => e.status === 'failed').length,
      cancelled: entries.filter(e => e.status === 'cancelled').length,
    };

    const amountBreakdown = {
      completed: entries.filter(e => e.status === 'completed').reduce((sum, e) => sum + e.amount, 0),
      failed: entries.filter(e => e.status === 'failed').reduce((sum, e) => sum + e.amount, 0),
      pending: entries.filter(e => e.status === 'pending' || e.status === 'processing').reduce((sum, e) => sum + e.amount, 0),
    };

    const averageAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;
    const successRate = totalPayments > 0 ? (statusBreakdown.completed / totalPayments) * 100 : 0;
    const retryRate = totalPayments > 0 ? (entries.filter(e => e.retryCount > 0).length / totalPayments) * 100 : 0;

    return {
      period: { start: startDate, end: endDate },
      totalPayments,
      totalAmount,
      currency,
      statusBreakdown,
      amountBreakdown,
      averageAmount,
      successRate,
      retryRate,
    };
  }

  /**
   * Get failed payments for retry
   */
  async getFailedPaymentsForRetry(
    maxRetries: number = 3,
    olderThan?: Date
  ): Promise<PaymentHistoryEntry[]> {
    let entries = Array.from(this.historyEntries.values())
      .filter(entry => 
        entry.status === 'failed' && 
        entry.retryCount < maxRetries
      );

    if (olderThan) {
      entries = entries.filter(entry => entry.updatedAt < olderThan);
    }

    return entries.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  }

  /**
   * Export payment history to CSV format
   */
  async exportToCSV(
    startDate: Date,
    endDate: Date,
    filters?: {
      promoterId?: string;
      campaignId?: string;
      status?: PaymentHistoryEntry['status'];
    }
  ): Promise<string> {
    let entries = Array.from(this.historyEntries.values())
      .filter(entry => 
        entry.createdAt >= startDate && 
        entry.createdAt <= endDate
      );

    // Apply filters
    if (filters?.promoterId) {
      entries = entries.filter(entry => entry.promoterId === filters.promoterId);
    }

    if (filters?.campaignId) {
      entries = entries.filter(entry => entry.campaignId === filters.campaignId);
    }

    if (filters?.status) {
      entries = entries.filter(entry => entry.status === filters.status);
    }

    // Sort by creation date
    entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Generate CSV
    const headers = [
      'ID',
      'Payout ID',
      'Promoter ID',
      'Campaign ID',
      'Payment ID',
      'Amount',
      'Currency',
      'Status',
      'Gateway Provider',
      'Transaction ID',
      'Failure Reason',
      'Retry Count',
      'Created At',
      'Processed At',
      'Completed At',
    ];

    const rows = entries.map(entry => [
      entry.id,
      entry.payoutId,
      entry.promoterId,
      entry.campaignId,
      entry.paymentId,
      entry.amount.toString(),
      entry.currency,
      entry.status,
      entry.gatewayProvider,
      entry.transactionId || '',
      entry.failureReason || '',
      entry.retryCount.toString(),
      entry.createdAt.toISOString(),
      entry.processedAt?.toISOString() || '',
      entry.completedAt?.toISOString() || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalEntries: number;
    totalAuditLogs: number;
    statusDistribution: Record<string, number>;
    averageRetryCount: number;
  } {
    const entries = Array.from(this.historyEntries.values());
    const totalAuditLogs = Array.from(this.auditLogs.values())
      .reduce((sum, logs) => sum + logs.length, 0);

    const statusDistribution: Record<string, number> = {};
    let totalRetries = 0;

    entries.forEach(entry => {
      statusDistribution[entry.status] = (statusDistribution[entry.status] || 0) + 1;
      totalRetries += entry.retryCount;
    });

    return {
      totalEntries: entries.length,
      totalAuditLogs,
      statusDistribution,
      averageRetryCount: entries.length > 0 ? totalRetries / entries.length : 0,
    };
  }

  /**
   * Clear old history entries (for maintenance)
   */
  async clearOldEntries(olderThan: Date): Promise<number> {
    const entries = Array.from(this.historyEntries.entries());
    let deletedCount = 0;

    entries.forEach(([id, entry]) => {
      if (entry.createdAt < olderThan) {
        this.historyEntries.delete(id);
        this.auditLogs.delete(id);
        deletedCount++;
      }
    });

    this.log('info', `Cleared ${deletedCount} old payment history entries`);

    return deletedCount;
  }

  /**
   * Logging utility
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [PaymentHistoryManager]`;
    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }
  }
}

// Export factory function
export const createPaymentHistoryManager = () => {
  return new PaymentHistoryManager();
};

// Export helper functions
export const formatPaymentAmount = (amount: number, currency: string = 'IDR'): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(/^Rp\s+/, 'Rp');
};

export const calculatePaymentDuration = (entry: PaymentHistoryEntry): number | null => {
  if (!entry.completedAt) return null;
  return entry.completedAt.getTime() - entry.createdAt.getTime();
};

export const getPaymentStatusColor = (status: PaymentHistoryEntry['status']): string => {
  const colors = {
    pending: '#FFA500',    // Orange
    processing: '#0066CC', // Blue
    completed: '#00AA00',  // Green
    failed: '#CC0000',     // Red
    cancelled: '#666666',  // Gray
  };
  return colors[status] || '#000000';
};