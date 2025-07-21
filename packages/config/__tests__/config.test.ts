
import { describe, it, expect } from '@jest/globals';
import { env } from '../src/env';

describe('Config Package', () => {
  it('should load and validate environment variables', () => {
    // Check for a few key variables to ensure they are loaded
    expect(env.NODE_ENV).toBeDefined();
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.NEXTAUTH_URL).toBeDefined();
  });

  it('should have correct types for variables', () => {
    // Example: Check if a variable that should be a number is a number
    // This depends on the schema definition in Zod
    expect(typeof env.NODE_ENV).toBe('string');
  });

  it('should have default values for optional variables', () => {
    // If you have optional variables with defaults, test them here
    // For example, if LOG_LEVEL has a default
    // expect(env.LOG_LEVEL).toBe('info');
  });
});
