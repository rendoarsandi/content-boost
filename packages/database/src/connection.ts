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

// Initialize default database connection
const defaultConfig: DatabaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://localhost:5432/creator_platform',
};

const connection = createDatabaseConnection(defaultConfig);

// Create a lazy database instance that connects on first use
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    // Lazy connection - only connect when actually used
    if (!connection.getDb) {
      throw new Error('Database connection not available');
    }
    
    try {
      const dbInstance = connection.getDb();
      return dbInstance[prop as keyof typeof dbInstance];
    } catch (error) {
      // If not connected, try to connect now
      if (process.env.DATABASE_URL) {
        connection.connect().catch(console.error);
      }
      throw error;
    }
  }
});

// Don't auto-connect during build or test
// Connection will be established on first database operation