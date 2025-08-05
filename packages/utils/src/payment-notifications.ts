import { z } from 'zod';

// Notification types
export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'webhook' | 'in_app';
  enabled: boolean;
  config: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type:
    | 'payment_completed'
    | 'payment_failed'
    | 'payment_processing'
    | 'payment_retry';
  channels: NotificationChannel[];
  subject: string;
  content: {
    text: string;
    html?: string;
  };
  variables: string[]; // List of template variables like {amount}, {promoterName}, etc.
}

export interface NotificationRequest {
  id: string;
  recipientId: string;
  recipientInfo: {
    name: string;
    email?: string;
    phone?: string;
    pushToken?: string;
  };
  templateId: string;
  variables: Record<string, string | number>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel['type'];
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount: number;
  metadata?: Record<string, any>;
}

export interface NotificationStats {
  period: {
    start: Date;
    end: Date;
  };
  totalNotifications: number;
  deliveryStats: {
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
  };
  channelStats: Record<
    string,
    {
      sent: number;
      delivered: number;
      failed: number;
    }
  >;
  templateStats: Record<string, number>;
}

// Validation schemas
export const NotificationRequestSchema = z.object({
  id: z.string().uuid(),
  recipientId: z.string().uuid(),
  recipientInfo: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    pushToken: z.string().optional(),
  }),
  templateId: z.string(),
  variables: z.record(z.string(), z.union([z.string(), z.number()])),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  scheduledAt: z.date().optional(),
  expiresAt: z.date().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date(),
});

/**
 * Payment Notification System
 * Requirement 6.5: Buat notification system untuk payment status updates
 */
