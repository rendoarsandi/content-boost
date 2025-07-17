import { z } from 'zod';

// Common validation schemas
export const EmailSchema = z.string().email();
export const PasswordSchema = z.string().min(8);
export const URLSchema = z.string().url();
export const UUIDSchema = z.string().uuid();

// Validation utilities
export function validateEmail(email: string): boolean {
  return EmailSchema.safeParse(email).success;
}

export function validatePassword(password: string): boolean {
  return PasswordSchema.safeParse(password).success;
}

export function validateURL(url: string): boolean {
  return URLSchema.safeParse(url).success;
}

export function validateUUID(uuid: string): boolean {
  return UUIDSchema.safeParse(uuid).success;
}