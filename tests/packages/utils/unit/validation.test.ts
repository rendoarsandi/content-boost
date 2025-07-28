import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateURL,
  validateUUID,
  validatePlatform,
  validateUserRole,
  validateCampaignStatus,
  validatePayoutStatus,
  validateData,
  parseData,
  createValidator,
  UserSchema,
  CreateUserSchema,
  CampaignSchema,
  CreateCampaignSchema,
  ViewRecordSchema,
  PayoutSchema,
  BotDetectionConfigSchema,
  PaginationSchema,
  DateRangeSchema
} from '@repo/utils/validation';

describe('Validation Utilities', () => {
  describe('Basic validation functions', () => {
    describe('validateEmail', () => {
      it('should validate correct email addresses', () => {
        expect(validateEmail('test@example.com')).toBe(true);
        expect(validateEmail('user.name+tag@domain.co.id')).toBe(true);
      });

      it('should reject invalid email addresses', () => {
        expect(validateEmail('invalid-email')).toBe(false);
        expect(validateEmail('test@')).toBe(false);
        expect(validateEmail('@domain.com')).toBe(false);
        expect(validateEmail('')).toBe(false);
      });
    });

    describe('validatePassword', () => {
      it('should validate strong passwords', () => {
        expect(validatePassword('Password123')).toBe(true);
        expect(validatePassword('MySecure1Pass')).toBe(true);
      });

      it('should reject weak passwords', () => {
        expect(validatePassword('short')).toBe(false); // Too short
        expect(validatePassword('password')).toBe(false); // No uppercase or number
        expect(validatePassword('PASSWORD123')).toBe(false); // No lowercase
        expect(validatePassword('Password')).toBe(false); // No number
      });
    });

    describe('validateURL', () => {
      it('should validate correct URLs', () => {
        expect(validateURL('https://example.com')).toBe(true);
        expect(validateURL('http://subdomain.domain.co.id/path')).toBe(true);
        expect(validateURL('https://drive.google.com/file/d/123/view')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        expect(validateURL('not-a-url')).toBe(false);
        expect(validateURL('ftp://example.com')).toBe(true); // FTP is valid URL format
        expect(validateURL('')).toBe(false);
      });
    });

    describe('validateUUID', () => {
      it('should validate correct UUIDs', () => {
        expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
        expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      it('should reject invalid UUIDs', () => {
        expect(validateUUID('not-a-uuid')).toBe(false);
        expect(validateUUID('123-456-789')).toBe(false);
        expect(validateUUID('')).toBe(false);
      });
    });

    describe('validatePlatform', () => {
      it('should validate correct platforms', () => {
        expect(validatePlatform('tiktok')).toBe(true);
        expect(validatePlatform('instagram')).toBe(true);
      });

      it('should reject invalid platforms', () => {
        expect(validatePlatform('youtube')).toBe(false);
        expect(validatePlatform('facebook')).toBe(false);
        expect(validatePlatform('')).toBe(false);
      });
    });

    describe('validateUserRole', () => {
      it('should validate correct user roles', () => {
        expect(validateUserRole('creator')).toBe(true);
        expect(validateUserRole('promoter')).toBe(true);
        expect(validateUserRole('admin')).toBe(true);
      });

      it('should reject invalid user roles', () => {
        expect(validateUserRole('user')).toBe(false);
        expect(validateUserRole('moderator')).toBe(false);
        expect(validateUserRole('')).toBe(false);
      });
    });
  });

  describe('Schema validation', () => {
    describe('UserSchema', () => {
      it('should validate correct user data', () => {
        const validUser = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          name: 'Test User',
          role: 'creator',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = validateData(UserSchema, validUser);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validUser);
      });

      it('should reject invalid user data', () => {
        const invalidUser = {
          id: 'invalid-uuid',
          email: 'invalid-email',
          name: '',
          role: 'invalid-role',
          createdAt: 'not-a-date',
          updatedAt: new Date()
        };

        const result = validateData(UserSchema, invalidUser);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      });
    });

    describe('CreateUserSchema', () => {
      it('should validate user creation data', () => {
        const validCreateUser = {
          email: 'newuser@example.com',
          name: 'New User',
          role: 'promoter'
        };

        const result = validateData(CreateUserSchema, validCreateUser);
        expect(result.success).toBe(true);
      });
    });

    describe('CampaignSchema', () => {
      it('should validate correct campaign data', () => {
        const validCampaign = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          creatorId: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Test Campaign',
          description: 'A test campaign',
          budget: 1000000,
          ratePerView: 1000,
          status: 'active',
          requirements: ['Must have 1000+ followers'],
          materials: [],
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = validateData(CampaignSchema, validCampaign);
        expect(result.success).toBe(true);
      });

      it('should reject campaign with end date before start date', () => {
        const invalidCampaign = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          creatorId: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Test Campaign',
          budget: 1000000,
          ratePerView: 1000,
          status: 'active',
          requirements: [],
          materials: [],
          startDate: new Date('2024-01-31'),
          endDate: new Date('2024-01-01'), // Before start date
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = validateData(CampaignSchema, invalidCampaign);
        expect(result.success).toBe(false);
        expect(result.errors?.some(error => error.includes('End date must be after start date'))).toBe(true);
      });

      it('should reject campaign with budget less than rate per view', () => {
        const invalidCampaign = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          creatorId: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Test Campaign',
          budget: 500, // Less than rate per view
          ratePerView: 1000,
          status: 'active',
          requirements: [],
          materials: [],
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = validateData(CampaignSchema, invalidCampaign);
        expect(result.success).toBe(false);
        expect(result.errors?.some(error => error.includes('Budget must be at least equal to rate per view'))).toBe(true);
      });
    });

    describe('ViewRecordSchema', () => {
      it('should validate correct view record data', () => {
        const validViewRecord = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          campaignId: '123e4567-e89b-12d3-a456-426614174001',
          promoterId: '123e4567-e89b-12d3-a456-426614174002',
          platform: 'tiktok',
          contentId: 'post-123',
          viewCount: 1000,
          likeCount: 100,
          commentCount: 10,
          shareCount: 5,
          botScore: 25,
          isLegitimate: true,
          timestamp: new Date()
        };

        const result = validateData(ViewRecordSchema, validViewRecord);
        expect(result.success).toBe(true);
      });

      it('should reject view record with negative counts', () => {
        const invalidViewRecord = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          campaignId: '123e4567-e89b-12d3-a456-426614174001',
          promoterId: '123e4567-e89b-12d3-a456-426614174002',
          platform: 'tiktok',
          contentId: 'post-123',
          viewCount: -100, // Negative
          likeCount: 100,
          commentCount: 10,
          shareCount: 5,
          timestamp: new Date()
        };

        const result = validateData(ViewRecordSchema, invalidViewRecord);
        expect(result.success).toBe(false);
        expect(result.errors?.some(error => error.includes('View count must be non-negative'))).toBe(true);
      });
    });

    describe('BotDetectionConfigSchema', () => {
      it('should validate correct bot detection config', () => {
        const validConfig = {
          thresholds: {
            viewLikeRatio: 10,
            viewCommentRatio: 100,
            spikePercentage: 500,
            spikeTimeWindow: 300000
          },
          confidence: {
            ban: 90,
            warning: 50,
            monitor: 20
          }
        };

        const result = validateData(BotDetectionConfigSchema, validConfig);
        expect(result.success).toBe(true);
      });

      it('should reject config with invalid confidence hierarchy', () => {
        const invalidConfig = {
          thresholds: {
            viewLikeRatio: 10,
            viewCommentRatio: 100,
            spikePercentage: 500,
            spikeTimeWindow: 300000
          },
          confidence: {
            ban: 50, // Lower than warning
            warning: 70,
            monitor: 20
          }
        };

        const result = validateData(BotDetectionConfigSchema, invalidConfig);
        expect(result.success).toBe(false);
        expect(result.errors?.some(error => error.includes('Ban confidence must be higher than warning confidence'))).toBe(true);
      });
    });

    describe('PaginationSchema', () => {
      it('should validate correct pagination data', () => {
        const validPagination = {
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        };

        const result = validateData(PaginationSchema, validPagination);
        expect(result.success).toBe(true);
      });

      it('should apply defaults for missing fields', () => {
        const partialPagination = {};

        const result = validateData(PaginationSchema, partialPagination);
        expect(result.success).toBe(true);
        expect(result.data?.page).toBe(1);
        expect(result.data?.limit).toBe(10);
        expect(result.data?.sortOrder).toBe('desc');
      });

      it('should reject invalid pagination values', () => {
        const invalidPagination = {
          page: 0, // Must be at least 1
          limit: 101 // Exceeds maximum
        };

        const result = validateData(PaginationSchema, invalidPagination);
        expect(result.success).toBe(false);
      });
    });

    describe('DateRangeSchema', () => {
      it('should validate correct date range', () => {
        const validDateRange = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        };

        const result = validateData(DateRangeSchema, validDateRange);
        expect(result.success).toBe(true);
      });

      it('should reject date range with end before start', () => {
        const invalidDateRange = {
          startDate: new Date('2024-01-31'),
          endDate: new Date('2024-01-01')
        };

        const result = validateData(DateRangeSchema, invalidDateRange);
        expect(result.success).toBe(false);
        expect(result.errors?.some(error => error.includes('End date must be after or equal to start date'))).toBe(true);
      });
    });
  });

  describe('Utility functions', () => {
    describe('parseData', () => {
      it('should parse valid data successfully', () => {
        const validUser = {
          email: 'test@example.com',
          name: 'Test User',
          role: 'creator'
        };

        const result = parseData(CreateUserSchema, validUser);
        expect(result).toEqual(validUser);
      });

      it('should throw error for invalid data', () => {
        const invalidUser = {
          email: 'invalid-email',
          name: '',
          role: 'invalid-role'
        };

        expect(() => parseData(CreateUserSchema, invalidUser)).toThrow('Validation failed');
      });
    });

    describe('createValidator', () => {
      it('should create a validator function', () => {
        const validator = createValidator(CreateUserSchema);
        
        const validUser = {
          email: 'test@example.com',
          name: 'Test User',
          role: 'creator'
        };

        const result = validator(validUser);
        expect(result).toEqual(validUser);
      });

      it('should throw error for invalid data in created validator', () => {
        const validator = createValidator(CreateUserSchema);
        
        const invalidUser = {
          email: 'invalid-email'
        };

        expect(() => validator(invalidUser)).toThrow('Validation failed');
      });
    });
  });
});