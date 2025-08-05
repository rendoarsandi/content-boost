import { BaseRepository, PaginationOptions, TransactionClient } from './base';
import {
  Prisma,
  Campaign,
  CampaignMaterial,
  CampaignApplication,
} from '@prisma/client';

export class CampaignRepository extends BaseRepository {
  async findById(id: string, tx?: TransactionClient): Promise<Campaign | null> {
    return this.getClient(tx).campaign.findUnique({ where: { id } });
  }

  async findByCreatorId(
    creatorId: string,
    options: PaginationOptions = {},
    tx?: TransactionClient
  ): Promise<Campaign[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'desc',
    } = options;
    return this.getClient(tx).campaign.findMany({
      where: { creatorId },
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }

  async findByStatus(
    status: Campaign['status'],
    options: PaginationOptions = {},
    tx?: TransactionClient
  ): Promise<Campaign[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'desc',
    } = options;
    return this.getClient(tx).campaign.findMany({
      where: { status },
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }

  async create(
    data: Prisma.CampaignCreateInput,
    tx?: TransactionClient
  ): Promise<Campaign> {
    return this.getClient(tx).campaign.create({ data });
  }

  async update(
    id: string,
    data: Prisma.CampaignUpdateInput,
    tx?: TransactionClient
  ): Promise<Campaign> {
    return this.getClient(tx).campaign.update({ where: { id }, data });
  }

  async delete(id: string, tx?: TransactionClient): Promise<Campaign> {
    return this.getClient(tx).campaign.delete({ where: { id } });
  }

  async findAll(
    options: PaginationOptions = {},
    tx?: TransactionClient
  ): Promise<Campaign[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'desc',
    } = options;
    return this.getClient(tx).campaign.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }

  async findActiveCampaigns(tx?: TransactionClient): Promise<Campaign[]> {
    return this.getClient(tx).campaign.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export class CampaignMaterialRepository extends BaseRepository {
  async findById(
    id: string,
    tx?: TransactionClient
  ): Promise<CampaignMaterial | null> {
    return this.getClient(tx).campaignMaterial.findUnique({ where: { id } });
  }

  async create(
    data: Prisma.CampaignMaterialCreateInput,
    tx?: TransactionClient
  ): Promise<CampaignMaterial> {
    return this.getClient(tx).campaignMaterial.create({ data });
  }

  async update(
    id: string,
    data: Prisma.CampaignMaterialUpdateInput,
    tx?: TransactionClient
  ): Promise<CampaignMaterial> {
    return this.getClient(tx).campaignMaterial.update({ where: { id }, data });
  }

  async delete(id: string, tx?: TransactionClient): Promise<CampaignMaterial> {
    return this.getClient(tx).campaignMaterial.delete({ where: { id } });
  }

  async findAll(
    options: PaginationOptions = {},
    tx?: TransactionClient
  ): Promise<CampaignMaterial[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'desc',
    } = options;
    return this.getClient(tx).campaignMaterial.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}

export class CampaignApplicationRepository extends BaseRepository {
  async findById(
    id: string,
    tx?: TransactionClient
  ): Promise<CampaignApplication | null> {
    return this.getClient(tx).campaignApplication.findUnique({ where: { id } });
  }

  async create(
    data: Prisma.CampaignApplicationCreateInput,
    tx?: TransactionClient
  ): Promise<CampaignApplication> {
    return this.getClient(tx).campaignApplication.create({ data });
  }

  async update(
    id: string,
    data: Prisma.CampaignApplicationUpdateInput,
    tx?: TransactionClient
  ): Promise<CampaignApplication> {
    return this.getClient(tx).campaignApplication.update({
      where: { id },
      data,
    });
  }

  async delete(
    id: string,
    tx?: TransactionClient
  ): Promise<CampaignApplication> {
    return this.getClient(tx).campaignApplication.delete({ where: { id } });
  }

  async findAll(
    options: PaginationOptions = {},
    tx?: TransactionClient
  ): Promise<CampaignApplication[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'appliedAt',
      orderDirection = 'desc',
    } = options;
    return this.getClient(tx).campaignApplication.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }
}
