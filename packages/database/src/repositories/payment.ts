import { BaseRepository, PaginationOptions } from './base';
import { Prisma, Payout, PlatformRevenue, Withdrawal } from '@prisma/client';

export class PayoutRepository extends BaseRepository<Payout, Prisma.PayoutCreateInput, Prisma.PayoutUpdateInput> {
  async findById(id: string): Promise<Payout | null> {
    return this.db.payout.findUnique({ where: { id } });
  }

  async create(data: Prisma.PayoutCreateInput): Promise<Payout> {
    return this.db.payout.create({ data });
  }

  async update(id: string, data: Prisma.PayoutUpdateInput): Promise<Payout | null> {
    return this.db.payout.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await this.db.payout.delete({ where: { id } });
    return true;
  }

  async findAll(options: PaginationOptions = {}): Promise<Payout[]> {
    const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = options;
    return this.db.payout.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}

export class PlatformRevenueRepository extends BaseRepository<PlatformRevenue, Prisma.PlatformRevenueCreateInput, Prisma.PlatformRevenueUpdateInput> {
  async findById(id: string): Promise<PlatformRevenue | null> {
    return this.db.platformRevenue.findUnique({ where: { id } });
  }

  async create(data: Prisma.PlatformRevenueCreateInput): Promise<PlatformRevenue> {
    return this.db.platformRevenue.create({ data });
  }

  async update(id: string, data: Prisma.PlatformRevenueUpdateInput): Promise<PlatformRevenue | null> {
    return this.db.platformRevenue.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await this.db.platformRevenue.delete({ where: { id } });
    return true;
  }

  async findAll(options: PaginationOptions = {}): Promise<PlatformRevenue[]> {
    const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = options;
    return this.db.platformRevenue.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}

export class WithdrawalRepository extends BaseRepository<Withdrawal, Prisma.WithdrawalCreateInput, Prisma.WithdrawalUpdateInput> {
  async findById(id: string): Promise<Withdrawal | null> {
    return this.db.withdrawal.findUnique({ where: { id } });
  }

  async create(data: Prisma.WithdrawalCreateInput): Promise<Withdrawal> {
    return this.db.withdrawal.create({ data });
  }

  async update(id: string, data: Prisma.WithdrawalUpdateInput): Promise<Withdrawal | null> {
    return this.db.withdrawal.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await this.db.withdrawal.delete({ where: { id } });
    return true;
  }

  async findAll(options: PaginationOptions = {}): Promise<Withdrawal[]> {
    const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = options;
    return this.db.withdrawal.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}