export class PaymentNotificationSystem {
  private templates: Map<string, NotificationTemplate> = new Map();
  private notifications: Map<string, NotificationRequest> = new Map();
  private deliveries: Map<string, NotificationDelivery[]> = new Map();
  private isProcessing: boolean = false;

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default notification templates
   */
  private initializeDefaultTemplates(): void {
    // Payment completed template
    this.addTemplate({
      id: 'payment_completed',
      name: 'Payment Completed',
      type: 'payment_completed',
      channels: [
        {
          type: 'email',
          enabled: true,
          config: { priority: 'normal' },
        },
        {
          type: 'in_app',
          enabled: true,
          config: { persistent: true },
        },
      ],
      subject: 'Payment Received - {amount}',
      content: {
        text: `Hi {promoterName},

Great news! Your payment of {amount} has been successfully processed.

Payment Details:
- Amount: {amount}
- Campaign: {campaignTitle}
- Transaction ID: {transactionId}
- Processed At: {processedAt}

The payment has been sent to your registered account. Please allow 1-2 business days for the funds to appear in your account.

Thank you for being part of our creator promotion platform!

Best regards,
Creator Promotion Platform Team`,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #00AA00;">Payment Received!</h2>
  
  <p>Hi <strong>{promoterName}</strong>,</p>
  
  <p>Great news! Your payment of <strong>{amount}</strong> has been successfully processed.</p>
  
  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3>Payment Details:</h3>
    <ul>
      <li><strong>Amount:</strong> {amount}</li>
      <li><strong>Campaign:</strong> {campaignTitle}</li>
      <li><strong>Transaction ID:</strong> {transactionId}</li>
      <li><strong>Processed At:</strong> {processedAt}</li>
    </ul>
  </div>
  
  <p>The payment has been sent to your registered account. Please allow 1-2 business days for the funds to appear in your account.</p>
  
  <p>Thank you for being part of our creator promotion platform!</p>
  
  <p>Best regards,<br>Creator Promotion Platform Team</p>
</div>`,
      },
      variables: [
        'promoterName',
        'amount',
        'campaignTitle',
        'transactionId',
        'processedAt',
      ],
    });

    // Payment failed template
    this.addTemplate({
      id: 'payment_failed',
      name: 'Payment Failed',
      type: 'payment_failed',
      channels: [
        {
          type: 'email',
          enabled: true,
          config: { priority: 'high' },
        },
        {
          type: 'in_app',
          enabled: true,
          config: { persistent: true },
        },
      ],
      subject: 'Payment Failed - {amount}',
      content: {
        text: `Hi {promoterName},

We're sorry to inform you that your payment of {amount} could not be processed.

Payment Details:
- Amount: {amount}
- Campaign: {campaignTitle}
- Failure Reason: {failureReason}
- Attempted At: {attemptedAt}

What happens next:
{retryMessage}

If you continue to experience issues, please contact our support team with your transaction reference.

We apologize for any inconvenience caused.

Best regards,
Creator Promotion Platform Team`,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #CC0000;">Payment Failed</h2>
  
  <p>Hi <strong>{promoterName}</strong>,</p>
  
  <p>We're sorry to inform you that your payment of <strong>{amount}</strong> could not be processed.</p>
  
  <div style="background-color: #fff5f5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #CC0000;">
    <h3>Payment Details:</h3>
    <ul>
      <li><strong>Amount:</strong> {amount}</li>
      <li><strong>Campaign:</strong> {campaignTitle}</li>
      <li><strong>Failure Reason:</strong> {failureReason}</li>
      <li><strong>Attempted At:</strong> {attemptedAt}</li>
    </ul>
  </div>
  
  <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3>What happens next:</h3>
    <p>{retryMessage}</p>
  </div>
  
  <p>If you continue to experience issues, please contact our support team with your transaction reference.</p>
  
  <p>We apologize for any inconvenience caused.</p>
  
  <p>Best regards,<br>Creator Promotion Platform Team</p>
</div>`,
      },
      variables: [
        'promoterName',
        'amount',
        'campaignTitle',
        'failureReason',
        'attemptedAt',
        'retryMessage',
      ],
    });

    // Payment processing template
    this.addTemplate({
      id: 'payment_processing',
      name: 'Payment Processing',
      type: 'payment_processing',
      channels: [
        {
          type: 'in_app',
          enabled: true,
          config: { persistent: false },
        },
      ],
      subject: 'Payment Processing - {amount}',
      content: {
        text: `Hi {promoterName},

Your payment of {amount} is currently being processed.

Payment Details:
- Amount: {amount}
- Campaign: {campaignTitle}
- Started At: {startedAt}

We'll notify you once the payment is completed. This usually takes a few minutes.

Best regards,
Creator Promotion Platform Team`,
      },
      variables: ['promoterName', 'amount', 'campaignTitle', 'startedAt'],
    });

    // Payment retry template
    this.addTemplate({
      id: 'payment_retry',
      name: 'Payment Retry',
      type: 'payment_retry',
      channels: [
        {
          type: 'in_app',
          enabled: true,
          config: { persistent: false },
        },
      ],
      subject: 'Payment Retry - {amount}',
      content: {
        text: `Hi {promoterName},

We're retrying your payment of {amount} (Attempt {retryCount}/{maxRetries}).

Payment Details:
- Amount: {amount}
- Campaign: {campaignTitle}
- Retry Attempt: {retryCount} of {maxRetries}
- Next Attempt: {nextAttempt}

We'll keep you updated on the progress.

Best regards,
Creator Promotion Platform Team`,
      },
      variables: [
        'promoterName',
        'amount',
        'campaignTitle',
        'retryCount',
        'maxRetries',
        'nextAttempt',
      ],
    });
  }

  /**
   * Add a notification template
   */
  addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
    this.log(
      'info',
      `Added notification template: ${template.name} (${template.id})`
    );
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(
    recipientId: string,
    recipientInfo: NotificationRequest['recipientInfo'],
    templateType: NotificationTemplate['type'],
    variables: Record<string, string | number>,
    priority: NotificationRequest['priority'] = 'normal'
  ): Promise<NotificationRequest> {
    // Find template
    const template = Array.from(this.templates.values()).find(
      t => t.type === templateType
    );

    if (!template) {
      throw new Error(
        `Notification template not found for type: ${templateType}`
      );
    }

    // Create notification request
    const notification: NotificationRequest = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipientId,
      recipientInfo,
      templateId: template.id,
      variables,
      priority,
      createdAt: new Date(),
    };

