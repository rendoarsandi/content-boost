const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  displayName: 'dashboard-app',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@repo/database$': '<rootDir>/../../packages/database/src',
    '^@repo/database/(.*)$': '<rootDir>/../../packages/database/src/$1',
    '^@repo/auth/(.*)$': '<rootDir>/../../packages/auth/src/$1',
    '^@repo/utils/(.*)$': '<rootDir>/../../packages/utils/src/$1',
    '^@repo/(.*)$': '<rootDir>/../../packages/$1/src',
  },
  testMatch: [
    '**/__tests__/unit/**/*.test.ts',
    '**/__tests__/unit/**/*.test.tsx',
    '**/__tests__/integration/**/*.test.ts',
    '**/__tests__/integration/**/*.test.tsx',
    '**/__tests__/e2e/**/*.spec.ts',
    '**/__tests__/security/**/*.test.ts',
  ],
};

module.exports = createJestConfig(customJestConfig);
