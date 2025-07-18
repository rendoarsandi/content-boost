import { describe, it, expect } from '@jest/globals';
import { ApplicationService, ApplicationError, ApplicationNotFoundError } from '../src/application-service';

describe('ApplicationService', () => {
  describe('validateApplicationEligibility', () => {
    it('should allow application to active campaign', () => {
      const campaign = { status: 'active', startDate: null, endDate: null };
      const result = ApplicationService.validateApplicationEligibility(campaign);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject application to inactive campaign', () => {
      const campaign = { status: 'draft', startDate: null, endDate: null };
      const result = ApplicationService.validateApplicationEligibility(campaign);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Campaign is not currently active');
    });

    it('should reject application to campaign not yet started', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const campaign = { status: 'active', startDate: futureDate, endDate: null };
      const result = ApplicationService.validateApplicationEligibility(campaign);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Campaign has not started yet');
    });

    it('should reject application to expired campaign', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const campaign = { status: 'active', startDate: null, endDate: pastDate };
      const result = ApplicationService.validateApplicationEligibility(campaign);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Campaign application period has ended');
    });

    it('should reject duplicate application', () => {
      const campaign = { status: 'active', startDate: null, endDate: null };
      const existingApplication = { status: 'pending' };
      const result = ApplicationService.validateApplicationEligibility(campaign, existingApplication);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('You have already applied to this campaign (Status: pending)');
    });
  });

  describe('validateTrackingLink', () => {
    it('should validate correct tracking link', () => {
      const trackingLink = 'https://track.domain.com/abc123def456';
      const result = ApplicationService.validateTrackingLink(trackingLink);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid domain', () => {
      const trackingLink = 'https://evil.com/abc123def456';
      const result = ApplicationService.validateTrackingLink(trackingLink);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid tracking link domain');
    });

    it('should reject short tracking ID', () => {
      const trackingLink = 'https://track.domain.com/abc';
      const result = ApplicationService.validateTrackingLink(trackingLink);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid tracking link format');
    });

    it('should reject invalid URL format', () => {
      const trackingLink = 'not-a-url';
      const result = ApplicationService.validateTrackingLink(trackingLink);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid tracking link URL format');
    });
  });

  describe('decodeTrackingLink', () => {
    it('should decode valid tracking link', () => {
      // Create a valid encoded tracking link with simple IDs (no hyphens)
      const campaignId = 'campaign123';
      const promoterId = 'promoter456';
      const timestamp = Date.now();
      const trackingId = `${campaignId}-${promoterId}-${timestamp}`;
      const encodedId = Buffer.from(trackingId).toString('base64url');
      const trackingLink = `https://track.domain.com/${encodedId}`;
      
      const result = ApplicationService.decodeTrackingLink(trackingLink);
      
      expect(result.campaignId).toBe(campaignId);
      expect(result.promoterId).toBe(promoterId);
      expect(result.timestamp).toBe(timestamp);
      expect(result.error).toBeUndefined();
    });

    it('should handle invalid tracking link format', () => {
      const trackingLink = 'https://track.domain.com/invalid';
      const result = ApplicationService.decodeTrackingLink(trackingLink);
      
      expect(result.error).toBeDefined();
      expect(result.campaignId).toBeUndefined();
    });

    it('should handle missing tracking ID', () => {
      const trackingLink = 'https://track.domain.com/';
      const result = ApplicationService.decodeTrackingLink(trackingLink);
      
      expect(result.error).toBe('No tracking ID found in link');
    });
  });

  describe('generateNotificationMessage', () => {
    it('should generate approval message without review message', () => {
      const message = ApplicationService.generateNotificationMessage('approved', 'Test Campaign');
      
      expect(message).toContain('approved');
      expect(message).toContain('Test Campaign');
      expect(message).toContain('access the campaign materials');
    });

    it('should generate rejection message without review message', () => {
      const message = ApplicationService.generateNotificationMessage('rejected', 'Test Campaign');
      
      expect(message).toContain('rejected');
      expect(message).toContain('Test Campaign');
    });

    it('should include review message when provided', () => {
      const reviewMessage = 'Not enough followers';
      const message = ApplicationService.generateNotificationMessage('rejected', 'Test Campaign', reviewMessage);
      
      expect(message).toContain('rejected');
      expect(message).toContain('Test Campaign');
      expect(message).toContain(reviewMessage);
      expect(message).toContain("Creator's message:");
    });
  });

  describe('validatePromoterRequirements', () => {
    it('should validate promoter with all requirements met', () => {
      const requirements = ['TikTok account required', '1000 followers minimum'];
      const promoterProfile = {
        socialAccounts: [
          { platform: 'tiktok', verified: true }
        ],
        followerCount: 1500,
        engagementRate: 5
      };
      
      const result = ApplicationService.validatePromoterRequirements(requirements, promoterProfile);
      
      expect(result.valid).toBe(true);
      expect(result.missingRequirements).toHaveLength(0);
    });

    it('should identify missing TikTok account', () => {
      const requirements = ['TikTok account required'];
      const promoterProfile = {
        socialAccounts: [
          { platform: 'instagram', verified: true }
        ]
      };
      
      const result = ApplicationService.validatePromoterRequirements(requirements, promoterProfile);
      
      expect(result.valid).toBe(false);
      expect(result.missingRequirements).toContain('Verified TikTok account required');
    });

    it('should identify insufficient followers', () => {
      const requirements = ['5000 followers minimum'];
      const promoterProfile = {
        followerCount: 1000
      };
      
      const result = ApplicationService.validatePromoterRequirements(requirements, promoterProfile);
      
      expect(result.valid).toBe(false);
      expect(result.missingRequirements).toContain('Minimum 5000 followers required');
    });

    it('should identify insufficient engagement rate', () => {
      const requirements = ['10% engagement rate required'];
      const promoterProfile = {
        engagementRate: 5
      };
      
      const result = ApplicationService.validatePromoterRequirements(requirements, promoterProfile);
      
      expect(result.valid).toBe(false);
      expect(result.missingRequirements).toContain('Minimum 10% engagement rate required');
    });

    it('should handle multiple missing requirements', () => {
      const requirements = ['TikTok account required', 'Instagram account required', '1000 followers minimum'];
      const promoterProfile = {
        socialAccounts: [],
        followerCount: 500
      };
      
      const result = ApplicationService.validatePromoterRequirements(requirements, promoterProfile);
      
      expect(result.valid).toBe(false);
      expect(result.missingRequirements).toHaveLength(3);
    });
  });

  describe('calculateApplicationMetrics', () => {
    it('should calculate metrics correctly', () => {
      const applications = [
        { status: 'pending', appliedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        { status: 'approved', appliedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        { status: 'approved', appliedAt: new Date(Date.now() - 72 * 60 * 60 * 1000) },
        { status: 'rejected', appliedAt: new Date(Date.now() - 96 * 60 * 60 * 1000) },
      ];
      
      const metrics = ApplicationService.calculateApplicationMetrics(applications);
      
      expect(metrics.total).toBe(4);
      expect(metrics.pending).toBe(1);
      expect(metrics.approved).toBe(2);
      expect(metrics.rejected).toBe(1);
      expect(metrics.approvalRate).toBe(66.67); // 2/(2+1) * 100
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should handle empty applications array', () => {
      const applications: Array<{ status: string; appliedAt: Date }> = [];
      const metrics = ApplicationService.calculateApplicationMetrics(applications);
      
      expect(metrics.total).toBe(0);
      expect(metrics.pending).toBe(0);
      expect(metrics.approved).toBe(0);
      expect(metrics.rejected).toBe(0);
      expect(metrics.approvalRate).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
    });

    it('should handle all pending applications', () => {
      const applications = [
        { status: 'pending', appliedAt: new Date() },
        { status: 'pending', appliedAt: new Date() },
      ];
      
      const metrics = ApplicationService.calculateApplicationMetrics(applications);
      
      expect(metrics.total).toBe(2);
      expect(metrics.pending).toBe(2);
      expect(metrics.approved).toBe(0);
      expect(metrics.rejected).toBe(0);
      expect(metrics.approvalRate).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
    });
  });
});

