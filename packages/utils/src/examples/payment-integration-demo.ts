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
      currency: 'ID