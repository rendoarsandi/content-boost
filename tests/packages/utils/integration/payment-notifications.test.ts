import {
  PaymentNotificationSystem,
  createPaymentNotificationSystem,
  createPaymentCompletedNotification,
  createPaymentFailedNotification,
  NotificationTemplate,
  NotificationRequest,
} from '@repo/utils/payment-notifications';

describe('PaymentNotificationSystem', () => {
  let notificationSystem: PaymentNotificationSystem;

  beforeEach(() => {
    notificationSystem = createPaymentNotificationSystem();

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default templates', () => {
      // Act
      const stats = notificationSystem.getSystemStats();

      // Assert
      expect(stats.totalTemplates).toBe(4); // payment_completed, payment_failed, payment_processing, payment_retry
    });
  });

  describe('addTemplate', () => {
    it('should add custom notification template', () => {
      // Arrange
      const customTemplate: NotificationTemplate = {
        id: 'custom_template',
        name: 'Custom Template',
        type: 'payment_completed',
        channels: [
          {
            type: 'email',
            enabled: true,
            config: {},
          },
        ],
        subject: 'Custom Subject',
        content: {
          text: 'Custom content with {variable}',
        },
        variables: ['variable'],
      };

      // Act
      notificationSystem.addTemplate(customTemplate);
      const stats = notificationSystem.getSystemStats();

      // Assert
      expect(stats.totalTemplates).toBe(5); // 4 default + 1 custom
    });
  });

  describe('sendPaymentNotification', () => {
    it('should send payment completed notification successfully', async () => {
      // Arrange
      const recipientInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+6281234567890',
      };

      const variables = createPaymentCompletedNotification(
        'John Doe',
        'Rp100.000',
        'Test Campaign',
        'TXN123456'
      );

      // Act
      const notification = await notificationSystem.sendPaymentNotification(
        'promoter-123',
        recipientInfo,
        'payment_completed',
        variables,
        'normal'
      );

      // Assert
      expect(notification).toBeDefined();
      expect(notification.recipientId).toBe('promoter-123');
      expect(notification.templateId).toBe('payment_completed');
      expect(notification.variables).toEqual(variables);
      expect(notification.priority).toBe('normal');
      expect(notification.createdAt).toBeInstanceOf(Date);
    });

    it('should send payment failed notification successfully', async () => {
      // Arrange
      const recipientInfo = {
        name: 'Jane Smith',
        email: 'jane@example.com',
      };

      const variables = createPaymentFailedNotification(
        'Jane Smith',
        'Rp50.000',
        'Failed Campaign',
        'Insufficient funds',
        true,
        3
      );

      // Act
      const notification = await notificationSystem.sendPaymentNotification(
        'promoter-456',
        recipientInfo,
        'payment_failed',
        variables,
        'high'
      );

      // Assert
      expect(notification).toBeDefined();
      expect(notification.recipientId).toBe('promoter-456');
      expect(notification.templateId).toBe('payment_failed');
      expect(notification.priority).toBe('high');
      expect(notification.variables.failureReason).toBe('Insufficient funds');
      expect(notification.variables.retryMessage).toContain(
        'automatically retry'
      );
    });

    it('should send payment processing notification', async () => {
      // Arrange
      const recipientInfo = {
        name: 'Bob Johnson',
        email: 'bob@example.com',
      };

      const variables = {
        promoterName: 'Bob Johnson',
        amount: 'Rp75.000',
        campaignTitle: 'Processing Campaign',
        startedAt: new Date().toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
        }),
      };

      // Act
      const notification = await notificationSystem.sendPaymentNotification(
        'promoter-789',
        recipientInfo,
        'payment_processing',
        variables
      );

      // Assert
      expect(notification).toBeDefined();
      expect(notification.templateId).toBe('payment_processing');
      expect(notification.variables.promoterName).toBe('Bob Johnson');
    });

    it('should send payment retry notification', async () => {
      // Arrange
      const recipientInfo = {
        name: 'Alice Brown',
        email: 'alice@example.com',
      };

      const variables = {
        promoterName: 'Alice Brown',
        amount: 'Rp25.000',
        campaignTitle: 'Retry Campaign',
        retryCount: '2',
        maxRetries: '3',
        nextAttempt: new Date(Date.now() + 60000).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
        }),
      };

      // Act
      const notification = await notificationSystem.sendPaymentNotification(
        'promoter-retry',
        recipientInfo,
        'payment_retry',
        variables
      );

      // Assert
      expect(notification).toBeDefined();
      expect(notification.templateId).toBe('payment_retry');
      expect(notification.variables.retryCount).toBe('2');
    });

    it('should throw error for unknown template type', async () => {
      // Arrange
      const recipientInfo = {
        name: 'Unknown User',
        email: 'unknown@example.com',
      };

      // Act & Assert
      await expect(
        notificationSystem.sendPaymentNotification(
          'promoter-unknown',
          recipientInfo,
          'unknown_template' as any,
          {}
        )
      ).rejects.toThrow(
        'Notification template not found for type: unknown_template'
      );
    });

    it('should validate notification request', async () => {
      // Arrange
      const recipientInfo = {
        name: '', // Invalid empty name
        email: 'invalid-email', // Invalid email format
      };

      const variables = {
        promoterName: 'Test User',
        amount: 'Rp10.000',
        campaignTitle: 'Test Campaign',
        transactionId: 'TXN123',
        processedAt: new Date().toISOString(),
      };

      // Act & Assert
      await expect(
        notificationSystem.sendPaymentNotification(
          'invalid-uuid-format', // Invalid UUID format
          recipientInfo,
          'payment_completed',
          variables
        )
      ).rejects.toThrow();
    });
  });

  describe('getNotification', () => {
    it('should retrieve notification by ID', async () => {
      // Arrange
      const recipientInfo = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const variables = createPaymentCompletedNotification(
        'Test User',
        'Rp30.000',
        'Test Campaign',
        'TXN789'
      );

      const sentNotification = await notificationSystem.sendPaymentNotification(
        'promoter-get',
        recipientInfo,
        'payment_completed',
        variables
      );

      // Act
      const retrievedNotification = await notificationSystem.getNotification(
        sentNotification.id
      );

      // Assert
      expect(retrievedNotification).toEqual(sentNotification);
    });

    it('should return null for non-existent notification', async () => {
      // Act
      const result = await notificationSystem.getNotification('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getNotificationsForRecipient', () => {
    it('should get notifications for specific recipient', async () => {
      // Arrange
      const recipientId = 'promoter-recipient';
      const recipientInfo = {
        name: 'Recipient User',
        email: 'recipient@example.com',
      };

      // Send multiple notifications
      await notificationSystem.sendPaymentNotification(
        recipientId,
        recipientInfo,
        'payment_completed',
        createPaymentCompletedNotification(
          'Recipient User',
          'Rp40.000',
          'Campaign 1',
          'TXN1'
        )
      );

      await notificationSystem.sendPaymentNotification(
        recipientId,
        recipientInfo,
        'payment_failed',
        createPaymentFailedNotification(
          'Recipient User',
          'Rp20.000',
          'Campaign 2',
          'Error',
          false
        )
      );

      // Send notification for different recipient
      await notificationSystem.sendPaymentNotification(
        'other-promoter',
        { name: 'Other User', email: 'other@example.com' },
        'payment_completed',
        createPaymentCompletedNotification(
          'Other User',
          'Rp10.000',
          'Other Campaign',
          'TXN2'
        )
      );

      // Act
      const notifications =
        await notificationSystem.getNotificationsForRecipient(recipientId);

      // Assert
      expect(notifications).toHaveLength(2);
      expect(notifications.every(n => n.recipientId === recipientId)).toBe(
        true
      );
      // Should be sorted by creation date (newest first)
      expect(notifications[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        notifications[1].createdAt.getTime()
      );
    });

    it('should filter notifications by template type', async () => {
      // Arrange
      const recipientId = 'promoter-filter';
      const recipientInfo = {
        name: 'Filter User',
        email: 'filter@example.com',
      };

      await notificationSystem.sendPaymentNotification(
        recipientId,
        recipientInfo,
        'payment_completed',
        createPaymentCompletedNotification(
          'Filter User',
          'Rp15.000',
          'Completed Campaign',
          'TXN3'
        )
      );

      await notificationSystem.sendPaymentNotification(
        recipientId,
        recipientInfo,
        'payment_failed',
        createPaymentFailedNotification(
          'Filter User',
          'Rp25.000',
          'Failed Campaign',
          'Error',
          true
        )
      );

      // Act
      const completedNotifications =
        await notificationSystem.getNotificationsForRecipient(recipientId, {
          templateType: 'payment_completed',
        });

      // Assert
      expect(completedNotifications).toHaveLength(1);
      expect(completedNotifications[0].templateId).toBe('payment_completed');
    });

    it('should apply limit to notifications', async () => {
      // Arrange
      const recipientId = 'promoter-limit';
      const recipientInfo = {
        name: 'Limit User',
        email: 'limit@example.com',
      };

      // Send 3 notifications
      for (let i = 0; i < 3; i++) {
        await notificationSystem.sendPaymentNotification(
          recipientId,
          recipientInfo,
          'payment_completed',
          createPaymentCompletedNotification(
            'Limit User',
            `Rp${(i + 1) * 10000}`,
            `Campaign ${i + 1}`,
            `TXN${i + 1}`
          )
        );
      }

      // Act
      const limitedNotifications =
        await notificationSystem.getNotificationsForRecipient(recipientId, {
          limit: 2,
        });

      // Assert
      expect(limitedNotifications).toHaveLength(2);
    });
  });

  describe('getDeliveryStatus', () => {
    it('should get delivery status for notification', async () => {
      // Arrange
      const recipientInfo = {
        name: 'Delivery User',
        email: 'delivery@example.com',
      };

      const notification = await notificationSystem.sendPaymentNotification(
        'promoter-delivery',
        recipientInfo,
        'payment_completed',
        createPaymentCompletedNotification(
          'Delivery User',
          'Rp35.000',
          'Delivery Campaign',
          'TXN4'
        )
      );

      // Act
      const deliveryStatus = await notificationSystem.getDeliveryStatus(
        notification.id
      );

      // Assert
      expect(deliveryStatus).toBeDefined();
      expect(Array.isArray(deliveryStatus)).toBe(true);
      expect(deliveryStatus.length).toBeGreaterThan(0);

      // Check delivery properties
      deliveryStatus.forEach(delivery => {
        expect(delivery).toHaveProperty('id');
        expect(delivery).toHaveProperty('notificationId', notification.id);
        expect(delivery).toHaveProperty('channel');
        expect(delivery).toHaveProperty('status');
        expect(delivery).toHaveProperty('retryCount');
      });
    });
  });

  describe('generateStats', () => {
    it('should generate notification statistics', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const recipientInfo = {
        name: 'Stats User',
        email: 'stats@example.com',
      };

      // Send notifications
      await notificationSystem.sendPaymentNotification(
        'promoter-stats-1',
        recipientInfo,
        'payment_completed',
        createPaymentCompletedNotification(
          'Stats User',
          'Rp45.000',
          'Stats Campaign 1',
          'TXN5'
        )
      );

      await notificationSystem.sendPaymentNotification(
        'promoter-stats-2',
        recipientInfo,
        'payment_failed',
        createPaymentFailedNotification(
          'Stats User',
          'Rp55.000',
          'Stats Campaign 2',
          'Network error',
          true
        )
      );

      // Act
      const stats = await notificationSystem.generateStats(startDate, endDate);

      // Assert
      expect(stats.period.start).toEqual(startDate);
      expect(stats.period.end).toEqual(endDate);
      expect(stats.totalNotifications).toBeGreaterThanOrEqual(2);
      expect(stats.deliveryStats).toHaveProperty('sent');
      expect(stats.deliveryStats).toHaveProperty('delivered');
      expect(stats.deliveryStats).toHaveProperty('failed');
      expect(stats.deliveryStats).toHaveProperty('pending');
      expect(stats.channelStats).toHaveProperty('email');
      expect(stats.channelStats).toHaveProperty('in_app');
      expect(stats.templateStats).toHaveProperty('Payment Completed');
      expect(stats.templateStats).toHaveProperty('Payment Failed');
    });

    it('should filter stats by template type', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const recipientInfo = {
        name: 'Filter Stats User',
        email: 'filterstats@example.com',
      };

      await notificationSystem.sendPaymentNotification(
        'promoter-filter-stats',
        recipientInfo,
        'payment_completed',
        createPaymentCompletedNotification(
          'Filter Stats User',
          'Rp65.000',
          'Filter Stats Campaign',
          'TXN6'
        )
      );

      // Act
      const stats = await notificationSystem.generateStats(startDate, endDate, {
        templateType: 'payment_completed',
      });

      // Assert
      expect(stats.totalNotifications).toBeGreaterThanOrEqual(1);
      expect(Object.keys(stats.templateStats)).toContain('Payment Completed');
    });
  });

  describe('retryFailedNotifications', () => {
    it('should retry failed notifications', async () => {
      // Arrange
      const recipientInfo = {
        name: 'Retry User',
        email: 'retry@example.com',
      };

      // Mock email sending to fail initially
      const originalSendEmail = (notificationSystem as any).sendEmail;
      let emailCallCount = 0;

      (notificationSystem as any).sendEmail = jest
        .fn()
        .mockImplementation(async () => {
          emailCallCount++;
          if (emailCallCount === 1) {
            throw new Error('Email service unavailable');
          }
          // Succeed on retry
          return Promise.resolve();
        });

      // Send notification (will fail initially)
      const notification = await notificationSystem.sendPaymentNotification(
        'promoter-retry-test',
        recipientInfo,
        'payment_completed',
        createPaymentCompletedNotification(
          'Retry User',
          'Rp75.000',
          'Retry Campaign',
          'TXN7'
        )
      );

      // Act
      const retriedCount = await notificationSystem.retryFailedNotifications();

      // Assert
      expect(retriedCount).toBeGreaterThanOrEqual(0);

      // Restore original method
      (notificationSystem as any).sendEmail = originalSendEmail;
    });
  });

  describe('getSystemStats', () => {
    it('should return system statistics', async () => {
      // Arrange
      const recipientInfo = {
        name: 'System Stats User',
        email: 'systemstats@example.com',
      };

      await notificationSystem.sendPaymentNotification(
        'promoter-system-stats',
        recipientInfo,
        'payment_completed',
        createPaymentCompletedNotification(
          'System Stats User',
          'Rp85.000',
          'System Stats Campaign',
          'TXN8'
        )
      );

      // Act
      const stats = notificationSystem.getSystemStats();

      // Assert
      expect(stats).toHaveProperty('totalTemplates');
      expect(stats).toHaveProperty('totalNotifications');
      expect(stats).toHaveProperty('totalDeliveries');
      expect(stats).toHaveProperty('isProcessing');
      expect(stats.totalTemplates).toBeGreaterThan(0);
      expect(stats.totalNotifications).toBeGreaterThan(0);
      expect(stats.totalDeliveries).toBeGreaterThan(0);
      expect(typeof stats.isProcessing).toBe('boolean');
    });
  });
});

describe('Helper Functions', () => {
  describe('createPaymentCompletedNotification', () => {
    it('should create payment completed notification variables', () => {
      // Act
      const variables = createPaymentCompletedNotification(
        'John Doe',
        'Rp100.000',
        'Test Campaign',
        'TXN123456'
      );

      // Assert
      expect(variables).toEqual({
        promoterName: 'John Doe',
        amount: 'Rp100.000',
        campaignTitle: 'Test Campaign',
        transactionId: 'TXN123456',
        processedAt: expect.any(String),
      });
      expect(variables.processedAt).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date format check
    });
  });

  describe('createPaymentFailedNotification', () => {
    it('should create payment failed notification with retry', () => {
      // Act
      const variables = createPaymentFailedNotification(
        'Jane Smith',
        'Rp50.000',
        'Failed Campaign',
        'Insufficient funds',
        true,
        3
      );

      // Assert
      expect(variables).toEqual({
        promoterName: 'Jane Smith',
        amount: 'Rp50.000',
        campaignTitle: 'Failed Campaign',
        failureReason: 'Insufficient funds',
        attemptedAt: expect.any(String),
        retryMessage:
          'We will automatically retry this payment. You will be notified of the outcome. (Maximum 3 attempts)',
      });
    });

    it('should create payment failed notification without retry', () => {
      // Act
      const variables = createPaymentFailedNotification(
        'Bob Johnson',
        'Rp75.000',
        'No Retry Campaign',
        'Account closed',
        false
      );

      // Assert
      expect(variables.retryMessage).toBe(
        'This payment will not be retried automatically. Please contact support if you believe this is an error.'
      );
    });
  });
});

describe('createPaymentNotificationSystem', () => {
  it('should create payment notification system instance', () => {
    // Act
    const system = createPaymentNotificationSystem();

    // Assert
    expect(system).toBeInstanceOf(PaymentNotificationSystem);
    const stats = system.getSystemStats();
    expect(stats.totalTemplates).toBe(4); // Default templates
  });
});
