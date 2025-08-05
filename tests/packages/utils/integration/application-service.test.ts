import { ApplicationService } from '../src/application-service';

describe('ApplicationService', () => {
  describe('validateApplicationEligibility', () => {
    test('should allow application to active campaign', () => {
      const campaign = { status: 'active', startDate: null, endDate: null };
      const result =
        ApplicationService.validateApplicationEligibility(campaign);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject application to inactive campaign', () => {
      const campaign = { status: 'draft', startDate: null, endDate: null };
      const result =
        ApplicationService.validateApplicationEligibility(campaign);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Campaign is not currently active');
    });

    test('should reject application to campaign not yet started', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const campaign = { status: 'active', startDate: tomorrow, endDate: null };
      const result =
        ApplicationService.validateApplicationEligibility(campaign);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Campaign has not started yet');
    });

    test('should reject application to expired campaign', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const campaign = {
        status: 'active',
        startDate: null,
        endDate: yesterday,
      };
      const result =
        ApplicationService.validateApplicationEligibility(campaign);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Campaign application period has ended');
    });

    test('should reject duplicate application', () => {
      const campaign = { status: 'active', startDate: null, endDate: null };
      const existingApplication = { status: 'pending' };
      const result = ApplicationService.validateApplicationEligibility(
        campaign,
        existingApplication
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain(
        'You have already applied to this campaign'
      );
    });
  });

  describe('validateTrackingLink', () => {
    test('should validate correct tracking link format', () => {
      const validLink = 'https://track.domain.com/abcdef123456';
      const result = ApplicationService.validateTrackingLink(validLink);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject invalid domain', () => {
      const invalidLink = 'https://evil.com/abcdef123456';
      const result = ApplicationService.validateTrackingLink(invalidLink);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid tracking link domain');
    });

    test('should reject short tracking ID', () => {
      const invalidLink = 'https://track.domain.com/abc';
      const result = ApplicationService.validateTrackingLink(invalidLink);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid tracking link format');
    });

    test('should reject malformed URL', () => {
      const invalidLink = 'not-a-url';
      const result = ApplicationService.validateTrackingLink(invalidLink);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid tracking link URL format');
    });
  });

  describe('generateNotificationMessage', () => {
    test('should generate approval message', () => {
      const message = ApplicationService.generateNotificationMessage(
        'approved',
        'Test Campaign'
      );

      expect(message).toContain('approved');
      expect(message).toContain('Test Campaign');
      expect(message).toContain('access the campaign materials');
    });

    test('should generate rejection message', () => {
      const message = ApplicationService.generateNotificationMessage(
        'rejected',
        'Test Campaign'
      );

      expect(message).toContain('rejected');
      expect(message).toContain('Test Campaign');
    });

    test('should include review message when provided', () => {
      const reviewMessage = 'Great content proposal!';
      const message = ApplicationService.generateNotificationMessage(
        'approved',
        'Test Campaign',
        reviewMessage
      );

      expect(message).toContain(reviewMessage);
      expect(message).toContain("Creator's message:");
    });
  });

  describe('validatePromoterRequirements', () => {
    const mockPromoterProfile = {
      socialAccounts: [
        { platform: 'tiktok', verified: true },
        { platform: 'instagram', verified: true },
      ],
      followerCount: 5000,
      engagementRate: 3.5,
    };

    test('should validate promoter meets all requirements', () => {
      const requirements = [
        'tiktok account',
        '1000 followers',
        '2% engagement',
      ];
      const result = ApplicationService.validatePromoterRequirements(
        requirements,
        mockPromoterProfile
      );

      expect(result.valid).toBe(true);
      expect(result.missingRequirements).toHaveLength(0);
    });

    test('should identify missing social media accounts', () => {
      const requirements = ['tiktok account', 'instagram account'];
      const result = ApplicationService.validatePromoterRequirements(
        requirements,
        {
          socialAccounts: [{ platform: 'tiktok', verified: true }],
        }
      );

      expect(result.valid).toBe(false);
      expect(result.missingRequirements).toContain(
        'Verified Instagram account required'
      );
    });

    test('should identify insufficient follower count', () => {
      const requirements = ['10000 followers'];
      const result = ApplicationService.validatePromoterRequirements(
        requirements,
        {
          followerCount: 5000,
        }
      );

      expect(result.valid).toBe(false);
      expect(result.missingRequirements).toContain(
        'Minimum 10000 followers required'
      );
    });

    test('should identify insufficient engagement rate', () => {
      const requirements = ['5% engagement'];
      const result = ApplicationService.validatePromoterRequirements(
        requirements,
        {
          engagementRate: 2.0,
        }
      );

      expect(result.valid).toBe(false);
      expect(result.missingRequirements).toContain(
        'Minimum 5% engagement rate required'
      );
    });
  });

  describe('calculateApplicationMetrics', () => {
    const mockApplications = [
      { status: 'pending', appliedAt: new Date('2024-01-01') },
      { status: 'approved', appliedAt: new Date('2024-01-02') },
      { status: 'approved', appliedAt: new Date('2024-01-03') },
      { status: 'rejected', appliedAt: new Date('2024-01-04') },
    ];

    test('should calculate metrics correctly', () => {
      const metrics =
        ApplicationService.calculateApplicationMetrics(mockApplications);

      expect(metrics.total).toBe(4);
      expect(metrics.pending).toBe(1);
      expect(metrics.approved).toBe(2);
      expect(metrics.rejected).toBe(1);
      expect(metrics.approvalRate).toBe(66.67); // 2/3 * 100, rounded
    });

    test('should handle empty applications array', () => {
      const metrics = ApplicationService.calculateApplicationMetrics([]);

      expect(metrics.total).toBe(0);
      expect(metrics.pending).toBe(0);
      expect(metrics.approved).toBe(0);
      expect(metrics.rejected).toBe(0);
      expect(metrics.approvalRate).toBe(0);
    });
  });

  describe('generateEnhancedTrackingLink', () => {
    test('should generate enhanced tracking link with metadata', () => {
      const metadata = {
        platform: 'tiktok',
        contentType: 'video',
        expectedReach: 10000,
      };

      const link = ApplicationService.generateEnhancedTrackingLink(
        'campaign1',
        'promoter1',
        metadata
      );

      expect(link).toMatch(/^https:\/\/track\.domain\.com\/v2\//);
      expect(link).toContain('v2');
    });

    test('should generate link without metadata', () => {
      const link = ApplicationService.generateEnhancedTrackingLink(
        'campaign1',
        'promoter1'
      );

      expect(link).toMatch(/^https:\/\/track\.domain\.com\/v2\//);
    });
  });

  describe('decodeEnhancedTrackingLink', () => {
    test('should decode enhanced tracking link', () => {
      const originalMetadata = {
        platform: 'tiktok',
        contentType: 'video',
        expectedReach: 10000,
      };

      const link = ApplicationService.generateEnhancedTrackingLink(
        'test-campaign',
        'test-promoter',
        originalMetadata
      );
      const decoded = ApplicationService.decodeEnhancedTrackingLink(link);

      expect(decoded.campaignId).toBe('test-campaign');
      expect(decoded.promoterId).toBe('test-promoter');
      expect(decoded.metadata).toEqual(originalMetadata);
      expect(decoded.version).toBe('2.0');
    });

    test('should handle invalid tracking link', () => {
      const decoded = ApplicationService.decodeEnhancedTrackingLink(
        'https://invalid.com/link'
      );

      expect(decoded.error).toBeDefined();
      expect(decoded.campaignId).toBeUndefined();
    });
  });

  describe('validateProposedContent', () => {
    const mockProposedContent = {
      platform: 'tiktok',
      contentType: 'video',
      description:
        'I will create an engaging TikTok video showcasing the product features',
      hashtags: ['#product', '#review', '#tiktok'],
      estimatedReach: 5000,
    };

    test('should validate content that meets requirements', () => {
      const requirements = [
        'tiktok platform',
        'video content',
        'hashtags required',
      ];
      const result = ApplicationService.validateProposedContent(
        mockProposedContent,
        requirements
      );

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('should identify platform mismatch', () => {
      const requirements = ['instagram platform'];
      const result = ApplicationService.validateProposedContent(
        mockProposedContent,
        requirements
      );

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Campaign requires Instagram content');
    });

    test('should identify content type mismatch', () => {
      const requirements = ['reel content'];
      const result = ApplicationService.validateProposedContent(
        mockProposedContent,
        requirements
      );

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Campaign requires reel content');
    });

    test('should identify missing hashtags', () => {
      const requirements = ['hashtags required'];
      const contentWithoutHashtags = {
        ...mockProposedContent,
        hashtags: undefined,
      };
      const result = ApplicationService.validateProposedContent(
        contentWithoutHashtags,
        requirements
      );

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Campaign requires specific hashtags');
    });

    test('should identify insufficient description', () => {
      const shortContent = {
        ...mockProposedContent,
        description: 'Short desc',
      };
      const result = ApplicationService.validateProposedContent(
        shortContent,
        []
      );

      expect(result.valid).toBe(false);
      expect(result.issues).toContain(
        'Content description should be more detailed (minimum 20 characters)'
      );
    });
  });

  describe('calculateApplicationScore', () => {
    const mockApplication = {
      proposedContent: {
        description:
          'Detailed description of the content I will create for this campaign',
        hashtags: ['#brand', '#product', '#review'],
        estimatedReach: 5000,
      },
      promoterProfile: {
        followerCount: 10000,
        engagementRate: 4.5,
        previousCampaigns: 5,
        successRate: 85,
      },
      campaignRequirements: ['tiktok account', '1000 followers'],
    };

    test('should calculate application score', () => {
      const result =
        ApplicationService.calculateApplicationScore(mockApplication);

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toHaveProperty('contentQuality');
      expect(result.breakdown).toHaveProperty('profileStrength');
      expect(result.breakdown).toHaveProperty('requirementMatch');
      expect(result.breakdown).toHaveProperty('experience');
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    test('should provide recommendations for improvement', () => {
      const weakApplication = {
        promoterProfile: {
          followerCount: 100,
          engagementRate: 1.0,
        },
        campaignRequirements: ['10000 followers', '5% engagement'],
      };

      const result =
        ApplicationService.calculateApplicationScore(weakApplication);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => rec.includes('follower'))).toBe(
        true
      );
    });
  });
});
