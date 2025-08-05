import { BaseRepository, PaginationOptions, TransactionClient } from './base';
import { Prisma, Payout, PlatformRevenue, Withdrawal } from '@prisma/client';

export class PayoutRepository extends BaseRepository {
  async findById(id: string, tx?: TransactionClient): Promise<Payout | null> {
    return this.getClient(tx).payout.findUnique({ where: { id } });
  }

  async create(
    data: Prisma.PayoutCreateInput,
    tx?: TransactionClient
  ): Promise<Payout> {
    return this.getClient(tx).payout.create({ data });
  }

  async update(
    id: string,
    data: Prisma.PayoutUpdateInput,
    tx?: TransactionClient
  ): Promise<Payout> {
    return this.getClient(tx).payout.update({ where: { id }, data });
  }

  async delete(id: string, tx?: TransactionClient): Promise<Payout> {
    return this.getClient(tx).payout.delete({ where: { id } });
  }

  async findAll(
    options: PaginationOptions = {},
    tx?: TransactionClient
  ): Promise<Payout[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'desc',
    } = options;
    return this.getClient(tx).payout.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}

export class PlatformRevenueRepository extends BaseRepository {
  async findById(
    id: string,
    tx?: TransactionClient
  ): Promise<PlatformRevenue | null> {
    return this.getClient(tx).platformRevenue.findUnique({ where: { id } });
  }

  async create(
    data: Prisma.PlatformRevenueCreateInput,
    tx?: TransactionClient
  ): Promise<PlatformRevenue> {
    return this.getClient(tx).platformRevenue.create({ data });
  }

  async update(
    id: string,
    data: Prisma.PlatformRevenueUpdateInput,
    tx?: TransactionClient
  ): Promise<PlatformRevenue> {
    return this.getClient(tx).platformRevenue.update({ where: { id }, data });
  }

  async delete(id: string, tx?: TransactionClient): Promise<PlatformRevenue> {
    return this.getClient(tx).platformRevenue.delete({ where: { id } });
  }

  async findAll(
    options: PaginationOptions = {},
    tx?: TransactionClient
  ): Promise<PlatformRevenue[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'desc',
    } = options;
    return this.getClient(tx).platformRevenue.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}

export class WithdrawalRepository extends BaseRepository {
  async findById(
    id: string,
    tx?: TransactionClient
  ): Promise<Withdrawal | null> {
    return this.getClient(tx).withdrawal.findUnique({ where: { id } });
  }

  async create(
    data: Prisma.WithdrawalCreateInput,
    tx?: TransactionClient
  ): Promise<Withdrawal> {
    return this.getClient(tx).withdrawal.create({ data });
  }

  async update(
    id: string,
    data: Prisma.WithdrawalUpdateInput,
    tx?: TransactionClient
  ): Promise<Withdrawal> {
    return this.getClient(tx).withdrawal.update({ where: { id }, data });
  }

  async delete(id: string, tx?: TransactionClient): Promise<Withdrawal> {
    return this.getClient(tx).withdrawal.delete({ where: { id } });
  }

  async findAll(
    options: PaginationOptions = {},
    tx?: TransactionClient
  ): Promise<Withdrawal[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'desc',
    } = options;
    return this.getClient(tx).withdrawal.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}
