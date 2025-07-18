import { describe, it, expect } from '@jest/globals';
import { CampaignService, CampaignError, CampaignNotFoundError } from '../src/campaign-service';

describe('CampaignService', () => {
  describe('calculateMaxViews', () => {
    it('should calculate maximum views correctly', () => {
      expect(CampaignService.calculateMaxViews(10000, 100)).toBe(100);
      expect(CampaignService.calculateMaxViews(5000, 250)).toBe(20);
      expect(CampaignService.calculateMaxViews(1000, 1500)).toBe(0);
    });
  });

  describe('calculateTotalCost', () => {
    it('should calculate total cost correctly', () => {
      expect(CampaignService.calculateTotalCost(100, 50)).toBe(5000);
      expect(CampaignService.calculateTotalCost(0, 100)).toBe(0);
      expect(CampaignService.calculateTotalCost(25, 200)).toBe(5000);
    });
  });

  describe('validateBudgetRate', () => {
    it('should validate valid budget and rate combinations', () => {
      const result = CampaignService.validateBudgetRate(10000, 100);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject budget too low for rate', () => {
      const result = CampaignService.validateBudgetRate(50, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Budget (50) is too low for rate per view (100)');
    });

    it('should handle edge case where budget equals rate', () => {
      const result = CampaignService.validateBudgetRate(100, 100);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid status transitions', () => {
      expect(CampaignService.validateStatusTransition('draft', 'active').valid).toBe(true);
      expect(CampaignService.validateStatusTransition('active', 'paused').valid).toBe(true);
      expect(CampaignService.validateStatusTransition('active', 'completed').valid).toBe(true);
      expect(CampaignService.validateStatusTransition('paused', 'active').valid).toBe(true);
      expect(CampaignService.validateStatusTransition('paused', 'completed').valid).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      const result1 = CampaignService.validateStatusTransition('draft', 'paused');
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('Invalid status transition from draft to paused');

      const result2 = CampaignService.validateStatusTransition('completed', 'active');
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('Invalid status transition from completed to active');
    });
  });

  describe('validateCampaignDates', () => {
    it('should allow undefined dates', () => {
      const result = CampaignService.validateCampaignDates();
      expect(result.valid).toBe(true);
    });

    it('should allow valid future dates', () => {
      const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next week
      
      const result = CampaignService.validateCampaignDates(startDate, endDate);
      expect(result.valid).toBe(true);
    });

    it('should reject past start dates', () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next week
      
      const result = CampaignService.validateCampaignDates(startDate, endDate);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Start date cannot be in the past');
    });

    it('should reject end date before start date', () => {
      const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next week
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      
      const result = CampaignService.validateCampaignDates(startDate, endDate);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('End date must be after start date');
    });
  });

  describe('isCampaignActive', () => {
    it('should return false for non-active status', () => {
      const campaign = { status: 'draft', startDate: null, endDate: null };
      expect(CampaignService.isCampaignActive(campaign)).toBe(false);
    });

    it('should return true for active campaign without dates', () => {
      const campaign = { status: 'active', startDate: null, endDate: null };
      expect(CampaignService.isCampaignActive(campaign)).toBe(true);
    });

    it('should return false for campaign not yet started', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const campaign = { status: 'active', startDate: futureDate, endDate: null };
      expect(CampaignService.isCampaignActive(campaign)).toBe(false);
    });

    it('should return false for expired campaign', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const campaign = { status: 'active', startDate: null, endDate: pastDate };
      expect(CampaignService.isCampaignActive(campaign)).toBe(false);
    });

    it('should return true for active campaign within date range', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const campaign = { status: 'active', startDate: pastDate, endDate: futureDate };
      expect(CampaignService.isCampaignActive(campaign)).toBe(true);
    });
  });

  describe('generateTrackingLink', () => {
    it('should generate unique tracking links', () => {
      const link1 = CampaignService.generateTrackingLink('campaign-1', 'promoter-1');
      const link2 = CampaignService.generateTrackingLink('campaign-1', 'promoter-2');
      const link3 = CampaignService.generateTrackingLink('campaign-2', 'promoter-1');

      expect(link1).toMatch(/^https:\/\/track\.domain\.com\/.+/);
      expect(link2).toMatch(/^https:\/\/track\.domain\.com\/.+/);
      expect(link3).toMatch(/^https:\/\/track\.domain\.com\/.+/);
      
      expect(link1).not.toBe(link2);
      expect(link1).not.toBe(link3);
      expect(link2).not.toBe(link3);
    });
  });

  describe('validateMaterialUrl', () => {
    it('should validate Google Drive URLs', () => {
      expect(CampaignService.validateMaterialUrl('google_drive', 'https://drive.google.com/file/d/123').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('google_drive', 'https://docs.google.com/document/d/123').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('google_drive', 'https://example.com/file').valid).toBe(false);
    });

    it('should validate YouTube URLs', () => {
      expect(CampaignService.validateMaterialUrl('youtube', 'https://youtube.com/watch?v=123').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('youtube', 'https://youtu.be/123').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('youtube', 'https://vimeo.com/123').valid).toBe(false);
    });

    it('should validate image URLs', () => {
      expect(CampaignService.validateMaterialUrl('image', 'https://example.com/image.jpg').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('image', 'https://imgur.com/abc123').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('image', 'https://example.com/document.pdf').valid).toBe(false);
    });

    it('should validate video URLs', () => {
      expect(CampaignService.validateMaterialUrl('video', 'https://example.com/video.mp4').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('video', 'https://vimeo.com/123456').valid).toBe(true);
      expect(CampaignService.validateMaterialUrl('video', 'https://example.com/document.txt').valid).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(CampaignService.validateMaterialUrl('image', 'not-a-url').valid).toBe(false);
      expect(CampaignService.validateMaterialUrl('video', '').valid).toBe(false);
    });
  });

  describe('calculateCampaignProgress', () => {
    it('should calculate progress correctly', () => {
      const campaign = { budget: 10000, ratePerView: 100 };
      const progress = CampaignService.calculateCampaignProgress(campaign, 50);

      expect(progress.maxViews).toBe(100);
      expect(progress.currentViews).toBe(50);
      expect(progress.remainingViews).toBe(50);
      expect(progress.progressPercentage).toBe(50);
      expect(progress.spentBudget).toBe(5000);
      expect(progress.remainingBudget).toBe(5000);
    });

    it('should handle views exceeding budget', () => {
      const campaign = { budget: 10000, ratePerView: 100 };
      const progress = CampaignService.calculateCampaignProgress(campaign, 150);

      expect(progress.maxViews).toBe(100);
      expect(progress.currentViews).toBe(100); // Capped at max
      expect(progress.remainingViews).toBe(0);
      expect(progress.progressPercentage).toBe(100);
      expect(progress.spentBudget).toBe(10000);
      expect(progress.remainingBudget).toBe(0);
    });

    it('should handle zero views', () => {
      const campaign = { budget: 10000, ratePerView: 100 };
      const progress = CampaignService.calculateCampaignProgress(campaign, 0);

      expect(progress.maxViews).toBe(100);
      expect(progress.currentViews).toBe(0);
      expect(progress.remainingViews).toBe(100);
      expect(progress.progressPercentage).toBe(0);
      expect(progress.spentBudget).toBe(0);
      expect(progress.remainingBudget).toBe(10000);
    });
  });
});

describe('Campaign Error Classes', () => {
  it('should create CampaignError correctly', () => {
    const error = new CampaignError('Test error', 'TEST_ERROR', 400);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('CampaignError');
  });

  it('should create CampaignNotFoundError correctly', () => {
    const error = new CampaignNotFoundError('campaign-123');
    expect(error.message).toBe('Campaign with ID campaign-123 not found');
    expect(error.code).toBe('CAMPAIGN_NOT_FOUND');
    expect(error.statusCode).toBe(404);
  });
});