import { 
  PaymentProcessor, 
  MockPaymentGateway, 
  createPaymentProcessor, 
  createMockPaymentGateway,
  PaymentRequest,
  PaymentResponse,
  PaymentNotification
} from '../src/payment-processor';

// Helper function to generate test UUIDs
const generateTestUUID = (suffix: string) => {
  const paddedSuffix = suffix.padStart(12, '0');
  return `550e8400-e29b-41d4-a716-${paddedSuffix}`;
};

describe('MockPaymentGateway', () => {
  let gateway: MockPaymentGateway;

  beforeEach(() => {
    gateway = createMockPaymentGateway({
      provider: 'mock',
      apiKey: 'test-key',
      environment: 'sandbox',
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      // Arrange
      const request: PaymentRequest = {
        id: 'payment-1',
        payoutId: 'payout-1',
        promoterId: 'promoter-1',
        amount: 100000,
        currency: 'IDR',
        description: 'Test payment',
        recipientInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          bankAccount: {
            bankCode: 'BCA',
            accountNumber: '1234567890',
            accountName: 'John Doe',
          },
        },
        createdAt: new Date(),
      };

      // Act
      const response = await gateway.processPayment(request);

      // Assert
      expect(response).toBeDefined();
      expect(response.id).toBe(request.id);
      expect(response.amount).toBe(request.amount);
      expect(response.currency).toBe(request.currency);
      expect(response.status).toMatch(/processing|failed/);
      expect(response.paymentId).toMatch(/^mock_payment_/);
      expect(response.processedAt).toBeInstanceOf(Date);
    });

    it('should handle payment failures', async () => {
      // Arrange
      const request: PaymentRequest = {
        id: 'payment-2',
        payoutId: 'payout-2',
        promoterId: 'promoter-2',
        amount: 50000,
        currency: 'IDR',
        description: 'Test payment',
        recipientInfo: {
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
        createdAt: new Date(),
      };

      // Act - Run multiple times to catch random failures
      const responses = await Promise.all(
        Array.from({ length: 20 }, () => gateway.processPayment({
          ...request,
          id: `payment-${Math.random()}`,
        }))
      );

      // Assert - Should have some failures due to 10% failure rate
      const failedResponses = responses.filter(r => r.status === 'failed');
      expect(failedResponses.length).toBeGreaterThan(0);
      
      failedResponses.forEach(response => {
        expect(response.failureReason).toBeDefined();
        expect(response.transactionId).toBeUndefined();
      });
    });
  });

  describe('checkPaymentStatus', () => {
    it('should return payment status', async () => {
      // Arrange
      const request: PaymentRequest = {
        id: 'payment-3',
        payoutId: 'payout-3',
        promoterId: 'promoter-3',
        amount: 75000,
        currency: 'IDR',
        description: 'Test payment',
        recipientInfo: {
          name: 'Bob Smith',
        },
        createdAt: new Date(),
      };

      const initialResponse = await gateway.processPayment(request);

      // Act
      const statusResponse = await gateway.checkPaymentStatus(initialResponse.paymentId);

      // Assert
      expect(statusResponse).toBeDefined();
      expect(statusResponse.paymentId).toBe(initialResponse.paymentId);
      expect(statusResponse.amount).toBe(request.amount);
    });

    it('should throw error for non-existent payment', async () => {
      // Act & Assert
      await expect(gateway.checkPaymentStatus('non-existent')).rejects.toThrow('Payment not found');
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
      // Arrange
      const request: PaymentRequest = {
        id: 'payment-4',
        payoutId: 'payout-4',
        promoterId: 'promoter-4',
        amount: 25000,
        currency: 'IDR',
        description: 'Test payment',
        recipientInfo: {
          name: 'Alice Johnson',
        },
        createdAt: new Date(),
      };

      const initialResponse = await gateway.processPayment(request);

      // Act
      const cancelResponse = await gateway.cancelPayment(initialResponse.paymentId);

      // Assert
      expect(cancelResponse.status).toBe('cancelled');
      expect(cancelResponse.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history', async () => {
      // Arrange - Create some transactions
      const requests = Array.from({ length: 5 }, (_, i) => ({
        id: `payment-${i}`,
        payoutId: `payout-${i}`,
        promoterId: `promoter-${i}`,
        amount: 10000 * (i + 1),
        currency: 'IDR',
        description: `Test payment ${i}`,
        recipientInfo: {
          name: `User ${i}`,
        },
        createdAt: new Date(),
      }));

      await Promise.all(requests.map(req => gateway.processPayment(req)));

      // Act
      const history = await gateway.getTransactionHistory();

      // Assert
      expect(history).toHaveLength(5);
      expect(history[0]).toHaveProperty('paymentId');
      expect(history[0]).toHaveProperty('amount');
      expect(history[0]).toHaveProperty('status');
    });

    it('should filter transaction history', async () => {
      // Arrange
      const oldDate = new Date('2024-01-01');
      const newDate = new Date();

      // Act
      const filteredHistory = await gateway.getTransactionHistory({
        startDate: oldDate,
        endDate: newDate,
        limit: 3,
      });

      // Assert
      expect(filteredHistory.length).toBeLessThanOrEqual(3);
    });
  });
});

describe('PaymentProcessor', () => {
  let processor: PaymentProcessor;
  let mockGateway: MockPaymentGateway;
  let mockStatusUpdate: jest.Mock;
  let mockNotification: jest.Mock;

  beforeEach(() => {
    mockGateway = createMockPaymentGateway({
      provider: 'mock',
      apiKey: 'test-key',
      environment: 'sandbox',
    });

    processor = createPaymentProcessor(mockGateway, {
      maxRetries: 2,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
    });

    mockStatusUpdate = jest.fn();
    mockNotification = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      // Arrange
      const request: PaymentRequest = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        payoutId: '550e8400-e29b-41d4-a716-446655440002',
        promoterId: '550e8400-e29b-41d4-a716-446655440003',
        amount: 100000,
        currency: 'IDR',
        description: 'Successful payment test',
        recipientInfo: {
          name: 'Success User',
          email: 'success@example.com',
        },
        createdAt: new Date(),
      };

      // Mock successful processing
      jest.spyOn(mockGateway, 'processPayment').mockResolvedValue({
        id: request.id,
        paymentId: 'mock_payment_success',
        status: 'completed',
        amount: request.amount,
        currency: request.currency,
        transactionId: 'TXN123',
        processedAt: new Date(),
        completedAt: new Date(),
      });

      // Act
      const response = await processor.processPayment(
        request,
        mockStatusUpdate,
        mockNotification
      );

      // Assert
      expect(response.status).toBe('completed');
      expect(response.transactionId).toBe('TXN123');
      expect(mockStatusUpdate).toHaveBeenCalled();
      expect(mockNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          promoterId: request.promoterId,
          status: 'completed',
          amount: request.amount,
        })
      );
    });

    it('should handle processing status and wait for completion', async () => {
      // Arrange
      const request: PaymentRequest = {
        id: 'payment-processing',
        payoutId: 'payout-processing',
        promoterId: 'promoter-processing',
        amount: 50000,
        currency: 'IDR',
        description: 'Processing payment test',
        recipientInfo: {
          name: 'Processing User',
        },
        createdAt: new Date(),
      };

      // Mock processing then completion
      jest.spyOn(mockGateway, 'processPayment').mockResolvedValue({
        id: request.id,
        paymentId: 'mock_payment_processing',
        status: 'processing',
        amount: request.amount,
        currency: request.currency,
        processedAt: new Date(),
      });

      jest.spyOn(mockGateway, 'checkPaymentStatus').mockResolvedValue({
        id: request.id,
        paymentId: 'mock_payment_processing',
        status: 'completed',
        amount: request.amount,
        currency: request.currency,
        transactionId: 'TXN456',
        processedAt: new Date(),
        completedAt: new Date(),
      });

      // Act
      const response = await processor.processPayment(request);

      // Assert
      expect(response.status).toBe('completed');
      expect(response.transactionId).toBe('TXN456');
      expect(mockGateway.checkPaymentStatus).toHaveBeenCalled();
    });

    it('should retry failed payments', async () => {
      // Arrange
      const request: PaymentRequest = {
        id: 'payment-retry',
        payoutId: 'payout-retry',
        promoterId: 'promoter-retry',
        amount: 75000,
        currency: 'IDR',
        description: 'Retry payment test',
        recipientInfo: {
          name: 'Retry User',
        },
        createdAt: new Date(),
      };

      // Mock first attempt failure, second attempt success
      jest.spyOn(mockGateway, 'processPayment')
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          id: request.id,
          paymentId: 'mock_payment_retry',
          status: 'completed',
          amount: request.amount,
          currency: request.currency,
          transactionId: 'TXN789',
          processedAt: new Date(),
          completedAt: new Date(),
        });

      // Act
      const response = await processor.processPayment(request);

      // Assert
      expect(response.status).toBe('completed');
      expect(response.transactionId).toBe('TXN789');
      expect(mockGateway.processPayment).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      // Arrange
      const request: PaymentRequest = {
        id: 'payment-fail',
        payoutId: 'payout-fail',
        promoterId: 'promoter-fail',
        amount: 25000,
        currency: 'IDR',
        description: 'Failed payment test',
        recipientInfo: {
          name: 'Fail User',
        },
        createdAt: new Date(),
      };

      // Mock all attempts failing
      jest.spyOn(mockGateway, 'processPayment')
        .mockRejectedValue(new Error('Payment gateway error'));

      // Act
      const response = await processor.processPayment(
        request,
        mockStatusUpdate,
        mockNotification
      );

      // Assert
      expect(response.status).toBe('failed');
      expect(response.failureReason).toContain('Payment gateway error');
      expect(mockGateway.processPayment).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(mockNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          promoterId: request.promoterId,
          status: 'failed',
          error: 'Payment gateway error',
        })
      );
    });

    it('should validate payment request', async () => {
      // Arrange - Invalid request (missing required fields)
      const invalidRequest = {
        id: 'invalid-payment',
        amount: -100, // Invalid negative amount
        currency: 'INVALID', // Invalid currency code
      } as PaymentRequest;

      // Act & Assert
      await expect(processor.processPayment(invalidRequest)).rejects.toThrow();
    });
  });

  describe('processBatchPayments', () => {
    it('should process multiple payments in batch', async () => {
      // Arrange
      const requests: PaymentRequest[] = Array.from({ length: 5 }, (_, i) => ({
        id: `batch-payment-${i}`,
        payoutId: `batch-payout-${i}`,
        promoterId: `batch-promoter-${i}`,
        amount: 10000 * (i + 1),
        currency: 'IDR',
        description: `Batch payment ${i}`,
        recipientInfo: {
          name: `Batch User ${i}`,
        },
        createdAt: new Date(),
      }));

      // Mock successful processing for all
      jest.spyOn(mockGateway, 'processPayment').mockImplementation(async (req) => ({
        id: req.id,
        paymentId: `mock_${req.id}`,
        status: 'completed',
        amount: req.amount,
        currency: req.currency,
        transactionId: `TXN_${req.id}`,
        processedAt: new Date(),
        completedAt: new Date(),
      }));

      // Act
      const responses = await processor.processBatchPayments(
        requests,
        mockStatusUpdate,
        mockNotification,
        2 // Concurrency of 2
      );

      // Assert
      expect(responses).toHaveLength(5);
      expect(responses.every(r => r.status === 'completed')).toBe(true);
      expect(mockStatusUpdate).toHaveBeenCalledTimes(5);
      expect(mockNotification).toHaveBeenCalledTimes(5);
    });

    it('should handle mixed success and failure in batch', async () => {
      // Arrange
      const requests: PaymentRequest[] = [
        {
          id: 'batch-success',
          payoutId: 'payout-1',
          promoterId: 'promoter-1',
          amount: 10000,
          currency: 'IDR',
          description: 'Success payment',
          recipientInfo: { name: 'Success User' },
          createdAt: new Date(),
        },
        {
          id: 'batch-fail',
          payoutId: 'payout-2',
          promoterId: 'promoter-2',
          amount: 20000,
          currency: 'IDR',
          description: 'Fail payment',
          recipientInfo: { name: 'Fail User' },
          createdAt: new Date(),
        },
      ];

      // Mock mixed results
      jest.spyOn(mockGateway, 'processPayment').mockImplementation(async (req) => {
        if (req.id === 'batch-success') {
          return {
            id: req.id,
            paymentId: `mock_${req.id}`,
            status: 'completed',
            amount: req.amount,
            currency: req.currency,
            transactionId: `TXN_${req.id}`,
            processedAt: new Date(),
            completedAt: new Date(),
          };
        } else {
          throw new Error('Payment failed');
        }
      });

      // Act
      const responses = await processor.processBatchPayments(requests);

      // Assert
      expect(responses).toHaveLength(2);
      expect(responses[0].status).toBe('completed');
      expect(responses[1].status).toBe('failed');
      expect(responses[1].failureReason).toContain('Payment failed');
    });

    it('should prevent concurrent batch processing', async () => {
      // Arrange
      const requests: PaymentRequest[] = [{
        id: 'concurrent-test',
        payoutId: 'payout-concurrent',
        promoterId: 'promoter-concurrent',
        amount: 10000,
        currency: 'IDR',
        description: 'Concurrent test',
        recipientInfo: { name: 'Concurrent User' },
        createdAt: new Date(),
      }];

      // Mock slow processing
      jest.spyOn(mockGateway, 'processPayment').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          id: 'concurrent-test',
          paymentId: 'mock_concurrent',
          status: 'completed',
          amount: 10000,
          currency: 'IDR',
          processedAt: new Date(),
          completedAt: new Date(),
        }), 100))
      );

      // Act
      const promise1 = processor.processBatchPayments(requests);
      const promise2 = processor.processBatchPayments(requests);

      // Assert
      await expect(promise2).rejects.toThrow('Batch payment processing is already in progress');
      await promise1; // Wait for first to complete
    });
  });

  describe('getStatus', () => {
    it('should return processor status', () => {
      // Act
      const status = processor.getStatus();

      // Assert
      expect(status).toHaveProperty('isProcessing', false);
      expect(status).toHaveProperty('queueSize', 0);
      expect(status).toHaveProperty('retryConfig');
      expect(status).toHaveProperty('activePayments');
      expect(status.retryConfig.maxRetries).toBe(2);
      expect(status.activePayments).toEqual([]);
    });
  });

  describe('updateRetryConfig', () => {
    it('should update retry configuration', () => {
      // Arrange
      const newConfig = {
        maxRetries: 5,
        baseDelayMs: 500,
      };

      // Act
      processor.updateRetryConfig(newConfig);
      const status = processor.getStatus();

      // Assert
      expect(status.retryConfig.maxRetries).toBe(5);
      expect(status.retryConfig.baseDelayMs).toBe(500);
      expect(status.retryConfig.backoffMultiplier).toBe(2); // Should preserve existing values
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
      // Arrange
      const paymentId = 'payment-to-cancel';

      jest.spyOn(mockGateway, 'cancelPayment').mockResolvedValue({
        id: 'cancel-test',
        paymentId,
        status: 'cancelled',
        amount: 10000,
        currency: 'IDR',
        completedAt: new Date(),
      });

      // Act
      const response = await processor.cancelPayment(paymentId);

      // Assert
      expect(response.status).toBe('cancelled');
      expect(response.paymentId).toBe(paymentId);
      expect(mockGateway.cancelPayment).toHaveBeenCalledWith(paymentId);
    });
  });

  describe('getTransactionHistory', () => {
    it('should get transaction history', async () => {
      // Arrange
      const mockHistory = [
        {
          id: 'hist-1',
          paymentId: 'payment-1',
          status: 'completed' as const,
          amount: 10000,
          currency: 'IDR',
          processedAt: new Date(),
        },
      ];

      jest.spyOn(mockGateway, 'getTransactionHistory').mockResolvedValue(mockHistory);

      // Act
      const history = await processor.getTransactionHistory({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      // Assert
      expect(history).toEqual(mockHistory);
      expect(mockGateway.getTransactionHistory).toHaveBeenCalledWith({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });
    });
  });
});

describe('createPaymentProcessor', () => {
  it('should create payment processor with default config', () => {
    // Arrange
    const gateway = createMockPaymentGateway({
      provider: 'mock',
      apiKey: 'test',
      environment: 'sandbox',
    });

    // Act
    const processor = createPaymentProcessor(gateway);

    // Assert
    expect(processor).toBeInstanceOf(PaymentProcessor);
    const status = processor.getStatus();
    expect(status.retryConfig.maxRetries).toBe(3);
    expect(status.retryConfig.baseDelayMs).toBe(1000);
  });

  it('should create payment processor with custom config', () => {
    // Arrange
    const gateway = createMockPaymentGateway({
      provider: 'mock',
      apiKey: 'test',
      environment: 'sandbox',
    });

    const config = {
      maxRetries: 5,
      baseDelayMs: 2000,
      maxDelayMs: 60000,
      backoffMultiplier: 3,
    };

    // Act
    const processor = createPaymentProcessor(gateway, config);

    // Assert
    const status = processor.getStatus();
    expect(status.retryConfig).toEqual(config);
  });
});