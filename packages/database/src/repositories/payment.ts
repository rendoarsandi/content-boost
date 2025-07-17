import { PoolClient } from 'pg';
import { BaseRepository, PaginationOptions } from './base';
import { Payout, PlatformRevenue, Withdrawal } from '../schemas/payment';

export class PayoutRepository extends BaseRepository<Payout> {
  async findById(id: string): Promise<Payout | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM payouts WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToPayout(result.rows[0]);
    });
  }

  async findByPromoterId(promoterId: string, options: PaginationOptions = {}): Promise<Payout[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM payouts 
         WHERE promoter_id = $1 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $2 OFFSET $3`,
        [promoterId, limit, offset]
      );

      return result.rows.map(row => this.mapRowToPayout(row));
    });
  }

  async findByCampaignId(campaignId: string, options: PaginationOptions = {}): Promise<Payout[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM payouts 
         WHERE campaign_id = $1 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $2 OFFSET $3`,
        [campaignId, limit, offset]
      );

      return result.rows.map(row => this.mapRowToPayout(row));
    });
  }

  async findByStatus(status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled', options: PaginationOptions = {}): Promise<Payout[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM payouts 
         WHERE status = $1 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );

      return result.rows.map(row => this.mapRowToPayout(row));
    });
  }

  async findByPeriod(startDate: Date, endDate: Date, options: PaginationOptions = {}): Promise<Payout[]> {
    const { limit = 100, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM payouts 
         WHERE period_start >= $1 AND period_end <= $2 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $3 OFFSET $4`,
        [startDate, endDate, limit, offset]
      );

      return result.rows.map(row => this.mapRowToPayout(row));
    });
  }

  async create(data: Partial<Payout>): Promise<Payout> {
    return this.withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO payouts (
          promoter_id, campaign_id, application_id, period_start, period_end,
          total_views, legitimate_views, bot_views, rate_per_view,
          gross_amount, platform_fee, net_amount, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
        RETURNING *`,
        [
          data.promoterId,
          data.campaignId,
          data.applicationId,
          data.periodStart,
          data.periodEnd,
          data.totalViews || 0,
          data.legitimateViews || 0,
          data.botViews || 0,
          data.ratePerView,
          data.grossAmount,
          data.platformFee,
          data.netAmount,
          data.status || 'pending',
        ]
      );

      return this.mapRowToPayout(result.rows[0]);
    });
  }

  async update(id: string, data: Partial<Payout>): Promise<Payout | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
      if (data.status === 'completed' || data.status === 'failed') {
        updates.push(`processed_at = NOW()`);
      }
    }
    if (data.failureReason !== undefined) {
      updates.push(`failure_reason = $${paramIndex++}`);
      values.push(data.failureReason);
    }
    if (data.totalViews !== undefined) {
      updates.push(`total_views = $${paramIndex++}`);
      values.push(data.totalViews);
    }
    if (data.legitimateViews !== undefined) {
      updates.push(`legitimate_views = $${paramIndex++}`);
      values.push(data.legitimateViews);
    }
    if (data.botViews !== undefined) {
      updates.push(`bot_views = $${paramIndex++}`);
      values.push(data.botViews);
    }
    if (data.grossAmount !== undefined) {
      updates.push(`gross_amount = $${paramIndex++}`);
      values.push(data.grossAmount);
    }
    if (data.platformFee !== undefined) {
      updates.push(`platform_fee = $${paramIndex++}`);
      values.push(data.platformFee);
    }
    if (data.netAmount !== undefined) {
      updates.push(`net_amount = $${paramIndex++}`);
      values.push(data.netAmount);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    return this.withClient(async (client) => {
      const result = await client.query(
        `UPDATE payouts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToPayout(result.rows[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'DELETE FROM payouts WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    });
  }

  async findAll(options: PaginationOptions = {}): Promise<Payout[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM payouts 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => this.mapRowToPayout(row));
    });
  }

  async getTotalPayoutsByPromoter(promoterId: string, startDate?: Date, endDate?: Date): Promise<{
    totalGross: number;
    totalNet: number;
    totalFees: number;
    count: number;
  }> {
    let query = `
      SELECT 
        SUM(gross_amount) as total_gross,
        SUM(net_amount) as total_net,
        SUM(platform_fee) as total_fees,
        COUNT(*) as count
      FROM payouts 
      WHERE promoter_id = $1 AND status = 'completed'
    `;
    const params: any[] = [promoterId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND period_start >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND period_end <= $${paramIndex++}`;
      params.push(endDate);
    }

    return this.withClient(async (client) => {
      const result = await client.query(query, params);
      const row = result.rows[0];
      
      return {
        totalGross: parseFloat(row.total_gross) || 0,
        totalNet: parseFloat(row.total_net) || 0,
        totalFees: parseFloat(row.total_fees) || 0,
        count: parseInt(row.count) || 0,
      };
    });
  }

  private mapRowToPayout(row: any): Payout {
    return {
      id: row.id,
      promoterId: row.promoter_id,
      campaignId: row.campaign_id,
      applicationId: row.application_id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      totalViews: row.total_views,
      legitimateViews: row.legitimate_views,
      botViews: row.bot_views,
      ratePerView: parseFloat(row.rate_per_view),
      grossAmount: parseFloat(row.gross_amount),
      platformFee: parseFloat(row.platform_fee),
      netAmount: parseFloat(row.net_amount),
      status: row.status,
      processedAt: row.processed_at,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class PlatformRevenueRepository extends BaseRepository<PlatformRevenue> {
  async findById(id: string): Promise<PlatformRevenue | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM platform_revenue WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToPlatformRevenue(result.rows[0]);
    });
  }

  async findByPeriod(startDate: Date, endDate: Date): Promise<PlatformRevenue | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM platform_revenue WHERE period_start = $1 AND period_end = $2',
        [startDate, endDate]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToPlatformRevenue(result.rows[0]);
    });
  }

  async create(data: Partial<PlatformRevenue>): Promise<PlatformRevenue> {
    return this.withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO platform_revenue (period_start, period_end, total_fees, withdrawn_amount, available_balance) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [
          data.periodStart,
          data.periodEnd,
          data.totalFees || 0,
          data.withdrawnAmount || 0,
          data.availableBalance || 0,
        ]
      );

      return this.mapRowToPlatformRevenue(result.rows[0]);
    });
  }

  async update(id: string, data: Partial<PlatformRevenue>): Promise<PlatformRevenue | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.totalFees !== undefined) {
      updates.push(`total_fees = $${paramIndex++}`);
      values.push(data.totalFees);
    }
    if (data.withdrawnAmount !== undefined) {
      updates.push(`withdrawn_amount = $${paramIndex++}`);
      values.push(data.withdrawnAmount);
    }
    if (data.availableBalance !== undefined) {
      updates.push(`available_balance = $${paramIndex++}`);
      values.push(data.availableBalance);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    return this.withClient(async (client) => {
      const result = await client.query(
        `UPDATE platform_revenue SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToPlatformRevenue(result.rows[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'DELETE FROM platform_revenue WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    });
  }

  async findAll(options: PaginationOptions = {}): Promise<PlatformRevenue[]> {
    const { limit = 50, offset = 0, orderBy = 'period_start', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM platform_revenue 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => this.mapRowToPlatformRevenue(row));
    });
  }

  async getTotalAvailableBalance(): Promise<number> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT SUM(available_balance) as total FROM platform_revenue'
      );

      return parseFloat(result.rows[0].total) || 0;
    });
  }

  private mapRowToPlatformRevenue(row: any): PlatformRevenue {
    return {
      id: row.id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      totalFees: parseFloat(row.total_fees),
      withdrawnAmount: parseFloat(row.withdrawn_amount),
      availableBalance: parseFloat(row.available_balance),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class WithdrawalRepository extends BaseRepository<Withdrawal> {
  async findById(id: string): Promise<Withdrawal | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM withdrawals WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToWithdrawal(result.rows[0]);
    });
  }

  async findByRevenueId(revenueId: string): Promise<Withdrawal[]> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM withdrawals WHERE revenue_id = $1 ORDER BY created_at DESC',
        [revenueId]
      );

      return result.rows.map(row => this.mapRowToWithdrawal(row));
    });
  }

  async create(data: Partial<Withdrawal>): Promise<Withdrawal> {
    return this.withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO withdrawals (revenue_id, amount, status) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [data.revenueId, data.amount, data.status || 'pending']
      );

      return this.mapRowToWithdrawal(result.rows[0]);
    });
  }

  async update(id: string, data: Partial<Withdrawal>): Promise<Withdrawal | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
      if (data.status === 'completed' || data.status === 'failed') {
        updates.push(`processed_at = NOW()`);
      }
    }
    if (data.failureReason !== undefined) {
      updates.push(`failure_reason = $${paramIndex++}`);
      values.push(data.failureReason);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    return this.withClient(async (client) => {
      const result = await client.query(
        `UPDATE withdrawals SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToWithdrawal(result.rows[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'DELETE FROM withdrawals WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    });
  }

  async findAll(options: PaginationOptions = {}): Promise<Withdrawal[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM withdrawals 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => this.mapRowToWithdrawal(row));
    });
  }

  private mapRowToWithdrawal(row: any): Withdrawal {
    return {
      id: row.id,
      revenueId: row.revenue_id,
      amount: parseFloat(row.amount),
      status: row.status,
      processedAt: row.processed_at,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
    };
  }
}