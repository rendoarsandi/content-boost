/**
 * Payment Processing Integration Demo
 * Demonstrates the complete payment processing workflow with retry mechanism
 * Requirements: 6.4, 6.5, 6.6
 */

import {
  PaymentProcessor,
  MockPaymentGateway,
  PaymentRequest,
  PaymentResponse,
  PaymentNotification,
  createMockPaymentGateway,
  createPaymentProcessor,
} from '../payment-processor';

import {
  PaymentNotificationSystem,
  createPaymentNotificationSystem,
  createPaymentCompletedNotification,
  createPaymentFailedNotification,
} from '../payment-notifications';

import {
  PaymentHistoryManager,
  createPaymentHistoryManager,
  formatPaymentAmount,
} from '../payment-history';

/**
 * Demo: Complete Payment Processing Workflow
 */
export async function demonstratePaymentProcessing(): Promise<void> {
  console.log('🚀 Starting Payment Processing Integration Demo\n');

  // Initialize components
  const gateway = createMockPaymentGateway({
    provider: 'mock',
    apiKey: 'demo-api-key',
    environment: 'sandbox',
  });

  const processor = createPaymentProcessor(gateway, {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  });

  const notificationSystem = createPaymentNotificationSystem();
  const historyManager = createPaymentHistoryManager();

  // Demo payment requests
  const paymentRequests: PaymentRequest[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      payoutId: '550e8400-e29b-41d4-a716-446655440101',
      promoterId: '550e8400-e29b-41d4-a716-446655440201',
      amount: 50000,
      currency: 'IDR',
      description: 'Daily payout for TikTok campaign promotion',
      recipientInfo: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+6281234567890',
        eWallet: {
          type: 'gopay',
          accountNumber: '081234567890',
        },
      },
      metadata: {
        campaignId: '550e8400-e29b-41d4-a716-446655440301',
        campaignTitle: 'Summer Fashion Collection',
        legitimateViews: 50,
        ratePerView: 1000,
      },
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      payoutId: '550e8400-e29b-41d4-a716-446655440102',
      promoterId: '550e8400-e29b-41d4-a716-446655440202',
      amount: 75000,
      currency: 'IDR',
      description: 'Daily payout for Instagram campaign promotion',
      recipientInfo: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+6281234567891',
        eWallet: {
          type: 'ovo',
          accountNumber: '081234567891',
        },
      },
      metadata: {
        campaignId: '550e8400-e29b-41d4-a716-446655440302',
        campaignTitle: 'Tech Product Launch',
        legitimateViews: 75,
        ratePerView: 1000,
      },
      createdAt: new Date(),
    },
  ];

  console.log('📋 Processing payment requests...\n');

  // Process each payment request
  for (const request of paymentRequests) {
    try {
      console.log(`💳 Processing payment ${request.id}`);
      console.log(`   Amount: ${formatPaymentAmount(request.amount, request.currency)}`);
      console.log(`   Promoter: ${request.recipientInfo.name}`);
      console.log(`   Campaign: ${request.metadata.campaignTitle}\n`);

      // Process payment with retry mechanism
      const response = await processor.processPayment(request);

      // Record in history
      await historyManager.recordPayment({
        id: request.id,
        payoutId: request.payoutId,
        promoterId: request.promoterId,
        amount: request.amount,
        currency: request.currency,
        status: response.status,
        gatewayTransactionId: response.transactionId,
        processedAt: new Date(),
        metadata: request.metadata,
      });

      // Send notification based on result
      if (response.status === 'completed') {
        const notification = createPaymentCompletedNotification({
          promoterId: request.promoterId,
          amount: request.amount,
          currency: request.currency,
          transactionId: response.transactionId!,
          campaignTitle: request.metadata.campaignTitle,
        });
        
        await notificationSystem.sendNotification(notification);
        console.log(`✅ Payment completed successfully`);
        console.log(`   Transaction ID: ${response.transactionId}\n`);
      } else {
        const notification = createPaymentFailedNotification({
          promoterId: request.promoterId,
          amount: request.amount,
          currency: request.currency,
          reason: response.error || 'Unknown error',
          campaignTitle: request.metadata.campaignTitle,
        });
        
        await notificationSystem.sendNotification(notification);
        console.log(`❌ Payment failed: ${response.error}\n`);
      }

    } catch (error) {
      console.error(`💥 Error processing payment ${request.id}:`, error);
      
      // Record failed payment in history
      await historyManager.recordPayment({
        id: request.id,
        payoutId: request.payoutId,
        promoterId: request.promoterId,
        amount: request.amount,
        currency: request.currency,
        status: 'failed',
        processedAt: new Date(),
        metadata: request.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Display payment history summary
  console.log('📊 Payment Processing Summary\n');
  const history = await historyManager.getPaymentHistory({
    limit: 10,
    sortBy: 'processedAt',
    sortOrder: 'desc',
  });

  history.payments.forEach(payment => {
    const statusIcon = payment.status === 'completed' ? '✅' : 
                      payment.status === 'failed' ? '❌' : '⏳';
    console.log(`${statusIcon} ${payment.id}`);
    console.log(`   Amount: ${formatPaymentAmount(payment.amount, payment.currency)}`);
    console.log(`   Status: ${payment.status}`);
    console.log(`   Processed: ${payment.processedAt.toISOString()}`);
    if (payment.gatewayTransactionId) {
      console.log(`   Transaction ID: ${payment.gatewayTransactionId}`);
    }
    console.log('');
  });

  console.log('🎉 Payment Processing Integration Demo completed!\n');
}

// Run demo if this file is executed directly
if (require.main === module) {
  demonstratePaymentProcessing().catch(console.error);
}