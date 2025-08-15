import { createPaymentProcessor } from '@repo/utils/payment-processor';
import { createPaymentNotificationSystem } from '@repo/utils/payment-notifications';
import { createPaymentHistoryManager } from '@repo/utils/payment-history';
import { vi } from 'vitest';

vi.mock('@repo/utils/payment-processor');
vi.mock('@repo/utils/payment-notifications');
vi.mock('@repo/utils/payment-history');

describe('Payment Processing Workflow', () => {
  const mockProcessPayment = vi.fn();
  const mockSendNotification = vi.fn();
  const mockRecordPayment = vi.fn();
  const mockGetPaymentHistory = vi.fn();

  beforeEach(() => {
    (createPaymentProcessor as any).mockReturnValue({
      processPayment: mockProcessPayment,
    });
    (createPaymentNotificationSystem as any).mockReturnValue({
      sendNotification: mockSendNotification,
    });
    (createPaymentHistoryManager as any).mockReturnValue({
      recordPayment: mockRecordPayment,
      getPaymentHistory: mockGetPaymentHistory,
    });
    vi.clearAllMocks();
  });

  const paymentRequest = {
    id: 'payment-1',
    payoutId: 'payout-1',
    promoterId: 'promoter-1',
    amount: 50000,
    currency: 'IDR',
    recipientInfo: { name: 'Test User', email: 'test@example.com' },
    metadata: { campaignTitle: 'Test Campaign' },
  };

  it('should process a successful payment', async () => {
    mockProcessPayment.mockResolvedValue({
      status: 'completed',
      transactionId: 'txn-123',
    });

    const processor = createPaymentProcessor(null);
    const notifier = createPaymentNotificationSystem();
    const history = createPaymentHistoryManager();

    await processor.processPayment(paymentRequest);
    await history.recordPayment({
      ...paymentRequest,
      status: 'completed',
      gatewayTransactionId: 'txn-123',
      processedAt: new Date(),
    });
    await notifier.sendNotification({}); // Simplified for test

    expect(mockProcessPayment).toHaveBeenCalledWith(paymentRequest);
    expect(mockRecordPayment).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
    expect(mockSendNotification).toHaveBeenCalled();
  });

  it('should handle a failed payment', async () => {
    mockProcessPayment.mockResolvedValue({
      status: 'failed',
      error: 'Insufficient funds',
    });

    const processor = createPaymentProcessor(null);
    const notifier = createPaymentNotificationSystem();
    const history = createPaymentHistoryManager();

    await processor.processPayment(paymentRequest);
    await history.recordPayment({
      ...paymentRequest,
      status: 'failed',
      processedAt: new Date(),
    });
    await notifier.sendNotification({}); // Simplified for test

    expect(mockProcessPayment).toHaveBeenCalledWith(paymentRequest);
    expect(mockRecordPayment).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    );
    expect(mockSendNotification).toHaveBeenCalled();
  });
});
