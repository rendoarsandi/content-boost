import { z } from 'zod';

// Campaign validation schemas
export const CampaignValidationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  budget: z.number().positive('Budget must be positive'),
  ratePerView: z.number().positive('Rate per view must be positive'),
  requirements: z.array(z.string()).default([]),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const MaterialValidationSchema = z.object({
  type: z.enum(['google_drive', 'youtube', 'image', 'video']),
  url: z.string().url('Invalid URL'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
});

// Campaign business logic
export class CampaignService {
  /**
   * Calculate maximum possible views based on budget and rate
   */
  static calculateMaxViews(budget: number, ratePerView: number): number {
    return Math.floor(budget / ratePerView);
  }

  /**
   * Calculate total cost for given views and rate
   */
  static calculateTotalCost(views: number, ratePerView: number): number {
    return views * ratePerView;
  }

  /**
   * Validate budget vs rate per view
   */
  static validateBudgetRate(budget: number, ratePerView: number): { valid: boolean; error?: string } {
    const maxViews = this.calculateMaxViews(budget, ratePerView);
    
    if (maxViews < 1) {
      return {
        valid: false,
        error: `Budget (${budget}) is too low for rate per view (${ratePerView}). Minimum budget should be ${ratePerView}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate campaign status transitions
   */
  static validateStatusTransition(currentStatus: string, newStatus: string): { valid: boolean; error?: string } {
    const validTransitions: Record<string, string[]> = {
      'draft': ['active'],
      'active': ['paused', 'completed'],
      'paused': ['active', 'completed'],
      'completed': [] // Cannot transition from completed
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        error: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate campaign dates
   */
  static validateCampaignDates(startDate?: Date, endDate?: Date): { valid: boolean; error?: string } {
    if (!startDate || !endDate) {
      return { valid: true }; // Optional dates
    }

    const now = new Date();
    
    if (startDate < now) {
      return {
        valid: false,
        error: 'Start date cannot be in the past'
      };
    }

    if (endDate <= startDate) {
      return {
        valid: false,
        error: 'End date must be after start date'
      };
    }

    return { valid: true };
  }

  /**
   * Check if campaign is active and within date range
   */
  static isCampaignActive(campaign: {
    status: string;
    startDate?: Date | null;
    endDate?: Date | null;
  }): boolean {
    if (campaign.status !== 'active') {
      return false;
    }

    const now = new Date();

    if (campaign.startDate && now < campaign.startDate) {
      return false;
    }

    if (campaign.endDate && now > campaign.endDate) {
      return false;
    }

    return true;
  }

  /**
   * Generate tracking link for promoter
   */
  static generateTrackingLink(campaignId: string, promoterId: string): string {
    // Generate a unique tracking identifier
    const trackingId = `${campaignId}-${promoterId}-${Date.now()}`;
    const encodedId = Buffer.from(trackingId).toString('base64url');
    
    return `https://track.domain.com/${encodedId}`;
  }

  /**
   * Validate material URL based on type
   */
  static validateMaterialUrl(type: string, url: string): { valid: boolean; error?: string } {
    try {
      const urlObj = new URL(url);
      
      switch (type) {
        case 'google_drive':
          if (!urlObj.hostname.includes('drive.google.com') && !urlObj.hostname.includes('docs.google.com')) {
            return { valid: false, error: 'Google Drive URL must be from drive.google.com or docs.google.com' };
          }
          break;
        case 'youtube':
          if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
            return { valid: false, error: 'YouTube URL must be from youtube.com or youtu.be' };
          }
          break;
        case 'image':
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
          const imageHosts = ['imgur.com', 'cloudinary.com', 'unsplash.com', 'pexels.com'];
          
          const hasImageExtension = imageExtensions.some(ext => 
            urlObj.pathname.toLowerCase().includes(ext)
          );
          const isImageHost = imageHosts.some(host => 
            urlObj.hostname.includes(host)
          );
          
          if (!hasImageExtension && !isImageHost) {
            return { valid: false, error: 'Image URL should point to an image file or known image hosting service' };
          }
          break;
        case 'video':
          const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
          const videoHosts = ['vimeo.com', 'dailymotion.com', 'twitch.tv'];
          
          const hasVideoExtension = videoExtensions.some(ext => 
            urlObj.pathname.toLowerCase().includes(ext)
          );
          const isVideoHost = videoHosts.some(host => 
            urlObj.hostname.includes(host)
          );
          
          if (!hasVideoExtension && !isVideoHost) {
            return { valid: false, error: 'Video URL should point to a video file or known video hosting service' };
          }
          break;
      }
      
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Calculate campaign progress metrics
   */
  static calculateCampaignProgress(campaign: {
    budget: number;
    ratePerView: number;
  }, totalViews: number = 0): {
    maxViews: number;
    currentViews: number;
    remainingViews: number;
    progressPercentage: number;
    remainingBudget: number;
    spentBudget: number;
  } {
    const maxViews = this.calculateMaxViews(campaign.budget, campaign.ratePerView);
    const currentViews = Math.min(totalViews, maxViews);
    const remainingViews = Math.max(0, maxViews - currentViews);
    const progressPercentage = maxViews > 0 ? (currentViews / maxViews) * 100 : 0;
    const spentBudget = currentViews * campaign.ratePerView;
    const remainingBudget = campaign.budget - spentBudget;

    return {
      maxViews,
      currentViews,
      remainingViews,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      remainingBudget: Math.max(0, remainingBudget),
      spentBudget
    };
  }
}

// Error types
export class CampaignError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'CampaignError';
  }
}

export class CampaignNotFoundError extends CampaignError {
  constructor(campaignId: string) {
    super(`Campaign with ID ${campaignId} not found`, 'CAMPAIGN_NOT_FOUND', 404);
  }
}

export class CampaignAccessDeniedError extends CampaignError {
  constructor() {
    super('Access denied to campaign', 'CAMPAIGN_ACCESS_DENIED', 403);
  }
}

export class InvalidCampaignStatusError extends CampaignError {
  constructor(currentStatus: string, newStatus: string) {
    super(
      `Invalid status transition from ${currentStatus} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION',
      400
    );
  }
}

export class InsufficientBudgetError extends CampaignError {
  constructor(budget: number, ratePerView: number) {
    super(
      `Budget (${budget}) is insufficient for rate per view (${ratePerView})`,
      'INSUFFICIENT_BUDGET',
      400
    );
  }
}