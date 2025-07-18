const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
  ],
  coverageDirectory: '../../reports/coverage/dashboard-app',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@repo/database$': '<rootDir>/../../packages/database/src',
    '^@repo/database/(.*)$': '<rootDir>/../../packages/database/src/$1',
    '^@repo/auth/(.*)$': '<rootDir>/../../packages/auth/src/$1',
    '^@repo/utils/(.*)$': '<rootDir>/../../packages/utils/src/$1',
    '^@repo/(.*)$': '<rootDir>/../../packages/$1/src',
  },
}

module.exports = createJestConfig(customJestConfig)