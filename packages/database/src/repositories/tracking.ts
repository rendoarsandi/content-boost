import { BaseRepository, PaginationOptions } from './base';
import { Prisma, ViewRecord, TrackingSession } from '@prisma/client';

export class ViewRecordRepository extends BaseRepository<ViewRecord, Prisma.ViewRecordCreateInput, Prisma.ViewRecordUpdateInput> {
  async findById(id: string): Promise<ViewRecord | null> {
    return this.db.viewRecord.findUnique({ where: { id } });
  }

  async create(data: Prisma.ViewRecordCreateInput): Promise<ViewRecord> {
    return this.db.viewRecord.create({ data });
  }

  async update(id: string, data: Prisma.ViewRecordUpdateInput): Promise<ViewRecord | null> {
    return this.db.viewRecord.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await this.db.viewRecord.delete({ where: { id } });
    return true;
  }

  async findAll(options: PaginationOptions = {}): Promise<ViewRecord[]> {
    const { limit = 50, offset = 0, orderBy = 'timestamp', orderDirection = 'desc' } = options;
    return this.db.viewRecord.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}

export class TrackingSessionRepository extends BaseRepository<TrackingSession, Prisma.TrackingSessionCreateInput, Prisma.TrackingSessionUpdateInput> {
  async findById(id: string): Promise<TrackingSession | null> {
    return this.db.trackingSession.findUnique({ where: { id } });
  }

  async create(data: Prisma.TrackingSessionCreateInput): Promise<TrackingSession> {
    return this.db.trackingSession.create({ data });
  }

  async update(id: string, data: Prisma.TrackingSessionUpdateInput): Promise<TrackingSession | null> {
    return this.db.trackingSession.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await this.db.trackingSession.delete({ where: { id } });
    return true;
  }

  async findAll(options: PaginationOptions = {}): Promise<TrackingSession[]> {
    const { limit = 50, offset = 0, orderBy = 'startTime', orderDirection = 'desc' } = options;
    return this.db.trackingSession.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}