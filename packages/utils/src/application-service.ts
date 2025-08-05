import { z } from 'zod';

// Application validation schemas
export const ApplicationValidationSchema = z.object({
  campaignId: z.string().uuid(),
  promoterId: z.string().uuid(),
  submittedContent: z
    .string()
    .min(10, 'Content description must be at least 10 characters')
    .optional(),
  message: z.string().max(500, 'Message too long').optional(),
  proposedContent: z
    .object({
      platform: z.enum(['tiktok', 'instagram']),
      contentType: z.enum(['video', 'image', 'story', 'reel']),
      description: z
        .string()
        .min(20, 'Content description must be at least 20 characters'),
      hashtags: z
        .array(z.string())
        .max(30, 'Maximum 30 hashtags allowed')
        .optional(),
      estimatedReach: z.number().positive().optional(),
    })
    .optional(),
});

export const ReviewApplicationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewMessage: z.string().max(500, 'Review message too long').optional(),
  feedback: z
    .object({
      contentQuality: z.number().min(1).max(5).optional(),
      alignmentWithBrand: z.number().min(1).max(5).optional(),
      creativityScore: z.number().min(1).max(5).optional(),
      notes: z.string().max(1000).optional(),
    })
    .optional(),
});

export const NotificationSchema = z.object({
  type: z.enum([
    'application_submitted',
    'application_approved',
    'application_rejected',
    'materials_accessed',
  ]),
  recipientId: z.string().uuid(),
  title: z.string().max(200),
  message: z.string().max(1000),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Application business logic
export class ApplicationService {
  /**
   * Validate if promoter can apply to campaign
   */
  static validateApplicationEligibility(
    campaign: {
      status: string;
      startDate?: Date | null;
      endDate?: Date | null;
    },
    existingApplication?: { status: string } | null
  ): { valid: boolean; error?: string } {
    // Check if campaign is active
    if (campaign.status !== 'active') {
      return {
        valid: false,
        error: 'Campaign is not currently active',
      };
    }

    // Check if campaign is within date range
    const now = new Date();

    if (campaign.startDate && now < campaign.startDate) {
      return {
        valid: false,
        error: 'Campaign has not started yet',
      };
    }

    if (campaign.endDate && now > campaign.endDate) {
      return {
        valid: false,
        error: 'Campaign application period has ended',
      };
    }

    // Check if promoter has already applied
    if (existingApplication) {
      return {
        valid: false,
        error: `You have already applied to this campaign (Status: ${existingApplication.status})`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate tracking link format
   */
  static validateTrackingLink(trackingLink: string): {
    valid: boolean;
    error?: string;
  } {
    try {
      const url = new URL(trackingLink);

      // Check if it's from the expected tracking domain
      if (!url.hostname.includes('track.domain.com')) {
        return {
          valid: false,
          error: 'Invalid tracking link domain',
        };
      }

      // Check if it has a valid tracking ID
      const trackingId = url.pathname.split('/').pop();
      if (!trackingId || trackingId.length < 10) {
        return {
          valid: false,
          error: 'Invalid tracking link format',
        };
      }

      return { valid: true };
    } catch {
      return {
        valid: false,
        error: 'Invalid tracking link URL format',
      };
    }
  }

  /**
   * Decode tracking link to get campaign and promoter IDs
   */
  static decodeTrackingLink(trackingLink: string): {
    campaignId?: string;
    promoterId?: string;
    timestamp?: number;
    error?: string;
  } {
    try {
      const url = new URL(trackingLink);
      const encodedId = url.pathname.split('/').pop();

      if (!encodedId) {
        return { error: 'No tracking ID found in link' };
      }

      // Decode the base64url encoded tracking ID
      const decodedId = atob(encodedId);
      const parts = decodedId.split('-');

      if (parts.length < 3) {
        return { error: 'Invalid tracking ID format' };
      }

      // The format is campaignId-promoterId-timestamp
      // Since IDs might contain hyphens, we need to be careful about splitting
      const timestamp = parseInt(parts[parts.length - 1]);

      // Find the last occurrence of the promoter ID pattern
      // For now, assume promoter ID is the second-to-last part
      const promoterId = parts[parts.length - 2];

      // Everything before the last two parts is the campaign ID
      const campaignId = parts.slice(0, parts.length - 2).join('-');

      return {
        campaignId,
        promoterId,
        timestamp,
      };
    } catch (error) {
      return { error: 'Failed to decode tracking link' };
    }
  }

  /**
   * Generate notification message for application status change
   */
  static generateNotificationMessage(
    status: 'approved' | 'rejected',
    campaignTitle: string,
    reviewMessage?: string
  ): string {
    const baseMessage =
      status === 'approved'
        ? `Great news! Your application for "${campaignTitle}" has been approved. You can now access the campaign materials and start promoting.`
        : `Your application for "${campaignTitle}" has been rejected.`;

    if (reviewMessage) {
      return `${baseMessage}\n\nCreator's message: ${reviewMessage}`;
    }

    return baseMessage;
  }

  /**
   * Validate promoter requirements for campaign
   */
  static validatePromoterRequirements(
    campaignRequirements: string[],
    promoterProfile: {
      socialAccounts?: Array<{ platform: string; verified: boolean }>;
      followerCount?: number;
      engagementRate?: number;
    }
  ): { valid: boolean; missingRequirements: string[] } {
    const missingRequirements: string[] = [];

    for (const requirement of campaignRequirements) {
      const req = requirement.toLowerCase();

      // Check social media platform requirements
      if (req.includes('tiktok')) {
        const hasTikTok = promoterProfile.socialAccounts?.some(
          account => account.platform === 'tiktok' && account.verified
        );
        if (!hasTikTok) {
          missingRequirements.push('Verified TikTok account required');
        }
      }

      if (req.includes('instagram')) {
        const hasInstagram = promoterProfile.socialAccounts?.some(
          account => account.platform === 'instagram' && account.verified
        );
        if (!hasInstagram) {
          missingRequirements.push('Verified Instagram account required');
        }
      }

      // Check follower count requirements
      if (req.includes('followers')) {
        const match = req.match(/(\d+)\s*followers/);
        if (match) {
          const requiredFollowers = parseInt(match[1]);
          if (
            !promoterProfile.followerCount ||
            promoterProfile.followerCount < requiredFollowers
          ) {
            missingRequirements.push(
              `Minimum ${requiredFollowers} followers required`
            );
          }
        }
      }

      // Check engagement rate requirements
      if (req.includes('engagement')) {
        const match = req.match(/(\d+)%?\s*engagement/);
        if (match) {
          const requiredEngagement = parseInt(match[1]);
          if (
            !promoterProfile.engagementRate ||
            promoterProfile.engagementRate < requiredEngagement
          ) {
            missingRequirements.push(
              `Minimum ${requiredEngagement}% engagement rate required`
            );
          }
        }
      }
    }

    return {
      valid: missingRequirements.length === 0,
      missingRequirements,
    };
  }

  /**
   * Calculate application metrics for campaign
   */
  static calculateApplicationMetrics(
    applications: Array<{
      status: string;
      appliedAt: Date;
    }>
  ): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    approvalRate: number;
    averageResponseTime: number; // in hours
  } {
    const total = applications.length;
    const pending = applications.filter(app => app.status === 'pending').length;
    const approved = applications.filter(
      app => app.status === 'approved'
    ).length;
    const rejected = applications.filter(
      app => app.status === 'rejected'
    ).length;

    const reviewedTotal = approved + rejected;
    const approvalRate =
      reviewedTotal > 0 ? (approved / reviewedTotal) * 100 : 0;

    // Calculate average response time for reviewed applications
    const reviewedApps = applications.filter(app => app.status !== 'pending');
    const totalResponseTime = reviewedApps.reduce((sum, app) => {
      // This would need reviewedAt timestamp in real implementation
      // For now, we'll estimate based on current time
      const responseTime = Date.now() - app.appliedAt.getTime();
      return sum + responseTime;
    }, 0);

    const averageResponseTime =
      reviewedApps.length > 0
        ? totalResponseTime / reviewedApps.length / (1000 * 60 * 60) // Convert to hours
        : 0;

    return {
      total,
      pending,
      approved,
      rejected,
      approvalRate: Math.round(approvalRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    };
  }

  /**
   * Enhanced tracking link generation with additional metadata
   */
  static generateEnhancedTrackingLink(
    campaignId: string,
    promoterId: string,
    metadata?: {
      platform?: string;
      contentType?: string;
      expectedReach?: number;
    }
  ): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    // Create tracking data object
    const trackingData = {
      campaignId,
      promoterId,
      timestamp,
      metadata: metadata || {},
      version: '2.0',
      randomSuffix,
    };

    // Encode the tracking data
    const encodedData = btoa(JSON.stringify(trackingData));

    return `https://track.domain.com/v2/${encodedData}`;
  }

  /**
   * Decode enhanced tracking link
   */
  static decodeEnhancedTrackingLink(trackingLink: string): {
    campaignId?: string;
    promoterId?: string;
    timestamp?: number;
    metadata?: any;
    version?: string;
    error?: string;
  } {
    try {
      const url = new URL(trackingLink);
      const pathParts = url.pathname.split('/');

      // Check if it's a v2 tracking link
      if (pathParts[1] === 'v2' && pathParts[2]) {
        const encodedData = pathParts[2];
        const decodedData = atob(encodedData);
        const trackingData = JSON.parse(decodedData);

        return {
          campaignId: trackingData.campaignId,
          promoterId: trackingData.promoterId,
          timestamp: trackingData.timestamp,
          metadata: trackingData.metadata,
          version: trackingData.version,
        };
      } else {
        // Fall back to legacy decoding
        return this.decodeTrackingLink(trackingLink);
      }
    } catch (error) {
      return { error: 'Failed to decode enhanced tracking link' };
    }
  }

  /**
   * Validate proposed content against campaign requirements
   */
  static validateProposedContent(
    proposedContent: {
      platform: string;
      contentType: string;
      description: string;
      hashtags?: string[];
      estimatedReach?: number;
    },
    campaignRequirements: string[]
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check platform requirements
    const platformReqs = campaignRequirements.filter(
      req =>
        req.toLowerCase().includes('tiktok') ||
        req.toLowerCase().includes('instagram')
    );

    for (const req of platformReqs) {
      if (
        req.toLowerCase().includes('tiktok') &&
        proposedContent.platform !== 'tiktok'
      ) {
        issues.push('Campaign requires TikTok content');
      }
      if (
        req.toLowerCase().includes('instagram') &&
        proposedContent.platform !== 'instagram'
      ) {
        issues.push('Campaign requires Instagram content');
      }
    }

    // Check content type requirements
    const contentTypeReqs = campaignRequirements.filter(
      req =>
        req.toLowerCase().includes('video') ||
        req.toLowerCase().includes('image') ||
        req.toLowerCase().includes('story') ||
        req.toLowerCase().includes('reel')
    );

    for (const req of contentTypeReqs) {
      const reqLower = req.toLowerCase();
      if (
        reqLower.includes('video') &&
        proposedContent.contentType !== 'video'
      ) {
        issues.push('Campaign requires video content');
      }
      if (reqLower.includes('reel') && proposedContent.contentType !== 'reel') {
        issues.push('Campaign requires reel content');
      }
    }

    // Check hashtag requirements
    const hashtagReqs = campaignRequirements.filter(
      req =>
        req.toLowerCase().includes('hashtag') || req.toLowerCase().includes('#')
    );

    if (
      hashtagReqs.length > 0 &&
      (!proposedContent.hashtags || proposedContent.hashtags.length === 0)
    ) {
      issues.push('Campaign requires specific hashtags');
    }

    // Check minimum reach requirements
    const reachReqs = campaignRequirements.filter(
      req =>
        req.toLowerCase().includes('reach') ||
        req.toLowerCase().includes('views')
    );

    for (const req of reachReqs) {
      const match = req.match(/(\d+)\s*(reach|views)/i);
      if (match && proposedContent.estimatedReach) {
        const requiredReach = parseInt(match[1]);
        if (proposedContent.estimatedReach < requiredReach) {
          issues.push(`Minimum ${requiredReach} estimated reach required`);
        }
      }
    }

    // Validate content description quality
    if (proposedContent.description.length < 20) {
      issues.push(
        'Content description should be more detailed (minimum 20 characters)'
      );
    }

    // Check for inappropriate content indicators
    const inappropriateKeywords = ['spam', 'fake', 'bot', 'scam'];
    const descriptionLower = proposedContent.description.toLowerCase();

    for (const keyword of inappropriateKeywords) {
      if (descriptionLower.includes(keyword)) {
        issues.push('Content description contains inappropriate terms');
        break;
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Generate comprehensive notification for application events
   */
  static generateComprehensiveNotification(
    type:
      | 'application_submitted'
      | 'application_approved'
      | 'application_rejected'
      | 'materials_accessed',
    data: {
      campaignTitle: string;
      promoterName?: string;
      creatorName?: string;
      reviewMessage?: string;
      feedback?: any;
    }
  ): { title: string; message: string } {
    switch (type) {
      case 'application_submitted':
        return {
          title: 'New Campaign Application',
          message: `${data.promoterName} has applied to your campaign "${data.campaignTitle}". Review their application in your dashboard.`,
        };

      case 'application_approved':
        return {
          title: 'Application Approved! 🎉',
          message: `Great news! Your application for "${data.campaignTitle}" has been approved by ${data.creatorName}. You can now access campaign materials and start promoting.${data.reviewMessage ? `\n\nCreator's message: ${data.reviewMessage}` : ''}`,
        };

      case 'application_rejected':
        return {
          title: 'Application Update',
          message: `Your application for "${data.campaignTitle}" was not approved this time.${data.reviewMessage ? `\n\nCreator's feedback: ${data.reviewMessage}` : ''}\n\nDon't worry! Keep improving your content and apply to other campaigns.`,
        };

      case 'materials_accessed':
        return {
          title: 'Materials Accessed',
          message: `${data.promoterName} has accessed the materials for campaign "${data.campaignTitle}". They can now start creating promotional content.`,
        };

      default:
        return {
          title: 'Campaign Update',
          message: `There's an update regarding campaign "${data.campaignTitle}".`,
        };
    }
  }

  /**
   * Calculate application score based on multiple factors
   */
  static calculateApplicationScore(application: {
    proposedContent?: {
      description: string;
      hashtags?: string[];
      estimatedReach?: number;
    };
    promoterProfile: {
      followerCount?: number;
      engagementRate?: number;
      previousCampaigns?: number;
      successRate?: number;
    };
    campaignRequirements: string[];
  }): {
    score: number; // 0-100
    breakdown: {
      contentQuality: number;
      profileStrength: number;
      requirementMatch: number;
      experience: number;
    };
    recommendations: string[];
  } {
    const breakdown = {
      contentQuality: 0,
      profileStrength: 0,
      requirementMatch: 0,
      experience: 0,
    };
    const recommendations: string[] = [];

    // Content Quality Score (0-25)
    if (application.proposedContent) {
      const content = application.proposedContent;
      let contentScore = 0;

      // Description quality
      if (content.description.length >= 50) contentScore += 10;
      else if (content.description.length >= 20) contentScore += 5;
      else recommendations.push('Provide a more detailed content description');

      // Hashtag usage
      if (content.hashtags && content.hashtags.length > 0) {
        contentScore += Math.min(content.hashtags.length * 2, 10);
      } else {
        recommendations.push('Include relevant hashtags in your proposal');
      }

      // Estimated reach
      if (content.estimatedReach && content.estimatedReach > 1000) {
        contentScore += 5;
      }

      breakdown.contentQuality = Math.min(contentScore, 25);
    } else {
      recommendations.push('Include a detailed content proposal');
    }

    // Profile Strength Score (0-25)
    const profile = application.promoterProfile;
    let profileScore = 0;

    if (profile.followerCount) {
      if (profile.followerCount >= 10000) profileScore += 10;
      else if (profile.followerCount >= 1000) profileScore += 5;
      else recommendations.push('Build your follower base to increase appeal');
    }

    if (profile.engagementRate) {
      if (profile.engagementRate >= 5) profileScore += 10;
      else if (profile.engagementRate >= 2) profileScore += 5;
      else recommendations.push('Work on improving your engagement rate');
    }

    if (profile.followerCount && profile.engagementRate) {
      profileScore += 5; // Bonus for having both metrics
    }

    breakdown.profileStrength = Math.min(profileScore, 25);

    // Requirement Match Score (0-25)
    const requirementValidation = this.validatePromoterRequirements(
      application.campaignRequirements,
      {
        socialAccounts: [], // This would be populated from actual data
        followerCount: profile.followerCount,
        engagementRate: profile.engagementRate,
      }
    );

    const matchPercentage =
      application.campaignRequirements.length > 0
        ? ((application.campaignRequirements.length -
            requirementValidation.missingRequirements.length) /
            application.campaignRequirements.length) *
          100
        : 100;

    breakdown.requirementMatch = Math.round((matchPercentage / 100) * 25);

    if (requirementValidation.missingRequirements.length > 0) {
      recommendations.push(
        ...requirementValidation.missingRequirements.map(
          req => `Address requirement: ${req}`
        )
      );
    }

    // Experience Score (0-25)
    let experienceScore = 0;

    if (profile.previousCampaigns) {
      experienceScore += Math.min(profile.previousCampaigns * 3, 15);
    } else {
      recommendations.push(
        'Complete more campaigns to build your track record'
      );
    }

    if (profile.successRate) {
      experienceScore += Math.round((profile.successRate / 100) * 10);
    }

    breakdown.experience = Math.min(experienceScore, 25);

    const totalScore =
      breakdown.contentQuality +
      breakdown.profileStrength +
      breakdown.requirementMatch +
      breakdown.experience;

    return {
      score: totalScore,
      breakdown,
      recommendations,
    };
  }
}

// Error types
export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class ApplicationNotFoundError extends ApplicationError {
  constructor(applicationId: string) {
    super(
      `Application with ID ${applicationId} not found`,
      'APPLICATION_NOT_FOUND',
      404
    );
  }
}

export class ApplicationAccessDeniedError extends ApplicationError {
  constructor() {
    super('Access denied to application', 'APPLICATION_ACCESS_DENIED', 403);
  }
}

export class InvalidApplicationStatusError extends ApplicationError {
  constructor(currentStatus: string, newStatus: string) {
    super(
      `Invalid status transition from ${currentStatus} to ${newStatus}`,
      'INVALID_APPLICATION_STATUS_TRANSITION',
      400
    );
  }
}

export class CampaignNotActiveError extends ApplicationError {
  constructor() {
    super(
      'Campaign is not currently active or accepting applications',
      'CAMPAIGN_NOT_ACTIVE',
      400
    );
  }
}

export class DuplicateApplicationError extends ApplicationError {
  constructor() {
    super(
      'You have already applied to this campaign',
      'DUPLICATE_APPLICATION',
      400
    );
  }
}
