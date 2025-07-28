import { CampaignService, CampaignError, InsufficientBudgetError } from '../src/campaign-service';

describe('CampaignService', () => {
  describe('calculateMaxViews', () => {
    test('should calculate maximum views correctly', () => {
      expect(CampaignService.calculateMaxViews(1000, 10)).toBe(100);
      expect(CampaignService.calculateMaxViews(500, 5)).toBe(100);
      expect(CampaignService.calculateMaxViews(100, 25)).toBe(4);
    });

    test('should handle decimal results', () => {
      expect(CampaignService.calculateMaxViews(100, 30)).toBe(3); // Floor of 3.33
      expect(CampaignService.calculateMaxViews(1000, 333)).toBe(3); // Floor of 3.003
    });
  });

  describe('calculateTotalCost', () => {
    test('should calculate total cost correctly', () => {
      expect(CampaignService.calculateTotalCost(100, 10)).toBe(1000);
      expect(CampaignService.calculateTotalCost(50, 5)).toBe(250);
      expect(CampaignService.calculateTotalCost(0, 10)).toBe(0);
    });
  });

  describe('validateBudgetRate', () => {
    test('should validate valid budget and rate combinations', () => {
      const result = CampaignService.validateBudgetRate(1000, 10);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject insufficient budget', () => {
      const result = CampaignService.validateBudgetRate(5, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Budget (5) is too low');
    });

    test('should handle edge case where budget equals rate', () => {
      const result = CampaignService.validateBudgetRate(10, 10);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateStatusTransition', () => {
    test('should allow valid status transitions', () => {
      expect(CampaignService.validateStatusTransition('draft', 'active').valid).toBe(true);
      expect(CampaignService.validateStatusTransition('active', 'paused').valid).toBe(true);
      expect(CampaignService.validateStatusTransition('active', 'completed').valid).toBe(true);
      expect(CampaignService.validateStatusTransition('paused', 'active').valid).toBe(true);
      expect(CampaignService.validateStatusTransition('paused', 'completed').valid).toBe(true);
    });

    test('should reject invalid status transitions', () => {
      expect(CampaignService.validateStatusTransition('draft', 'paused').valid).toBe(false);
      expect(CampaignService.validateStatusTransition('draft', 'completed').valid).toBe(false);
      expect(CampaignService.validateStatusTransition('completed', 'active').valid).toBe(false);
      expect(CampaignService.validateStatusTransition('completed', 'paused').valid).toBe(false);
    });
  });

  describe('validateCampaignDates', () => {
    test('should allow undefined dates', () => {
      const result = CampaignService.validateCampaignDates();
      expect(result.valid).toBe(true);
    });

    test('should allow valid future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const result = CampaignService.validateCampaignDates(tomorrow, nextWeek);
      expect(result.valid).toBe(true);
    });

    test('should reject past start dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = CampaignService.validateCampaignDates(yesterday, tomorrow);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Start date cannot be in the past');
    });

    test('should reject end date before start date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const today = new Date();

      const result = CampaignService.validateCampaignDates(tomorrow, today);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('End date must be after start date');
    });
  });

  describe('isCampaignActive', () => {
    test('should return false for non-active status', () => {
      const campaign = { status: 'draft', startDate: null, endDate: null };
      expect(CampaignService.isCampaignActive(campaign)).toBe(false);
    });

    test('should return true for active campaign with no date restrictions', () => {
      const campaign = { status: 'active', startDate: null, endDate: null };
      expect(CampaignService.isCampaignActive(campaign)).toBe(true);
    });

    test('should return false for campaign not yet started', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const campaign = { status: 'active', startDate: tomorrow, endDate: null };
      expect(CampaignService.isCampaignActive(campaign)).toBe(false);
    });

    test('should return false for expired campaign', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const campaign = { status: 'active', startDate: null, endDate: yesterday };
      expect(CampaignService.isCampaignActive(campaign)).toBe(false);
    });
  });

  describe('generateTrackingLink', () => {
    test('should generate unique tracking links', () => {
      const link1 = CampaignService.generateTrackingLink('campaign1', 'promoter1');
      const link2 = CampaignService.generateTrackingLink('campaign1', 'promoter1');
      
      expect(link1).toMatch(/^https:\/\/track\.domain\.com\//);
      expect(link2).toMatch(/^https:\/\/track\.domain\.com\//);
      expect(link1).not.toBe(link2); // Should be unique due to timestamp
    });

    test('should include campaign and promoter information', () => {
      const link = CampaignService.generateTrackingLink('test-campaign', 'test-promoter');
      expect(link).toContain('track.domain.com');
      
      // Decode the link to verify it contains the IDs
      const encodedPart = link.split('/').pop();
      const decoded = Buffer.from(encodedPart!, 'base64url').toString();
      expect(decoded).toContain('test-campaign');
      expect(decoded).toContain('test-promoter');
    });
  });

  describe('validateMaterialUrl', () => {
    test('should validate Google Drive URLs', () => {
      expect(CampaignService.validateMaterialUrl('google_drive', 'https://drive.google.com/file/d/123').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('google_drive', 'https://docs.google.com/document/d/123').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('google_drive', 'https://example.com/file').valid).toBe(false);
    });

    test('should validate YouTube URLs', () => {
      expect(CampaignService.validateMaterialUrl('youtube', 'https://youtube.com/watch?v=123').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('youtube', 'https://youtu.be/123').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('youtube', 'https://vimeo.com/123').valid).toBe(false);
    });

    test('should validate image URLs', () => {
      expect(CampaignService.validateMaterialUrl('image', 'https://example.com/image.jpg').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('image', 'https://imgur.com/abc123').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('image', 'https://example.com/document.pdf').valid).toBe(false);
    });

    test('should validate video URLs', () => {
      expect(CampaignService.validateMaterialUrl('video', 'https://example.com/video.mp4').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('video', 'https://vimeo.com/123456').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('video', 'https://example.com/audio.mp3').valid).toBe(false);
    });

    test('should reject invalid URLs', () => {
      expect(CampaignService.validateMaterialUrl('youtube', 'not-a-url').valid).toBe(false);
      expect(CampaignService.validateMaterialUrl('image', '').valid).toBe(false);
    });
  });

  describe('calculateCampaignProgress', () => {
    test('should calculate progress correctly', () => {
      const campaign = { budget: 1000, ratePerView: 10 };
      const progress = CampaignService.calculateCampaignProgress(campaign, 50);

      expect(progress.maxViews).toBe(100);
      expect(progress.currentViews).toBe(50);
      expect(progress.remainingViews).toBe(50);
      expect(progress.progressPercentage).toBe(50);
      expect(progress.spentBudget).toBe(500);
      expect(progress.remainingBudget).toBe(500);
    });

    test('should handle zero views', () => {
      const campaign = { budget: 1000, ratePerView: 10 };
      const progress = CampaignService.calculateCampaignProgress(campaign, 0);

      expect(progress.currentViews).toBe(0);
      expect(progress.progressPercentage).toBe(0);
      expect(progress.spentBudget).toBe(0);
      expect(progress.remainingBudget).toBe(1000);
    });

    test('should handle views exceeding budget', () => {
      const campaign = { budget: 1000, ratePerView: 10 };
      const progress = CampaignService.calculateCampaignProgress(campaign, 150);

      expect(progress.currentViews).toBe(100); // Capped at max views
      expect(progress.remainingViews).toBe(0);
      expect(progress.progressPercentage).toBe(100);
      expect(progress.remainingBudget).toBe(0);
    });
  });
});