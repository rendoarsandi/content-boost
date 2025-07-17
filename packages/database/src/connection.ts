import { Pool, PoolClient, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schemas';

export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
  ssl?: boolean;
}

export class DatabaseConnection {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private db: ReturnType<typeof drizzle> | null = null;

  constructor(config: DatabaseConfig) {
    this.config = {
      maxConnections: 20,
      idleTimeout: 30000,
      connectionTimeout: 5000,
      ssl: process.env.NODE_ENV === 'production',
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    const poolConfig: PoolConfig = {
      connectionString: this.config.url,
      max: this.config.maxConnections,
      idleTimeoutMillis: this.config.idleTimeout,
      connectionTimeoutMillis: this.config.connectionTimeout,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
    };

    this.pool = new Pool(poolConfig);
    this.db = drizzle(this.pool, { schema });

    // Test connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('Database connection pool initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
      console.log('Database connection pool closed');
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  getDb(): ReturnType<typeof drizzle> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool.connect();
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Singleton instance
let dbInstance: DatabaseConnection | null = null;

export function createDatabaseConnection(config: DatabaseConfig): DatabaseConnection {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection(config);
  }
  return dbInstance;
}

export function getDatabaseConnection(): DatabaseConnection {
  if (!dbInstance) {
    throw new Error('Database connection not initialized. Call createDatabaseConnection() first.');
  }
  return dbInstance;
}