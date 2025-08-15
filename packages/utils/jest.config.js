const baseConfig = require('../../jest.config.base.cjs');

module.exports = {
  ...baseConfig,
  displayName: 'utils',
  testMatch: [
    '<rootDir>/__tests__/**/*.test.ts',
    '<rootDir>/__tests__/**/*.spec.ts',
  ],
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  // Per-package specific configurations can be added here
};
