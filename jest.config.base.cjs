module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  transform: {
    '^.+\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  passWithNoTests: true,
  moduleNameMapper: {
    '^@repo/auth(.*)$': '<rootDir>/../auth/src$1',
    '^@repo/cache(.*)$': '<rootDir>/../cache/src$1',
    '^@repo/config(.*)$': '<rootDir>/../config/src$1',
    '^@repo/database(.*)$': '<rootDir>/../database/src$1',
    '^@repo/ui(.*)$': '<rootDir>/../ui/src$1',
    '^@repo/utils(.*)$': '<rootDir>/../utils/src$1',
  },
};
