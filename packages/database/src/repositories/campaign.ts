import { PoolClient } from 'pg';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { Campaign, CampaignMaterial, CampaignApplication } from '../schemas/campaign';

export class CampaignRepository extends BaseRepository<Campaign> {
  async findById(id: string): Promise<Campaign | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM campaigns WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCampaign(result.rows[0]);
    });
  }

  async findByCreatorId(creatorId: string, options: PaginationOptions = {}): Promise<Campaign[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM campaigns 
         WHERE creator_id = $1 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $2 OFFSET $3`,
        [creatorId, limit, offset]
      );

      return result.rows.map(row => this.mapRowToCampaign(row));
    });
  }

  async findByStatus(status: 'draft' | 'active' | 'paused' | 'completed', options: PaginationOptions = {}): Promise<Campaign[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM campaigns 
         WHERE status = $1 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );

      return result.rows.map(row => this.mapRowToCampaign(row));
    });
  }

  async create(data: Partial<Campaign>): Promise<Campaign> {
    return this.withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO campaigns (creator_id, title, description, budget, rate_per_view, status, requirements, start_date, end_date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
        [
          data.creatorId,
          data.title,
          data.description,
          data.budget,
          data.ratePerView,
          data.status || 'draft',
          JSON.stringify(data.requirements || []),
          data.startDate,
          data.endDate,
        ]
      );

      return this.mapRowToCampaign(result.rows[0]);
    });
  }

  async update(id: string, data: Partial<Campaign>): Promise<Campaign | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.budget !== undefined) {
      updates.push(`budget = $${paramIndex++}`);
      values.push(data.budget);
    }
    if (data.ratePerView !== undefined) {
      updates.push(`rate_per_view = $${paramIndex++}`);
      values.push(data.ratePerView);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.requirements !== undefined) {
      updates.push(`requirements = $${paramIndex++}`);
      values.push(JSON.stringify(data.requirements));
    }
    if (data.startDate !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(data.endDate);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    return this.withClient(async (client) => {
      const result = await client.query(
        `UPDATE campaigns SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCampaign(result.rows[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'DELETE FROM campaigns WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    });
  }

  async findAll(options: PaginationOptions = {}): Promise<Campaign[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM campaigns 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => this.mapRowToCampaign(row));
    });
  }

  async findActiveCampaigns(): Promise<Campaign[]> {
    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM campaigns 
         WHERE status = 'active' 
         AND (start_date IS NULL OR start_date <= NOW()) 
         AND (end_date IS NULL OR end_date >= NOW())
         ORDER BY created_at DESC`
      );

      return result.rows.map(row => this.mapRowToCampaign(row));
    });
  }

  private mapRowToCampaign(row: any): Campaign {
    return {
      id: row.id,
      creatorId: row.creator_id,
      title: row.title,
      description: row.description,
      budget: parseFloat(row.budget),
      ratePerView: parseFloat(row.rate_per_view),
      status: row.status,
      requirements: row.requirements ? JSON.parse(row.requirements) : [],
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class CampaignMaterialRepository extends BaseRepository<CampaignMaterial> {
  async findById(id: string): Promise<CampaignMaterial | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM campaign_materials WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCampaignMaterial(result.rows[0]);
    });
  }

  async findByCampaignId(campaignId: string): Promise<CampaignMaterial[]> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM campaign_materials WHERE campaign_id = $1 ORDER BY created_at ASC',
        [campaignId]
      );

      return result.rows.map(row => this.mapRowToCampaignMaterial(row));
    });
  }

  async create(data: Partial<CampaignMaterial>): Promise<CampaignMaterial> {
    return this.withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO campaign_materials (campaign_id, type, url, title, description) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [data.campaignId, data.type, data.url, data.title, data.description]
      );

      return this.mapRowToCampaignMaterial(result.rows[0]);
    });
  }

  async update(id: string, data: Partial<CampaignMaterial>): Promise<CampaignMaterial | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.url !== undefined) {
      updates.push(`url = $${paramIndex++}`);
      values.push(data.url);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    return this.withClient(async (client) => {
      const result = await client.query(
        `UPDATE campaign_materials SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCampaignMaterial(result.rows[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'DELETE FROM campaign_materials WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    });
  }

  async findAll(options: PaginationOptions = {}): Promise<CampaignMaterial[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'ASC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM campaign_materials 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => this.mapRowToCampaignMaterial(row));
    });
  }

  private mapRowToCampaignMaterial(row: any): CampaignMaterial {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      type: row.type,
      url: row.url,
      title: row.title,
      description: row.description,
      createdAt: row.created_at,
    };
  }
}

export class CampaignApplicationRepository extends BaseRepository<CampaignApplication> {
  async findById(id: string): Promise<CampaignApplication | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM campaign_applications WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCampaignApplication(result.rows[0]);
    });
  }

  async findByCampaignId(campaignId: string, options: PaginationOptions = {}): Promise<CampaignApplication[]> {
    const { limit = 50, offset = 0, orderBy = 'applied_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM campaign_applications 
         WHERE campaign_id = $1 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $2 OFFSET $3`,
        [campaignId, limit, offset]
      );

      return result.rows.map(row => this.mapRowToCampaignApplication(row));
    });
  }

  async findByPromoterId(promoterId: string, options: PaginationOptions = {}): Promise<CampaignApplication[]> {
    const { limit = 50, offset = 0, orderBy = 'applied_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM campaign_applications 
         WHERE promoter_id = $1 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $2 OFFSET $3`,
        [promoterId, limit, offset]
      );

      return result.rows.map(row => this.mapRowToCampaignApplication(row));
    });
  }

  async findByStatus(status: 'pending' | 'approved' | 'rejected', options: PaginationOptions = {}): Promise<CampaignApplication[]> {
    const { limit = 50, offset = 0, orderBy = 'applied_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM campaign_applications 
         WHERE status = $1 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );

      return result.rows.map(row => this.mapRowToCampaignApplication(row));
    });
  }

  async create(data: Partial<CampaignApplication>): Promise<CampaignApplication> {
    return this.withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO campaign_applications (campaign_id, promoter_id, submitted_content, tracking_link) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [data.campaignId, data.promoterId, data.submittedContent, data.trackingLink]
      );

      return this.mapRowToCampaignApplication(result.rows[0]);
    });
  }

  async update(id: string, data: Partial<CampaignApplication>): Promise<CampaignApplication | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
      if (data.status !== 'pending') {
        updates.push(`reviewed_at = NOW()`);
      }
    }
    if (data.submittedContent !== undefined) {
      updates.push(`submitted_content = $${paramIndex++}`);
      values.push(data.submittedContent);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    return this.withClient(async (client) => {
      const result = await client.query(
        `UPDATE campaign_applications SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCampaignApplication(result.rows[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'DELETE FROM campaign_applications WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    });
  }

  async findAll(options: PaginationOptions = {}): Promise<CampaignApplication[]> {
    const { limit = 50, offset = 0, orderBy = 'applied_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM campaign_applications 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => this.mapRowToCampaignApplication(row));
    });
  }

  private mapRowToCampaignApplication(row: any): CampaignApplication {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      promoterId: row.promoter_id,
      status: row.status,
      submittedContent: row.submitted_content,
      trackingLink: row.tracking_link,
      appliedAt: row.applied_at,
      reviewedAt: row.reviewed_at,
    };
  }
}