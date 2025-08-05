import { BaseRepository, PaginationOptions, TransactionClient } from './base';
import { Prisma, ViewRecord, TrackingSession } from '@prisma/client';

export class ViewRecordRepository extends BaseRepository {
  async findById(
    id: string,
    tx?: TransactionClient
  ): Promise<ViewRecord | null> {
    return this.getClient(tx).viewRecord.findUnique({ where: { id } });
  }

  async create(
    data: Prisma.ViewRecordCreateInput,
    tx?: TransactionClient
  ): Promise<ViewRecord> {
    return this.getClient(tx).viewRecord.create({ data });
  }

  async update(
    id: string,
    data: Prisma.ViewRecordUpdateInput,
    tx?: TransactionClient
  ): Promise<ViewRecord> {
    return this.getClient(tx).viewRecord.update({ where: { id }, data });
  }

  async delete(id: string, tx?: TransactionClient): Promise<ViewRecord> {
    return this.getClient(tx).viewRecord.delete({ where: { id } });
  }

  async findAll(
    options: PaginationOptions = {},
    tx?: TransactionClient
  ): Promise<ViewRecord[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'timestamp',
      orderDirection = 'desc',
    } = options;
    return this.getClient(tx).viewRecord.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}

export class TrackingSessionRepository extends BaseRepository {
  async findById(
    id: string,
    tx?: TransactionClient
  ): Promise<TrackingSession | null> {
    return this.getClient(tx).trackingSession.findUnique({ where: { id } });
  }

  async create(
    data: Prisma.TrackingSessionCreateInput,
    tx?: TransactionClient
  ): Promise<TrackingSession> {
    return this.getClient(tx).trackingSession.create({ data });
  }

  async update(
    id: string,
    data: Prisma.TrackingSessionUpdateInput,
    tx?: TransactionClient
  ): Promise<TrackingSession> {
    return this.getClient(tx).trackingSession.update({ where: { id }, data });
  }

  async delete(id: string, tx?: TransactionClient): Promise<TrackingSession> {
    return this.getClient(tx).trackingSession.delete({ where: { id } });
  }

  async findAll(
    options: PaginationOptions = {},
    tx?: TransactionClient
  ): Promise<TrackingSession[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'startTime',
      orderDirection = 'desc',
    } = options;
    return this.getClient(tx).trackingSession.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}
