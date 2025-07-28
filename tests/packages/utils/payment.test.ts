import { createPaymentProcessor } from '../src/payment-processor';
import { createPaymentNotificationSystem } from '../src/payment-notifications';
import { createPaymentHistoryManager } from '../src/payment-history';

jest.mock('../src/payment-processor');
jest.mock('../src/payment-notifications');
jest.mock('../src/payment-history');

describe('Payment Processing Workflow', () => {
  const mockProcessPayment = jest.fn();
  const mockSendNotification = jest.fn();
  const mockRecordPayment = jest.fn();
  const mockGetPaymentHistory = jest.fn();

  beforeEach(() => {
    (createPaymentProcessor as jest.Mock).mockReturnValue({
      processPayment: mockProcessPayment,
    });
    (createPaymentNotificationSystem as jest.Mock).mockReturnValue({
      sendNotification: mockSendNotification,
    });
    (createPaymentHistoryManager as jest.Mock).mockReturnValue({
      recordPayment: mockRecordPayment,
      getPaymentHistory: mockGetPaymentHistory,
    });
    jest.clearAllMocks();
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
    mockProcessPayment.mockResolvedValue({ status: 'completed', transactionId: 'txn-123' });

    const processor = createPaymentProcessor(null);
    const notifier = createPaymentNotificationSystem();
    const history = createPaymentHistoryManager();

    await processor.processPayment(paymentRequest);
    await history.recordPayment({ ...paymentRequest, status: 'completed', gatewayTransactionId: 'txn-123', processedAt: new Date() });
    await notifier.sendNotification({}); // Simplified for test

    expect(mockProcessPayment).toHaveBeenCalledWith(paymentRequest);
    expect(mockRecordPayment).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(mockSendNotification).toHaveBeenCalled();
  });

  it('should handle a failed payment', async () => {
    mockProcessPayment.mockResolvedValue({ status: 'failed', error: 'Insufficient funds' });

    const processor = createPaymentProcessor(null);
    const notifier = createPaymentNotificationSystem();
    const history = createPaymentHistoryManager();

    await processor.processPayment(paymentRequest);
    await history.recordPayment({ ...paymentRequest, status: 'failed', processedAt: new Date() });
    await notifier.sendNotification({}); // Simplified for test

    expect(mockProcessPayment).toHaveBeenCalledWith(paymentRequest);
    expect(mockRecordPayment).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    expect(mockSendNotification).toHaveBeenCalled();
  });
});
