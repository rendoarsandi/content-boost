import {
  PaymentHistoryManager,
  createPaymentHistoryManager,
  PaymentHistoryEntry,
  PaymentSummary,
  formatPaymentAmount,
  calculatePaymentDuration,
  getPaymentStatusColor,
} from '@repo/utils/payment-history';

// Helper function to generate test UUIDs
const generateTestUUID = (suffix: string) =>
  `550e8400-e29b-41d4-a716-${suffix.padStart(12, '0')}`;

describe('PaymentHistoryManager', () => {
  let historyManager: PaymentHistoryManager;

  beforeEach(() => {
    historyManager = createPaymentHistoryManager();
  });

  describe('createPaymentHistory', () => {
    it('should create payment history entry successfully', async () => {
      // Arrange
      const entryData = {
        payoutId: generateTestUUID('001'),
        promoterId: generateTestUUID('002'),
        campaignId: generateTestUUID('003'),
        paymentId: 'payment-1',
        amount: 100000,
        currency: 'IDR',
        status: 'pending' as const,
        gatewayProvider: 'mock',
        retryCount: 0,
      };

      // Act
      const entry = await historyManager.createPaymentHistory(entryData);

      // Assert
      expect(entry).toBeDefined();
      expect(entry.id).toMatch(/^hist_/);
      expect(entry.payoutId).toBe(entryData.payoutId);
      expect(entry.promoterId).toBe(entryData.promoterId);
      expect(entry.amount).toBe(entryData.amount);
      expect(entry.status).toBe(entryData.status);
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate payment history entry', async () => {
      // Arrange - Invalid entry (negative amount)
      const invalidEntry = {
        payoutId: generateTestUUID('004'),
        promoterId: generateTestUUID('005'),
        campaignId: generateTestUUID('006'),
        paymentId: 'payment-invalid',
        amount: -100, // Invalid negative amount
        currency: 'IDR',
        status: 'pending' as const,
        gatewayProvider: 'mock',
        retryCount: 0,
      };

      // Act & Assert
      await expect(
        historyManager.createPaymentHistory(invalidEntry)
      ).rejects.toThrow();
    });

    it('should create audit log when creating history entry', async () => {
      // Arrange
      const entryData = {
        payoutId: generateTestUUID('007'),
        promoterId: generateTestUUID('008'),
        campaignId: generateTestUUID('009'),
        paymentId: 'payment-audit',
        amount: 50000,
        currency: 'IDR',
        status: 'pending' as const,
        gatewayProvider: 'mock',
        retryCount: 0,
      };

      // Act
      const entry = await historyManager.createPaymentHistory(entryData);
      const auditLogs = await historyManager.getAuditLogs(entry.id);

      // Assert
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('created');
      expect(auditLogs[0].newStatus).toBe('pending');
      expect(auditLogs[0].source).toBe('system');
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status successfully', async () => {
      // Arrange
      const entry = await historyManager.createPaymentHistory({
        payoutId: generateTestUUID('010'),
        promoterId: generateTestUUID('011'),
        campaignId: generateTestUUID('012'),
        paymentId: 'payment-update',
        amount: 75000,
        currency: 'IDR',
        status: 'pending',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      // Act
      const updatedEntry = await historyManager.updatePaymentStatus(
        entry.id,
        'completed',
        {
          transactionId: 'TXN123',
          processedAt: new Date(),
          completedAt: new Date(),
        }
      );

      // Assert
      expect(updatedEntry.status).toBe('completed');
      expect(updatedEntry.transactionId).toBe('TXN123');
      expect(updatedEntry.processedAt).toBeInstanceOf(Date);
      expect(updatedEntry.completedAt).toBeInstanceOf(Date);
      expect(updatedEntry.updatedAt.getTime()).toBeGreaterThan(
        entry.updatedAt.getTime()
      );
    });

    it('should create audit log when updating status', async () => {
      // Arrange
      const entry = await historyManager.createPaymentHistory({
        payoutId: generateTestUUID('013'),
        promoterId: generateTestUUID('014'),
        campaignId: generateTestUUID('015'),
        paymentId: 'payment-audit-update',
        amount: 25000,
        currency: 'IDR',
        status: 'pending',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      // Act
      await historyManager.updatePaymentStatus(entry.id, 'failed', {
        failureReason: 'Insufficient funds',
      });

      const auditLogs = await historyManager.getAuditLogs(entry.id);

      // Assert
      expect(auditLogs).toHaveLength(2); // Created + Updated
      const updateLog = auditLogs.find(log => log.action === 'failed');
      expect(updateLog).toBeDefined();
      expect(updateLog!.previousStatus).toBe('pending');
      expect(updateLog!.newStatus).toBe('failed');
      expect(updateLog!.source).toBe('gateway');
    });

    it('should throw error for non-existent payment', async () => {
      // Act & Assert
      await expect(
        historyManager.updatePaymentStatus('non-existent', 'completed')
      ).rejects.toThrow('Payment history entry not found');
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count successfully', async () => {
      // Arrange
      const entry = await historyManager.createPaymentHistory({
        payoutId: 'payout-retry',
        promoterId: 'promoter-retry',
        campaignId: 'campaign-retry',
        paymentId: 'payment-retry',
        amount: 30000,
        currency: 'IDR',
        status: 'failed',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      // Act
      const updatedEntry = await historyManager.incrementRetryCount(entry.id, {
        reason: 'Network timeout',
      });

      // Assert
      expect(updatedEntry.retryCount).toBe(1);
      expect(updatedEntry.updatedAt.getTime()).toBeGreaterThan(
        entry.updatedAt.getTime()
      );

      // Check audit log
      const auditLogs = await historyManager.getAuditLogs(entry.id);
      const retryLog = auditLogs.find(log => log.action === 'retried');
      expect(retryLog).toBeDefined();
      expect(retryLog!.details?.retryCount).toBe(1);
    });
  });

  describe('getPaymentHistory', () => {
    it('should get payment history by ID', async () => {
      // Arrange
      const entry = await historyManager.createPaymentHistory({
        payoutId: 'payout-get',
        promoterId: 'promoter-get',
        campaignId: 'campaign-get',
        paymentId: 'payment-get',
        amount: 40000,
        currency: 'IDR',
        status: 'completed',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      // Act
      const retrievedEntry = await historyManager.getPaymentHistory(entry.id);

      // Assert
      expect(retrievedEntry).toEqual(entry);
    });

    it('should return null for non-existent payment', async () => {
      // Act
      const result = await historyManager.getPaymentHistory('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getPaymentHistoryByPayout', () => {
    it('should get payment history by payout ID', async () => {
      // Arrange
      const payoutId = 'payout-multiple';

      await historyManager.createPaymentHistory({
        payoutId,
        promoterId: 'promoter-1',
        campaignId: 'campaign-1',
        paymentId: 'payment-1',
        amount: 10000,
        currency: 'IDR',
        status: 'completed',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      await historyManager.createPaymentHistory({
        payoutId,
        promoterId: 'promoter-2',
        campaignId: 'campaign-2',
        paymentId: 'payment-2',
        amount: 20000,
        currency: 'IDR',
        status: 'failed',
        gatewayProvider: 'mock',
        retryCount: 1,
      });

      // Act
      const entries = await historyManager.getPaymentHistoryByPayout(payoutId);

      // Assert
      expect(entries).toHaveLength(2);
      expect(entries.every(e => e.payoutId === payoutId)).toBe(true);
      // Should be sorted by creation date (newest first)
      expect(entries[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        entries[1].createdAt.getTime()
      );
    });
  });

  describe('getPaymentHistoryByPromoter', () => {
    it('should get payment history by promoter ID', async () => {
      // Arrange
      const promoterId = 'promoter-history';

      await historyManager.createPaymentHistory({
        payoutId: 'payout-1',
        promoterId,
        campaignId: 'campaign-1',
        paymentId: 'payment-1',
        amount: 15000,
        currency: 'IDR',
        status: 'completed',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      await historyManager.createPaymentHistory({
        payoutId: 'payout-2',
        promoterId,
        campaignId: 'campaign-2',
        paymentId: 'payment-2',
        amount: 25000,
        currency: 'IDR',
        status: 'pending',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      // Act
      const entries =
        await historyManager.getPaymentHistoryByPromoter(promoterId);

      // Assert
      expect(entries).toHaveLength(2);
      expect(entries.every(e => e.promoterId === promoterId)).toBe(true);
    });

    it('should filter payment history by status', async () => {
      // Arrange
      const promoterId = 'promoter-filter';

      await historyManager.createPaymentHistory({
        payoutId: 'payout-completed',
        promoterId,
        campaignId: 'campaign-1',
        paymentId: 'payment-completed',
        amount: 10000,
        currency: 'IDR',
        status: 'completed',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      await historyManager.createPaymentHistory({
        payoutId: 'payout-failed',
        promoterId,
        campaignId: 'campaign-2',
        paymentId: 'payment-failed',
        amount: 20000,
        currency: 'IDR',
        status: 'failed',
        gatewayProvider: 'mock',
        retryCount: 1,
      });

      // Act
      const completedEntries = await historyManager.getPaymentHistoryByPromoter(
        promoterId,
        {
          status: 'completed',
        }
      );

      // Assert
      expect(completedEntries).toHaveLength(1);
      expect(completedEntries[0].status).toBe('completed');
    });

    it('should apply date filters and limit', async () => {
      // Arrange
      const promoterId = 'promoter-date-filter';
      const oldDate = new Date('2024-01-01');
      const newDate = new Date();

      await historyManager.createPaymentHistory({
        payoutId: 'payout-recent',
        promoterId,
        campaignId: 'campaign-recent',
        paymentId: 'payment-recent',
        amount: 10000,
        currency: 'IDR',
        status: 'completed',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      // Act
      const entries = await historyManager.getPaymentHistoryByPromoter(
        promoterId,
        {
          startDate: oldDate,
          endDate: newDate,
          limit: 1,
        }
      );

      // Assert
      expect(entries).toHaveLength(1);
      expect(entries[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe('generatePaymentSummary', () => {
    it('should generate comprehensive payment summary', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Create test data
      await historyManager.createPaymentHistory({
        payoutId: 'payout-summary-1',
        promoterId: 'promoter-summary-1',
        campaignId: 'campaign-summary-1',
        paymentId: 'payment-summary-1',
        amount: 100000,
        currency: 'IDR',
        status: 'completed',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      await historyManager.createPaymentHistory({
        payoutId: 'payout-summary-2',
        promoterId: 'promoter-summary-2',
        campaignId: 'campaign-summary-2',
        paymentId: 'payment-summary-2',
        amount: 50000,
        currency: 'IDR',
        status: 'failed',
        gatewayProvider: 'mock',
        retryCount: 2,
      });

      await historyManager.createPaymentHistory({
        payoutId: 'payout-summary-3',
        promoterId: 'promoter-summary-3',
        campaignId: 'campaign-summary-3',
        paymentId: 'payment-summary-3',
        amount: 75000,
        currency: 'IDR',
        status: 'pending',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      // Act
      const summary = await historyManager.generatePaymentSummary(
        startDate,
        endDate
      );

      // Assert
      expect(summary.totalPayments).toBe(3);
      expect(summary.totalAmount).toBe(225000);
      expect(summary.currency).toBe('IDR');
      expect(summary.statusBreakdown.completed).toBe(1);
      expect(summary.statusBreakdown.failed).toBe(1);
      expect(summary.statusBreakdown.pending).toBe(1);
      expect(summary.amountBreakdown.completed).toBe(100000);
      expect(summary.amountBreakdown.failed).toBe(50000);
      expect(summary.amountBreakdown.pending).toBe(75000);
      expect(summary.averageAmount).toBe(75000);
      expect(summary.successRate).toBeCloseTo(33.33, 1);
      expect(summary.retryRate).toBeCloseTo(33.33, 1);
    });

    it('should filter summary by promoter', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const targetPromoterId = 'promoter-filter-summary';

      await historyManager.createPaymentHistory({
        payoutId: 'payout-filter-1',
        promoterId: targetPromoterId,
        campaignId: 'campaign-filter-1',
        paymentId: 'payment-filter-1',
        amount: 60000,
        currency: 'IDR',
        status: 'completed',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      await historyManager.createPaymentHistory({
        payoutId: 'payout-filter-2',
        promoterId: 'other-promoter',
        campaignId: 'campaign-filter-2',
        paymentId: 'payment-filter-2',
        amount: 40000,
        currency: 'IDR',
        status: 'completed',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      // Act
      const summary = await historyManager.generatePaymentSummary(
        startDate,
        endDate,
        {
          promoterId: targetPromoterId,
        }
      );

      // Assert
      expect(summary.totalPayments).toBe(1);
      expect(summary.totalAmount).toBe(60000);
    });
  });

  describe('getFailedPaymentsForRetry', () => {
    it('should get failed payments eligible for retry', async () => {
      // Arrange
      await historyManager.createPaymentHistory({
        payoutId: 'payout-retry-eligible',
        promoterId: 'promoter-retry-eligible',
        campaignId: 'campaign-retry-eligible',
        paymentId: 'payment-retry-eligible',
        amount: 30000,
        currency: 'IDR',
        status: 'failed',
        gatewayProvider: 'mock',
        retryCount: 1, // Below max retries
      });

      await historyManager.createPaymentHistory({
        payoutId: 'payout-retry-exhausted',
        promoterId: 'promoter-retry-exhausted',
        campaignId: 'campaign-retry-exhausted',
        paymentId: 'payment-retry-exhausted',
        amount: 40000,
        currency: 'IDR',
        status: 'failed',
        gatewayProvider: 'mock',
        retryCount: 3, // At max retries
      });

      // Act
      const eligiblePayments =
        await historyManager.getFailedPaymentsForRetry(3);

      // Assert
      expect(eligiblePayments).toHaveLength(1);
      expect(eligiblePayments[0].paymentId).toBe('payment-retry-eligible');
      expect(eligiblePayments[0].retryCount).toBe(1);
    });
  });

  describe('exportToCSV', () => {
    it('should export payment history to CSV format', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await historyManager.createPaymentHistory({
        payoutId: 'payout-csv',
        promoterId: 'promoter-csv',
        campaignId: 'campaign-csv',
        paymentId: 'payment-csv',
        amount: 50000,
        currency: 'IDR',
        status: 'completed',
        gatewayProvider: 'mock',
        transactionId: 'TXN-CSV-123',
        retryCount: 0,
      });

      // Act
      const csv = await historyManager.exportToCSV(startDate, endDate);

      // Assert
      expect(csv).toContain('ID,Payout ID,Promoter ID'); // Headers
      expect(csv).toContain('payout-csv');
      expect(csv).toContain('promoter-csv');
      expect(csv).toContain('50000');
      expect(csv).toContain('completed');
      expect(csv).toContain('TXN-CSV-123');
    });
  });

  describe('getStatistics', () => {
    it('should return system statistics', async () => {
      // Arrange
      await historyManager.createPaymentHistory({
        payoutId: 'payout-stats',
        promoterId: 'promoter-stats',
        campaignId: 'campaign-stats',
        paymentId: 'payment-stats',
        amount: 20000,
        currency: 'IDR',
        status: 'completed',
        gatewayProvider: 'mock',
        retryCount: 1,
      });

      // Act
      const stats = historyManager.getStatistics();

      // Assert
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.totalAuditLogs).toBeGreaterThan(0);
      expect(stats.statusDistribution).toHaveProperty('completed');
      expect(stats.averageRetryCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearOldEntries', () => {
    it('should clear old payment history entries', async () => {
      // Arrange
      const oldDate = new Date('2020-01-01');

      // Create an old entry (mock by manipulating the created date)
      const entry = await historyManager.createPaymentHistory({
        payoutId: 'payout-old',
        promoterId: 'promoter-old',
        campaignId: 'campaign-old',
        paymentId: 'payment-old',
        amount: 10000,
        currency: 'IDR',
        status: 'completed',
        gatewayProvider: 'mock',
        retryCount: 0,
      });

      // Manually set old date (in real implementation, this would be from database)
      const historyEntries = (historyManager as any).historyEntries;
      const oldEntry = historyEntries.get(entry.id);
      if (oldEntry) {
        oldEntry.createdAt = oldDate;
      }

      // Act
      const deletedCount = await historyManager.clearOldEntries(
        new Date('2021-01-01')
      );

      // Assert
      expect(deletedCount).toBe(1);
      const retrievedEntry = await historyManager.getPaymentHistory(entry.id);
      expect(retrievedEntry).toBeNull();
    });
  });
});

describe('Helper Functions', () => {
  describe('formatPaymentAmount', () => {
    it('should format IDR currency correctly', () => {
      // Act
      const formatted = formatPaymentAmount(100000, 'IDR');

      // Assert
      expect(formatted).toBe('Rp100.000');
    });

    it('should format USD currency correctly', () => {
      // Act
      const formatted = formatPaymentAmount(100, 'USD');

      // Assert
      expect(formatted).toContain('$100');
    });

    it('should use IDR as default currency', () => {
      // Act
      const formatted = formatPaymentAmount(50000);

      // Assert
      expect(formatted).toBe('Rp50.000');
    });
  });

  describe('calculatePaymentDuration', () => {
    it('should calculate payment duration correctly', () => {
      // Arrange
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const completedAt = new Date('2024-01-01T10:05:00Z');

      const entry: PaymentHistoryEntry = {
        id: 'test-duration',
        payoutId: 'payout-duration',
        promoterId: 'promoter-duration',
        campaignId: 'campaign-duration',
        paymentId: 'payment-duration',
        amount: 10000,
        currency: 'IDR',
        status: 'completed',
        gatewayProvider: 'mock',
        retryCount: 0,
        createdAt,
        completedAt,
        updatedAt: completedAt,
      };

      // Act
      const duration = calculatePaymentDuration(entry);

      // Assert
      expect(duration).toBe(5 * 60 * 1000); // 5 minutes in milliseconds
    });

    it('should return null for incomplete payments', () => {
      // Arrange
      const entry: PaymentHistoryEntry = {
        id: 'test-incomplete',
        payoutId: 'payout-incomplete',
        promoterId: 'promoter-incomplete',
        campaignId: 'campaign-incomplete',
        paymentId: 'payment-incomplete',
        amount: 10000,
        currency: 'IDR',
        status: 'pending',
        gatewayProvider: 'mock',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const duration = calculatePaymentDuration(entry);

      // Assert
      expect(duration).toBeNull();
    });
  });

  describe('getPaymentStatusColor', () => {
    it('should return correct colors for each status', () => {
      // Act & Assert
      expect(getPaymentStatusColor('pending')).toBe('#FFA500');
      expect(getPaymentStatusColor('processing')).toBe('#0066CC');
      expect(getPaymentStatusColor('completed')).toBe('#00AA00');
      expect(getPaymentStatusColor('failed')).toBe('#CC0000');
      expect(getPaymentStatusColor('cancelled')).toBe('#666666');
    });

    it('should return default color for unknown status', () => {
      // Act
      const color = getPaymentStatusColor('unknown' as any);

      // Assert
      expect(color).toBe('#000000');
    });
  });
});

describe('createPaymentHistoryManager', () => {
  it('should create payment history manager instance', () => {
    // Act
    const manager = createPaymentHistoryManager();

    // Assert
    expect(manager).toBeInstanceOf(PaymentHistoryManager);
  });
});
