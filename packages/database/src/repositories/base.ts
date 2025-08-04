import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../connection';

type TransactionalClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export abstract class BaseRepository<T, C, U> {
  protected db: PrismaClient | TransactionalClient;

  constructor(client?: TransactionalClient) {
    this.db = client || getPrismaClient();
  }

  public withClient(client: TransactionalClient): this {
    const newInstance = new (this.constructor as any)(client);
    return newInstance;
  }

  abstract findById(id: string): Promise<T | null>;
  abstract create(data: C): Promise<T>;
  abstract update(id: string, data: U): Promise<T | null>;
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