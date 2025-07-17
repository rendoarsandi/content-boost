import { DatabaseConnection } from '../src/connection';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
      release: jest.fn(),
    }),
    end: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ rows: [] }),
  })),
}));

// Mock drizzle-orm
jest.mock('drizzle-orm/node-postgres', () => ({
  drizzle: jest.fn().mockReturnValue({}),
}));

describe('DatabaseConnection', () => {
  let dbConnection: DatabaseConnection;

  beforeEach(() => {
    dbConnection = new DatabaseConnection({
      url: 'postgresql://test:test@localhost:5432/test',
    });
  });

  afterEach(async () => {
    await dbConnection.disconnect();
  });

  describe('connect', () => {
    it('should initialize connection pool successfully', async () => {
      await expect(dbConnection.connect()).resolves.not.toThrow();
    });

    it('should not create multiple pools on multiple connect calls', async () => {
      await dbConnection.connect();
      await dbConnection.connect(); // Should not throw or create new pool
      
      expect(dbConnection.getPool()).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should close connection pool', async () => {
      await dbConnection.connect();
      await expect(dbConnection.disconnect()).resolves.not.toThrow();
    });

    it('should handle disconnect when not connected', async () => {
      await expect(dbConnection.disconnect()).resolves.not.toThrow();
    });
  });

  describe('getPool', () => {
    it('should throw error when not connected', () => {
      expect(() => dbConnection.getPool()).toThrow('Database not connected');
    });

    it('should return pool when connected', async () => {
      await dbConnection.connect();
      expect(dbConnection.getPool()).toBeDefined();
    });
  });

  describe('getDb', () => {
    it('should throw error when not connected', () => {
      expect(() => dbConnection.getDb()).toThrow('Database not connected');
    });

    it('should return drizzle instance when connected', async () => {
      await dbConnection.connect();
      expect(dbConnection.getDb()).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should use default configuration values', () => {
      const db = new DatabaseConnection({ url: 'test' });
      // Access private config through any to test defaults
      const config = (db as any).config;
      
      expect(config.maxConnections).toBe(20);
      expect(config.idleTimeout).toBe(30000);
      expect(config.connectionTimeout).toBe(5000);
    });

    it('should override default configuration', () => {
      const db = new DatabaseConnection({
        url: 'test',
        maxConnections: 10,
        idleTimeout: 60000,
      });
      
      const config = (db as any).config;
      expect(config.maxConnections).toBe(10);
      expect(config.idleTimeout).toBe(60000);
    });
  });
});