const baseConfig = require('../../jest.config.base.cjs');

module.exports = {
  ...baseConfig,
  displayName: 'config',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Per-package specific configurations can be added here
};
