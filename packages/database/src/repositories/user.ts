import { Prisma, User } from '@prisma/client';
import { BaseRepository, TransactionClient } from './base';

export class UserRepository extends BaseRepository {
  async findById(id: string, tx?: TransactionClient): Promise<User | null> {
    return this.getClient(tx).user.findUnique({ where: { id } });
  }

  async findByEmail(
    email: string,
    tx?: TransactionClient
  ): Promise<User | null> {
    return this.getClient(tx).user.findUnique({ where: { email } });
  }

  async create(
    data: Prisma.UserCreateInput,
    tx?: TransactionClient
  ): Promise<User> {
    return this.getClient(tx).user.create({ data });
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
    tx?: TransactionClient
  ): Promise<User> {
    return this.getClient(tx).user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tx?: TransactionClient): Promise<User> {
    return this.getClient(tx).user.delete({ where: { id } });
  }
}
