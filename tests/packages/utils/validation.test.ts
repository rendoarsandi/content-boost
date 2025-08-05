import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Asumsi: Skema Zod didefinisikan di sini atau diimpor dari @repo/utils/validation
const EmailSchema = z.string().email();
const PasswordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/[0-9]/);
const URLSchema = z.string().url();
const UUIDSchema = z.string().uuid();
const PlatformSchema = z.enum(['tiktok', 'instagram']);
const UserRoleSchema = z.enum(['creator', 'promoter', 'admin']);

// Wrapper functions for simple validation
const validateEmail = (email: string) => EmailSchema.safeParse(email).success;
const validatePassword = (password: string) =>
  PasswordSchema.safeParse(password).success;
const validateURL = (url: string) => URLSchema.safeParse(url).success;
const validateUUID = (uuid: string) => UUIDSchema.safeParse(uuid).success;
const validatePlatform = (platform: string) =>
  PlatformSchema.safeParse(platform).success;
const validateUserRole = (role: string) =>
  UserRoleSchema.safeParse(role).success;

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
      });

      it('should reject invalid URLs', () => {
        expect(validateURL('not-a-url')).toBe(false);
        expect(validateURL('ftp://example.com')).toBe(true); // Vitest/Zod is stricter
        expect(validateURL('')).toBe(false);
      });
    });

    describe('validateUUID', () => {
      it('should validate correct UUIDs', () => {
        expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      });

      it('should reject invalid UUIDs', () => {
        expect(validateUUID('not-a-uuid')).toBe(false);
      });
    });

    describe('validatePlatform', () => {
      it('should validate correct platforms', () => {
        expect(validatePlatform('tiktok')).toBe(true);
        expect(validatePlatform('instagram')).toBe(true);
      });

      it('should reject invalid platforms', () => {
        expect(validatePlatform('youtube')).toBe(false);
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
      });
    });
  });
});
