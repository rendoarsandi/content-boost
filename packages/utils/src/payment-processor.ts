import { z } from 'zod';
import { calculateRetryDelay, PaymentRetryConfig } from './payment';

// Payment gateway types
export interface PaymentGatewayConfig {
  provider: 'mock' | 'xendit' | 'midtrans' | 'gopay';
  apiKey: string;
  secretKey?: string;
  environment: 'sandbox' | 'production';
  webhookUrl?: string;
  callbackUrl?: string;
}

export interface PaymentRequest {
  id: string;
  payoutId: string;
  promoterId: string;
  amount: number;
  currency: string;
  description: string;
  recipientInfo: {
    name: string;
    email?: string;
    phone?: string;
    bankAccount?: {
      bankCode: string;
      accountNumber: string;
      accountName: string;
    };
    eWallet?: {
      type: 'gopay' | 'ovo' | 'dana' | 'linkaja';
      accountNumber: string;
    };
  };
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface PaymentResponse {
  id: string;
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  gatewayResponse?: any;
  transactionId?: string;
  failureReason?: string;
  error?: string;
  processedAt?: Date;
  completedAt?: Date;
}

export interface PaymentNotification {
  id: string;
  promoterId: string;
  payoutId: string;
  amount: number;
  status: 'completed' | 'failed';
  message: string;
  error?: string;
  timestamp: Date;
}

// Validation schemas
export const PaymentRequestSchema = z.object({
  id: z.string().uuid(),
  payoutId: z.string().uuid(),
  promoterId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string().min(1),
  recipientInfo: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    bankAccount: z.object({
      bankCode: z.string(),
      accountNumber: z.string(),
      accountName: z.string(),
    }).optional(),
    eWallet: z.object({
      type: z.enum(['gopay', 'ovo', 'dana', 'linkaja']),
      accountNumber: z.string(),
    }).optional(),
  }),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
});

/**
 * Payment Gateway Interface
 */
export interface PaymentGateway {
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;
  checkPaymentStatus(paymentId: string): Promise<PaymentResponse>;
  cancelPayment(paymentId: string): Promise<PaymentResponse>;
  getTransactionHistory(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    limit?: number;
  }): Promise<PaymentResponse[]>;
}

/**
 * Mock Payment Gateway for testing and development
 */
export class MockPaymentGateway implements PaymentGateway {
  private config: PaymentGatewayConfig;
  private payments: Map<string, PaymentResponse> = new Map();

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate random failures for testing (10% failure rate)
    const shouldFail = Math.random() < 0.1;

    const response: PaymentResponse = {
      id: request.id,
      paymentId: `mock_payment_${Date.now()}`,
      status: shouldFail ? 'failed' : 'processing',
      amount: request.amount,
      currency: request.currency,
      gatewayResponse: {
        provider: 'mock',
        timestamp: new Date().toISOString(),
        reference: `REF${Date.now()}`,
      },
      transactionId: shouldFail ? undefined : `TXN${Date.now()}`,
      failureReason: shouldFail ? 'Insufficient funds or invalid account' : undefined,
      processedAt: new Date(),
      completedAt: shouldFail ? undefined : new Date(),
    };

    // Store payment for status checking
    this.payments.set(response.paymentId, response);

    // Simulate completion after a delay for successful payments
    if (!shouldFail) {
      setTimeout(() => {
        const payment = this.payments.get(response.paymentId);
        if (payment) {
          payment.status = 'completed';
          payment.completedAt = new Date();
        }
      }, 2000);
    }

    return response;
  }

  async checkPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }
    return { ...payment };
  }

  async cancelPayment(paymentId: string): Promise<PaymentResponse> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    payment.status = 'cancelled';
    payment.completedAt = new Date();
    return { ...payment };
  }

  async getTransactionHistory(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    limit?: number;
  }): Promise<PaymentResponse[]> {
    let payments = Array.from(this.payments.values());

    if (filters?.startDate) {
      payments = payments.filter(p => p.processedAt && p.processedAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      payments = payments.filter(p => p.processedAt && p.processedAt <= filters.endDate!);
    }

    if (filters?.status) {
      payments = payments.filter(p => p.status === filters.status);
    }

    if (filters?.limit) {
      payments = payments.slice(0, filters.limit);
    }

    return payments;
  }
}

/**
 * Payment Processor with Retry Mechanism
 * Requirements: 6.4, 6.5, 6.6 - Payment processing with retry and notifications
 */
export class PaymentProcessor {
  private gateway: PaymentGateway;
  private retryConfig: PaymentRetryConfig;
  private processingQueue: Map<string, PaymentRequest> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private isProcessing: boolean = false;

