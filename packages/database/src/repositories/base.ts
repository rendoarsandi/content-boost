import { Prisma, PrismaClient } from '@prisma/client';

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export class BaseRepository {
  protected readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  protected getClient(
    tx?: TransactionClient
  ): PrismaClient | TransactionClient {
    return tx || this.prisma;
  }

  async transaction<T>(
    callback: (tx: TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    }
  ): Promise<T> {
    return this.prisma.$transaction(callback, options);
  }
}