    // Validate notification
    NotificationRequestSchema.parse(notification);

    // Store notification
    this.notifications.set(notification.id, notification);

    // Process notification
    await this.processNotification(notification, template);

    this.log(
      'info',
      `Sent payment notification: ${templateType} to ${recipientId}`
    );

    return notification;
  }

  /**
   * Process a notification through all enabled channels
   */
  private async processNotification(
    notification: NotificationRequest,
    template: NotificationTemplate
  ): Promise<void> {
    const deliveries: NotificationDelivery[] = [];

    // Process each enabled channel
    for (const channel of template.channels.filter(c => c.enabled)) {
      const delivery: NotificationDelivery = {
        id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        notificationId: notification.id,
        channel: channel.type,
        status: 'pending',
        retryCount: 0,
      };

      try {
        // Send through channel
        await this.sendThroughChannel(
          notification,
          template,
          channel,
          delivery
        );
        delivery.status = 'sent';
        delivery.sentAt = new Date();

        // Simulate delivery confirmation for some channels
        if (channel.type === 'in_app' || channel.type === 'push') {
          delivery.status = 'delivered';
          delivery.deliveredAt = new Date();
        }
      } catch (error) {
        delivery.status = 'failed';
        delivery.failureReason =
          error instanceof Error ? error.message : 'Unknown error';
        this.log(
          'error',
          `Failed to send notification through ${channel.type}: ${delivery.failureReason}`
        );
      }

      deliveries.push(delivery);
    }

    // Store deliveries
    this.deliveries.set(notification.id, deliveries);
  }

  /**
   * Send notification through a specific channel
   */
  private async sendThroughChannel(
    notification: NotificationRequest,
    template: NotificationTemplate,
    channel: NotificationChannel,
    delivery: NotificationDelivery
  ): Promise<void> {
    // Replace variables in template
    const subject = this.replaceVariables(
      template.subject,
      notification.variables
    );
    const content = this.replaceVariables(
      template.content.text,
      notification.variables
    );
    const htmlContent = template.content.html
      ? this.replaceVariables(template.content.html, notification.variables)
      : undefined;

    switch (channel.type) {
      case 'email':
        await this.sendEmail(
          notification.recipientInfo,
          subject,
          content,
          htmlContent
        );
        break;

      case 'sms':
        await this.sendSMS(notification.recipientInfo, content);
        break;

      case 'push':
        await this.sendPushNotification(
          notification.recipientInfo,
          subject,
          content
        );
        break;

      case 'webhook':
        await this.sendWebhook(notification, template, channel.config);
        break;

      case 'in_app':
        await this.sendInAppNotification(
          notification.recipientId,
          subject,
          content
        );
        break;

      default:
        throw new Error(`Unsupported notification channel: ${channel.type}`);
    }
  }

  /**
   * Replace template variables
   */
  private replaceVariables(
    template: string,
    variables: Record<string, string | number>
  ): string {
    let result = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }

  /**
   * Send email notification (mock implementation)
   */
  private async sendEmail(
    recipient: NotificationRequest['recipientInfo'],
    subject: string,
    content: string,
    htmlContent?: string
  ): Promise<void> {
    if (!recipient.email) {
      throw new Error('Email address not provided');
    }

    // Mock email sending
    this.log('info', `Sending email to ${recipient.email}: ${subject}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate occasional failures
    if (Math.random() < 0.05) {
      // 5% failure rate
      throw new Error('Email service temporarily unavailable');
    }
  }

  /**
   * Send SMS notification (mock implementation)
   */
  private async sendSMS(
    recipient: NotificationRequest['recipientInfo'],
    content: string
  ): Promise<void> {
    if (!recipient.phone) {
      throw new Error('Phone number not provided');
    }

    // Mock SMS sending
    this.log(
      'info',
      `Sending SMS to ${recipient.phone}: ${content.substring(0, 50)}...`
    );

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Simulate occasional failures
    if (Math.random() < 0.1) {
      // 10% failure rate
      throw new Error('SMS service temporarily unavailable');
    }
  }

  /**
   * Send push notification (mock implementation)
   */
  private async sendPushNotification(
    recipient: NotificationRequest['recipientInfo'],
    title: string,
    content: string
  ): Promise<void> {
    if (!recipient.pushToken) {
      throw new Error('Push token not provided');
    }

    // Mock push notification sending
    this.log('info', `Sending push notification: ${title}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Send webhook notification (mock implementation)
   */
  private async sendWebhook(
    notification: NotificationRequest,
    template: NotificationTemplate,
    config: Record<string, any>
  ): Promise<void> {
    const webhookUrl = config.url;
    if (!webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    // Mock webhook sending
    this.log('info', `Sending webhook to ${webhookUrl}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Send in-app notification (mock implementation)
   */
  private async sendInAppNotification(
    recipientId: string,
    title: string,
    content: string
  ): Promise<void> {
    // Mock in-app notification
    this.log('info', `Sending in-app notification to ${recipientId}: ${title}`);

    // Simulate instant delivery
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Get notification by ID
   */
  async getNotification(
    notificationId: string
  ): Promise<NotificationRequest | null> {
    return this.notifications.get(notificationId) || null;
  }

  /**
   * Get notifications for a recipient
   */
  async getNotificationsForRecipient(
    recipientId: string,
    filters?: {
      templateType?: NotificationTemplate['type'];
      status?: NotificationDelivery['status'];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<NotificationRequest[]> {
    let notifications = Array.from(this.notifications.values()).filter(
      n => n.recipientId === recipientId
    );

    // Apply filters
    if (filters?.templateType) {
      const templateIds = Array.from(this.templates.values())
        .filter(t => t.type === filters.templateType)
        .map(t => t.id);
      notifications = notifications.filter(n =>
        templateIds.includes(n.templateId)
      );
    }

    if (filters?.startDate) {
      notifications = notifications.filter(
        n => n.createdAt >= filters.startDate!
      );
    }

    if (filters?.endDate) {
      notifications = notifications.filter(
        n => n.createdAt <= filters.endDate!
      );
    }

    // Sort by creation date (newest first)
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply limit
    if (filters?.limit) {
      notifications = notifications.slice(0, filters.limit);
    }

    return notifications;
  }

  /**
   * Get delivery status for a notification
   */
  async getDeliveryStatus(
    notificationId: string
  ): Promise<NotificationDelivery[]> {
    return this.deliveries.get(notificationId) || [];
  }

  /**
   * Generate notification statistics
   */
  async generateStats(
    startDate: Date,
    endDate: Date,
    filters?: {
      templateType?: NotificationTemplate['type'];
      recipientId?: string;
    }
  ): Promise<NotificationStats> {
    let notifications = Array.from(this.notifications.values()).filter(
      n => n.createdAt >= startDate && n.createdAt <= endDate
    );

    // Apply filters
    if (filters?.templateType) {
      const templateIds = Array.from(this.templates.values())
        .filter(t => t.type === filters.templateType)
        .map(t => t.id);
      notifications = notifications.filter(n =>
        templateIds.includes(n.templateId)
      );
    }

    if (filters?.recipientId) {
      notifications = notifications.filter(
        n => n.recipientId === filters.recipientId
      );
    }

    // Calculate delivery stats
    const allDeliveries = notifications.flatMap(
      n => this.deliveries.get(n.id) || []
    );

    const deliveryStats = {
      sent: allDeliveries.filter(
        d => d.status === 'sent' || d.status === 'delivered'
      ).length,
      delivered: allDeliveries.filter(d => d.status === 'delivered').length,
      failed: allDeliveries.filter(d => d.status === 'failed').length,
      pending: allDeliveries.filter(d => d.status === 'pending').length,
    };

    // Calculate channel stats
    const channelStats: Record<
      string,
      { sent: number; delivered: number; failed: number }
    > = {};
    allDeliveries.forEach(delivery => {
      if (!channelStats[delivery.channel]) {
        channelStats[delivery.channel] = { sent: 0, delivered: 0, failed: 0 };
      }

      if (delivery.status === 'sent' || delivery.status === 'delivered') {
        channelStats[delivery.channel].sent++;
      }
      if (delivery.status === 'delivered') {
        channelStats[delivery.channel].delivered++;
      }
      if (delivery.status === 'failed') {
        channelStats[delivery.channel].failed++;
      }
    });

    // Calculate template stats
    const templateStats: Record<string, number> = {};
    notifications.forEach(notification => {
      const template = this.templates.get(notification.templateId);
      if (template) {
        templateStats[template.name] = (templateStats[template.name] || 0) + 1;
      }
    });

    return {
      period: { start: startDate, end: endDate },
      totalNotifications: notifications.length,
      deliveryStats,
      channelStats,
      templateStats,
    };
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(
    maxAge: number = 24 * 60 * 60 * 1000
  ): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAge);
    let retriedCount = 0;

    for (const [notificationId, deliveries] of this.deliveries.entries()) {
      const notification = this.notifications.get(notificationId);
      if (!notification || notification.createdAt < cutoffTime) {
        continue;
      }

      const failedDeliveries = deliveries.filter(
        d => d.status === 'failed' && d.retryCount < 3
      );

      for (const delivery of failedDeliveries) {
        try {
          const template = this.templates.get(notification.templateId);
          if (!template) continue;

          const channel = template.channels.find(
            c => c.type === delivery.channel
          );
          if (!channel) continue;

          // Retry delivery
          await this.sendThroughChannel(
            notification,
            template,
            channel,
            delivery
          );

          delivery.status = 'sent';
          delivery.sentAt = new Date();
          delivery.retryCount++;
          retriedCount++;

          this.log(
            'info',
            `Retried notification delivery: ${notificationId} via ${delivery.channel}`
          );
        } catch (error) {
          delivery.retryCount++;
          delivery.failureReason =
            error instanceof Error ? error.message : 'Unknown error';
          this.log(
            'error',
            `Retry failed for notification ${notificationId}: ${delivery.failureReason}`
          );
        }
      }
    }

    return retriedCount;
  }

  /**
   * Get system statistics
   */
  getSystemStats(): {
    totalTemplates: number;
    totalNotifications: number;
    totalDeliveries: number;
    isProcessing: boolean;
  } {
    const totalDeliveries = Array.from(this.deliveries.values()).reduce(
      (sum, deliveries) => sum + deliveries.length,
      0
    );

    return {
      totalTemplates: this.templates.size,
      totalNotifications: this.notifications.size,
      totalDeliveries,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Logging utility
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    ...args: any[]
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [PaymentNotificationSystem]`;
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
export const createPaymentNotificationSystem = () => {
  return new PaymentNotificationSystem();
};

// Export helper functions
export const createPaymentCompletedNotification = (
  promoterName: string,
  amount: string,
  campaignTitle: string,
  transactionId: string
) => ({
  promoterName,
  amount,
  campaignTitle,
  transactionId,
  processedAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
});

export const createPaymentFailedNotification = (
  promoterName: string,
  amount: string,
  campaignTitle: string,
  failureReason: string,
  willRetry: boolean,
  maxRetries?: number
) => ({
  promoterName,
  amount,
  campaignTitle,
  failureReason,
  attemptedAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
  retryMessage: willRetry
    ? `We will automatically retry this payment. You will be notified of the outcome.${maxRetries ? ` (Maximum ${maxRetries} attempts)` : ''}`
    : 'This payment will not be retried automatically. Please contact support if you believe this is an error.',
});