  constructor(
    gateway: PaymentGateway,
    retryConfig: Partial<PaymentRetryConfig> = {}
  ) {
    this.gateway = gateway;
    this.retryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      ...retryConfig,
    };
  }

  /**
   * Process a single payment with retry mechanism
   * Requirement 6.4: Implementasi payment gateway integration dengan error handling
   * Requirement 6.6: Setup retry mechanism dengan exponential backoff untuk failed payments
   */
  async processPayment(
    request: PaymentRequest,
    onStatusUpdate?: (status: PaymentResponse) => Promise<void>,
    onNotification?: (notification: PaymentNotification) => Promise<void>
  ): Promise<PaymentResponse> {
    // Validate request
    const validatedRequest = PaymentRequestSchema.parse(request);

    this.log('info', `Processing payment ${request.id} for promoter ${request.promoterId} - Amount: ${request.currency} ${request.amount.toLocaleString('id-ID')}`);

    let lastError: Error | null = null;
    let attemptNumber = 0;

    while (attemptNumber <= this.retryConfig.maxRetries) {
      attemptNumber++;

      try {
        // Add to processing queue
        this.processingQueue.set(request.id, request);
        this.retryAttempts.set(request.id, attemptNumber);

        // Process payment through gateway
        const response = await this.gateway.processPayment(request);

        // Update status if callback provided
        if (onStatusUpdate) {
          await onStatusUpdate(response);
        }

        // Handle different response statuses
        if (response.status === 'completed') {
          this.log('info', `Payment completed successfully: ${request.id}`);
          
          // Send success notification
          if (onNotification) {
            await onNotification({
              id: `notif_${request.id}_${Date.now()}`,
              promoterId: request.promoterId,
              payoutId: request.payoutId,
              amount: request.amount,
              status: 'completed',
              message: `Payment of ${request.currency} ${request.amount.toLocaleString('id-ID')} has been processed successfully.`,
              timestamp: new Date(),
            });
          }

          // Clean up
          this.processingQueue.delete(request.id);
          this.retryAttempts.delete(request.id);

          return response;

        } else if (response.status === 'processing') {
          this.log('info', `Payment is processing: ${request.id} - Will check status periodically`);
          
          // Wait for completion or timeout
          const finalResponse = await this.waitForCompletion(response, onStatusUpdate);
          
          if (finalResponse.status === 'completed') {
            // Send success notification
            if (onNotification) {
              await onNotification({
                id: `notif_${request.id}_${Date.now()}`,
                promoterId: request.promoterId,
                payoutId: request.payoutId,
                amount: request.amount,
                status: 'completed',
                message: `Payment of ${request.currency} ${request.amount.toLocaleString('id-ID')} has been processed successfully.`,
                timestamp: new Date(),
              });
            }

            // Clean up
            this.processingQueue.delete(request.id);
            this.retryAttempts.delete(request.id);

            return finalResponse;
          } else {
            // Processing failed or timed out
            throw new Error(finalResponse.failureReason || 'Payment processing failed or timed out');
          }

        } else if (response.status === 'failed') {
          throw new Error(response.failureReason || 'Payment failed');
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        this.log('error', `Payment attempt ${attemptNumber} failed for ${request.id}: ${lastError.message}`);

        // If we've reached max retries, give up
        if (attemptNumber >= this.retryConfig.maxRetries) {
          break;
        }

        // Calculate delay for next retry
        const delay = calculateRetryDelay(attemptNumber, this.retryConfig);
        this.log('info', `Retrying payment ${request.id} in ${delay}ms (attempt ${attemptNumber + 1}/${this.retryConfig.maxRetries})`);

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    this.log('error', `Payment failed after ${this.retryConfig.maxRetries} attempts: ${request.id}`);

    // Send failure notification
    if (onNotification) {
      await onNotification({
        id: `notif_${request.id}_${Date.now()}`,
        promoterId: request.promoterId,
        payoutId: request.payoutId,
        amount: request.amount,
        status: 'failed',
        message: `Payment of ${request.currency} ${request.amount.toLocaleString('id-ID')} failed after ${this.retryConfig.maxRetries} attempts.`,
        error: lastError?.message,
        timestamp: new Date(),
      });
    }

    // Clean up
    this.processingQueue.delete(request.id);
    this.retryAttempts.delete(request.id);

    // Return failed response
    return {
      id: request.id,
      paymentId: `failed_${request.id}`,
      status: 'failed',
      amount: request.amount,
      currency: request.currency,
      failureReason: lastError?.message || 'Payment failed after maximum retries',
      processedAt: new Date(),
    };
  }

  /**
   * Process multiple payments in batch
   */
  async processBatchPayments(
    requests: PaymentRequest[],
    onStatusUpdate?: (paymentId: string, status: PaymentResponse) => Promise<void>,
    onNotification?: (notification: PaymentNotification) => Promise<void>,
    concurrency: number = 5
  ): Promise<PaymentResponse[]> {
    if (this.isProcessing) {
      throw new Error('Batch payment processing is already in progress');
    }

    this.isProcessing = true;
    this.log('info', `Starting batch payment processing: ${requests.length} payments`);

    try {
      const results: PaymentResponse[] = [];
      
      // Process payments in batches with limited concurrency
      for (let i = 0; i < requests.length; i += concurrency) {
        const batch = requests.slice(i, i + concurrency);
        
        this.log('info', `Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(requests.length / concurrency)} (${batch.length} payments)`);

        // Process batch in parallel
        const batchPromises = batch.map(request =>
          this.processPayment(
            request,
            onStatusUpdate ? (status) => onStatusUpdate(request.id, status) : undefined,
            onNotification
          )
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        // Collect results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            // Create failed response for rejected promises
            const request = batch[index];
            results.push({
              id: request.id,
              paymentId: `failed_${request.id}`,
              status: 'failed',
              amount: request.amount,
              currency: request.currency,
              failureReason: result.reason instanceof Error ? result.reason.message : 'Unknown error',
              processedAt: new Date(),
            });
          }
        });

        // Small delay between batches
        if (i + concurrency < requests.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = results.filter(r => r.status === 'completed').length;
      const failureCount = results.filter(r => r.status === 'failed').length;
      
      this.log('info', `Batch payment processing completed: ${successCount} successful, ${failureCount} failed`);

      return results;

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Wait for payment completion with timeout
   */
  private async waitForCompletion(
    initialResponse: PaymentResponse,
    onStatusUpdate?: (status: PaymentResponse) => Promise<void>,
    timeoutMs: number = 300000 // 5 minutes
  ): Promise<PaymentResponse> {
    const startTime = Date.now();
    let currentResponse = initialResponse;

    while (Date.now() - startTime < timeoutMs) {
      // Wait before checking status
      await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds

      try {
        // Check payment status
        currentResponse = await this.gateway.checkPaymentStatus(initialResponse.paymentId);

        // Update status if callback provided
        if (onStatusUpdate) {
          await onStatusUpdate(currentResponse);
        }

        // Check if completed or failed
        if (currentResponse.status === 'completed' || currentResponse.status === 'failed') {
          return currentResponse;
        }

      } catch (error) {
        this.log('error', `Error checking payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Timeout reached
    return {
      ...currentResponse,
      status: 'failed',
      failureReason: 'Payment processing timeout',
      completedAt: new Date(),
    };
  }

  /**
   * Get processing status
   */
  getStatus(): {
    isProcessing: boolean;
    queueSize: number;
    retryConfig: PaymentRetryConfig;
    activePayments: Array<{
      id: string;
      promoterId: string;
      amount: number;
      attempts: number;
    }>;
  } {
    return {
      isProcessing: this.isProcessing,
      queueSize: this.processingQueue.size,
      retryConfig: this.retryConfig,
      activePayments: Array.from(this.processingQueue.entries()).map(([id, request]) => ({
        id,
        promoterId: request.promoterId,
        amount: request.amount,
        attempts: this.retryAttempts.get(id) || 0,
      })),
    };
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string): Promise<PaymentResponse> {
    try {
      const response = await this.gateway.cancelPayment(paymentId);
      this.log('info', `Payment cancelled: ${paymentId}`);
      return response;
    } catch (error) {
      this.log('error', `Failed to cancel payment ${paymentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    limit?: number;
  }): Promise<PaymentResponse[]> {
    return this.gateway.getTransactionHistory(filters);
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(newConfig: Partial<PaymentRetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...newConfig };
    this.log('info', 'Retry configuration updated');
  }

  /**
   * Logging utility
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [PaymentProcessor] ${message}`);
  }
}

// Export factory functions
export const createMockPaymentGateway = (config: PaymentGatewayConfig) => {
  return new MockPaymentGateway(config);
};

export const createPaymentProcessor = (
  gateway: PaymentGateway,
  retryConfig?: Partial<PaymentRetryConfig>
) => {
  return new PaymentProcessor(gateway, retryConfig);
};

// Export constants
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_CURRENCIES = {
  IDR: 'IDR',
  USD: 'USD',
} as const;