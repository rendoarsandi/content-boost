import { BaseRepository, PaginationOptions } from './base';
import { Prisma, User, SocialAccount } from '@prisma/client';

export class UserRepository extends BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.db.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User | null> {
    return this.db.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await this.db.user.delete({ where: { id } });
    return true;
  }

  async findAll(options: PaginationOptions = {}): Promise<User[]> {
    const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = options;
    return this.db.user.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}

export class SocialAccountRepository extends BaseRepository<SocialAccount, Prisma.SocialAccountCreateInput, Prisma.SocialAccountUpdateInput> {
  async findById(id: string): Promise<SocialAccount | null> {
    return this.db.socialAccount.findUnique({ where: { id } });
  }

  async create(data: Prisma.SocialAccountCreateInput): Promise<SocialAccount> {
    return this.db.socialAccount.create({ data });
  }

  async update(id: string, data: Prisma.SocialAccountUpdateInput): Promise<SocialAccount | null> {
    return this.db.socialAccount.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await this.db.socialAccount.delete({ where: { id } });
    return true;
  }

  async findAll(options: PaginationOptions = {}): Promise<SocialAccount[]> {
    const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = options;
    return this.db.socialAccount.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}