describe('Application Error Classes', () => {
  it('should create ApplicationError correctly', () => {
    const error = new ApplicationError('Test error', 'TEST_ERROR', 400);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ApplicationError');
  });

  it('should create ApplicationNotFoundError correctly', () => {
    const error = new ApplicationNotFoundError('app-123');
    expect(error.message).toBe('Application with ID app-123 not found');
    expect(error.code).toBe('APPLICATION_NOT_FOUND');
    expect(error.statusCode).toBe(404);
  });
});

describe('ApplicationService Enhanced Features', () => {
  describe('generateEnhancedTrackingLink', () => {
    it('should generate enhanced tracking link with metadata', () => {
      const campaignId = 'campaign-123';
      const promoterId = 'promoter-456';
      const metadata = {
        platform: 'tiktok',
        contentType: 'video',
        expectedReach: 10000
      };
      
      const trackingLink = ApplicationService.generateEnhancedTrackingLink(
        campaignId, 
        promoterId, 
        metadata
      );
      
      expect(trackingLink).toContain('https://track.domain.com/v2/');
      expect(trackingLink.length).toBeGreaterThan(50);
    });

    it('should generate tracking link without metadata', () => {
      const campaignId = 'campaign-123';
      const promoterId = 'promoter-456';
      
      const trackingLink = ApplicationService.generateEnhancedTrackingLink(
        campaignId, 
        promoterId
      );
      
      expect(trackingLink).toContain('https://track.domain.com/v2/');
      expect(trackingLink.length).toBeGreaterThan(50);
    });
  });

  describe('decodeEnhancedTrackingLink', () => {
    it('should decode enhanced tracking link', () => {
      const campaignId = 'campaign-123';
      const promoterId = 'promoter-456';
      const metadata = { platform: 'tiktok' };
      
      const trackingLink = ApplicationService.generateEnhancedTrackingLink(
        campaignId, 
        promoterId, 
        metadata
      );
      
      const decoded = ApplicationService.decodeEnhancedTrackingLink(trackingLink);
      
      expect(decoded.campaignId).toBe(campaignId);
      expect(decoded.promoterId).toBe(promoterId);
      expect(decoded.metadata).toEqual(metadata);
      expect(decoded.version).toBe('2.0');
      expect(decoded.error).toBeUndefined();
    });

    it('should handle invalid enhanced tracking link', () => {
      const invalidLink = 'https://track.domain.com/v2/invalid';
      const decoded = ApplicationService.decodeEnhancedTrackingLink(invalidLink);
      
      expect(decoded.error).toBeDefined();
      expect(decoded.campaignId).toBeUndefined();
    });
  });

  describe('validateProposedContent', () => {
    it('should validate content that meets all requirements', () => {
      const proposedContent = {
        platform: 'tiktok',
        contentType: 'video',
        description: 'This is a detailed description of my proposed content for the campaign',
        hashtags: ['#brand', '#promotion'],
        estimatedReach: 5000
      };
      
      const requirements = ['TikTok video required', 'Minimum 1000 reach'];
      
      const result = ApplicationService.validateProposedContent(proposedContent, requirements);
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify platform mismatch', () => {
      const proposedContent = {
        platform: 'instagram',
        contentType: 'video',
        description: 'This is a detailed description of my proposed content',
        hashtags: ['#brand'],
        estimatedReach: 5000
      };
      
      const requirements = ['TikTok content required'];
      
      const result = ApplicationService.validateProposedContent(proposedContent, requirements);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Campaign requires TikTok content');
    });

    it('should identify insufficient reach', () => {
      const proposedContent = {
        platform: 'tiktok',
        contentType: 'video',
        description: 'This is a detailed description of my proposed content',
        estimatedReach: 500
      };
      
      const requirements = ['Minimum 1000 reach required'];
      
      const result = ApplicationService.validateProposedContent(proposedContent, requirements);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Minimum 1000 estimated reach required');
    });

    it('should identify short description', () => {
      const proposedContent = {
        platform: 'tiktok',
        contentType: 'video',
        description: 'Short desc',
        hashtags: ['#brand']
      };
      
      const requirements: string[] = [];
      
      const result = ApplicationService.validateProposedContent(proposedContent, requirements);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Content description should be more detailed (minimum 20 characters)');
    });
  });

  describe('generateComprehensiveNotification', () => {
    it('should generate application submitted notification', () => {
      const notification = ApplicationService.generateComprehensiveNotification(
        'application_submitted',
        {
          campaignTitle: 'Test Campaign',
          promoterName: 'John Doe'
        }
      );
      
      expect(notification.title).toBe('New Campaign Application');
      expect(notification.message).toContain('John Doe');
      expect(notification.message).toContain('Test Campaign');
    });

    it('should generate approval notification with review message', () => {
      const notification = ApplicationService.generateComprehensiveNotification(
        'application_approved',
        {
          campaignTitle: 'Test Campaign',
          creatorName: 'Jane Creator',
          reviewMessage: 'Great content proposal!'
        }
      );
      
      expect(notification.title).toContain('Approved');
      expect(notification.message).toContain('approved');
      expect(notification.message).toContain('Great content proposal!');
    });

    it('should generate rejection notification', () => {
      const notification = ApplicationService.generateComprehensiveNotification(
        'application_rejected',
        {
          campaignTitle: 'Test Campaign',
          reviewMessage: 'Please improve content quality'
        }
      );
      
      expect(notification.title).toBe('Application Update');
      expect(notification.message).toContain('not approved');
      expect(notification.message).toContain('Please improve content quality');
    });
  });

  describe('calculateApplicationScore', () => {
    it('should calculate high score for quality application', () => {
      const application = {
        proposedContent: {
          description: 'This is a very detailed and comprehensive content description that shows creativity and understanding of the campaign goals',
          hashtags: ['#brand', '#promotion', '#creative'],
          estimatedReach: 15000
        },
        promoterProfile: {
          followerCount: 25000,
          engagementRate: 6.5,
          previousCampaigns: 5,
          successRate: 85
        },
        campaignRequirements: ['TikTok account required', '1000 followers minimum']
      };
      
      const result = ApplicationService.calculateApplicationScore(application);
      
      expect(result.score).toBeGreaterThan(70);
      expect(result.breakdown.contentQuality).toBeGreaterThan(15);
      expect(result.breakdown.profileStrength).toBeGreaterThan(15);
      expect(result.recommendations.length).toBeLessThan(3);
    });

    it('should calculate low score for poor application', () => {
      const application = {
        promoterProfile: {
          followerCount: 100,
          engagementRate: 1.0
        },
        campaignRequirements: ['10000 followers minimum', 'TikTok account required']
      };
      
      const result = ApplicationService.calculateApplicationScore(application);
      
      expect(result.score).toBeLessThan(50);
      expect(result.recommendations.length).toBeGreaterThan(2);
      expect(result.recommendations.some(rec => rec.includes('content proposal'))).toBe(true);
    });

    it('should provide relevant recommendations', () => {
      const application = {
        proposedContent: {
          description: 'Short description',
          hashtags: [],
          estimatedReach: 500
        },
        promoterProfile: {
          followerCount: 500,
          engagementRate: 1.5
        },
        campaignRequirements: []
      };
      
      const result = ApplicationService.calculateApplicationScore(application);
      
      expect(result.recommendations).toContain('Provide a more detailed content description');
      expect(result.recommendations).toContain('Include relevant hashtags in your proposal');
      expect(result.recommendations).toContain('Build your follower base to increase appeal');
    });
  });
});