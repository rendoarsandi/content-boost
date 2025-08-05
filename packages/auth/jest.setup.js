// Mock environment variables for testing
process.env.TIKTOK_CLIENT_ID = 'test-tiktok-client-id';
process.env.TIKTOK_CLIENT_SECRET = 'test-tiktok-client-secret';
process.env.INSTAGRAM_CLIENT_ID = 'test-instagram-client-id';
process.env.INSTAGRAM_CLIENT_SECRET = 'test-instagram-client-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3001';
process.env.NEXTAUTH_SECRET = 'test-secret';

// Mock database
jest.mock('@repo/database', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
