import { PoolClient } from 'pg';
import { getDatabaseConnection } from '../connection';

export abstract class BaseRepository<T> {
  protected db = getDatabaseConnection();

  protected async withClient<R>(callback: (client: PoolClient) => Promise<R>): Promise<R> {
    const client = await this.db.getClient();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }

  protected async withTransaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R> {
    return this.db.transaction(callback);
  }

  // Abstract methods that must be implemented by concrete repositories
  abstract findById(id: string): Promise<T | null>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T | null>;
  abstract delete(id: string): Promise<boolean>;
  abstract findAll(options?: { limit?: number; offset?: number }): Promise<T[]>;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}