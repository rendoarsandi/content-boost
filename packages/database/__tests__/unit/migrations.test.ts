import { MigrationRunner } from '../src/migrations';

// Mock the database connection
jest.mock('../src/connection', () => ({
  getDatabaseConnection: jest.fn().mockReturnValue({
    getClient: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
    transaction: jest.fn(),
  }),
}));

describe('MigrationRunner', () => {
  let migrationRunner: MigrationRunner;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Mock the database connection methods
    const mockDb = {
      getClient: jest.fn().mockResolvedValue(mockClient),
      transaction: jest.fn().mockImplementation(async callback => {
        return callback(mockClient);
      }),
    };

    // Mock getDatabaseConnection
    const { getDatabaseConnection } = require('../src/connection');
    getDatabaseConnection.mockReturnValue(mockDb);

    migrationRunner = new MigrationRunner();
  });

  describe('ensureMigrationsTable', () => {
    it('should create migrations table if not exists', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await migrationRunner.ensureMigrationsTable();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS migrations')
      );
    });
  });

  describe('getExecutedMigrations', () => {
    it('should return list of executed migrations', async () => {
      const mockMigrations = [
        {
          id: '001',
          name: 'create_initial_tables',
          timestamp: 20240101000000,
          executed_at: new Date(),
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockMigrations });

      const result = await migrationRunner.getExecutedMigrations();

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id, name, timestamp, executed_at FROM migrations ORDER BY timestamp ASC'
      );
      expect(result).toEqual(mockMigrations);
    });
  });

  describe('runMigrations', () => {
    it('should run pending migrations', async () => {
      // Mock no executed migrations
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // ensureMigrationsTable
        .mockResolvedValueOnce({ rows: [] }) // getExecutedMigrations
        .mockResolvedValue({ rows: [] }); // migration queries

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await migrationRunner.runMigrations();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Running')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('completed successfully')
      );

      consoleSpy.mockRestore();
    });

    it('should skip when no pending migrations', async () => {
      // Mock all migrations as executed
      const mockExecutedMigrations = [
        {
          id: '001',
          name: 'create_initial_tables',
          timestamp: 20240101000000,
          executed_at: new Date(),
        },
        {
          id: '002',
          name: 'create_indexes_and_partitions',
          timestamp: 20240101000001,
          executed_at: new Date(),
        },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // ensureMigrationsTable
        .mockResolvedValueOnce({ rows: mockExecutedMigrations }); // getExecutedMigrations

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await migrationRunner.runMigrations();

      expect(consoleSpy).toHaveBeenCalledWith('No pending migrations to run.');

      consoleSpy.mockRestore();
    });
  });

  describe('rollbackMigration', () => {
    it('should rollback specified migration', async () => {
      const migrationId = '001';
      const mockExecutedMigration = {
        id: migrationId,
        name: 'create_initial_tables',
        timestamp: 20240101000000,
        executed_at: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockExecutedMigration] }) // getExecutedMigrations
        .mockResolvedValue({ rows: [] }); // rollback queries

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await migrationRunner.rollbackMigration(migrationId);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Rolling back migration: ${migrationId}`)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('rolled back successfully')
      );

      consoleSpy.mockRestore();
    });

    it('should throw error for non-existent migration', async () => {
      await expect(migrationRunner.rollbackMigration('999')).rejects.toThrow(
        'Migration 999 not found'
      );
    });

    it('should throw error for non-executed migration', async () => {
      mockClient.query.mockResolvedValue({ rows: [] }); // getExecutedMigrations returns empty

      await expect(migrationRunner.rollbackMigration('001')).rejects.toThrow(
        'Migration 001 has not been executed'
      );
    });
  });
});
