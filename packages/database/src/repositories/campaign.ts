import { BaseRepository, PaginationOptions } from './base';
import { Prisma, Campaign, CampaignMaterial, CampaignApplication } from '@prisma/client';

export class CampaignRepository extends BaseRepository<Campaign, Prisma.CampaignCreateInput, Prisma.CampaignUpdateInput> {
  async findById(id: string): Promise<Campaign | null> {
    return this.db.campaign.findUnique({ where: { id } });
  }

  async findByCreatorId(creatorId: string, options: PaginationOptions = {}): Promise<Campaign[]> {
    const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = options;
    return this.db.campaign.findMany({
      where: { creatorId },
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }

  async findByStatus(status: Campaign['status'], options: PaginationOptions = {}): Promise<Campaign[]> {
    const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = options;
    return this.db.campaign.findMany({
      where: { status },
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }

  async create(data: Prisma.CampaignCreateInput): Promise<Campaign> {
    return this.db.campaign.create({ data });
  }

  async update(id: string, data: Prisma.CampaignUpdateInput): Promise<Campaign | null> {
    return this.db.campaign.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await this.db.campaign.delete({ where: { id } });
    return true;
  }

  async findAll(options: PaginationOptions = {}): Promise<Campaign[]> {
    const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = options;
    return this.db.campaign.findMany({
      take: limit,
      skip: offset,
      orderBy: { [orderBy]: orderDirection },
    });
  }

  async findActiveCampaigns(): Promise<Campaign[]> {
    return this.db.campaign.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export class CampaignMaterialRepository extends BaseRepository<CampaignMaterial, Prisma.CampaignMaterialCreateInput, Prisma.CampaignMaterialUpdateInput> {
    async findById(id: string): Promise<CampaignMaterial | null> {
        return this.db.campaignMaterial.findUnique({ where: { id } });
    }

    async create(data: Prisma.CampaignMaterialCreateInput): Promise<CampaignMaterial> {
        return this.db.campaignMaterial.create({ data });
    }

    async update(id: string, data: Prisma.CampaignMaterialUpdateInput): Promise<CampaignMaterial | null> {
        return this.db.campaignMaterial.update({ where: { id }, data });
    }

    async delete(id: string): Promise<boolean> {
        await this.db.campaignMaterial.delete({ where: { id } });
        return true;
    }

    async findAll(options: PaginationOptions = {}): Promise<CampaignMaterial[]> {
        const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = options;
        return this.db.campaignMaterial.findMany({
            take: limit,
            skip: offset,
            orderBy: { [orderBy]: orderDirection },
        });
    }
}

export class CampaignApplicationRepository extends BaseRepository<CampaignApplication, Prisma.CampaignApplicationCreateInput, Prisma.CampaignApplicationUpdateInput> {
    async findById(id: string): Promise<CampaignApplication | null> {
        return this.db.campaignApplication.findUnique({ where: { id } });
    }

    async create(data: Prisma.CampaignApplicationCreateInput): Promise<CampaignApplication> {
        return this.db.campaignApplication.create({ data });
    }

    async update(id: string, data: Prisma.CampaignApplicationUpdateInput): Promise<CampaignApplication | null> {
        return this.db.campaignApplication.update({ where: { id }, data });
    }

    async delete(id: string): Promise<boolean> {
        await this.db.campaignApplication.delete({ where: { id } });
        return true;
    }

    async findAll(options: PaginationOptions = {}): Promise<CampaignApplication[]> {
        const { limit = 50, offset = 0, orderBy = 'appliedAt', orderDirection = 'desc' } = options;
        return this.db.campaignApplication.findMany({
            take: limit,
            skip: offset,
            orderBy: { [orderBy]: orderDirection },
        });
    }
}