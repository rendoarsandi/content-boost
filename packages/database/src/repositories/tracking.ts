import { BaseRepository, PaginationOptions } from './base';
import { ViewRecord, TrackingSession } from '../schemas/tracking';

export class ViewRecordRepository extends BaseRepository<ViewRecord> {
  async findById(id: string): Promise<ViewRecord | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM view_records WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToViewRecord(result.rows[0]);
    });
  }

  async findByCampaignAndPromoter(
    campaignId: string, 
    promoterId: string, 
    options: PaginationOptions & { startDate?: Date; endDate?: Date } = {}
  ): Promise<ViewRecord[]> {
    const { limit = 100, offset = 0, orderBy = 'timestamp', orderDirection = 'DESC', startDate, endDate } = options;
    
    let query = `
      SELECT * FROM view_records 
      WHERE campaign_id = $1 AND promoter_id = $2
    `;
    const params: any[] = [campaignId, promoterId];
    let paramIndex = 3;

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY ${orderBy} ${orderDirection} LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    return this.withClient(async (client) => {
      const result = await client.query(query, params);
      return result.rows.map(row => this.mapRowToViewRecord(row));
    });
  }

  async findByPlatformPost(platform: 'tiktok' | 'instagram', platformPostId: string): Promise<ViewRecord[]> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM view_records WHERE platform = $1 AND platform_post_id = $2 ORDER BY timestamp DESC',
        [platform, platformPostId]
      );

      return result.rows.map(row => this.mapRowToViewRecord(row));
    });
  }

  async create(data: Partial<ViewRecord>): Promise<ViewRecord> {
    return this.withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO view_records (
          campaign_id, promoter_id, application_id, platform, platform_post_id, 
          view_count, like_count, comment_count, share_count, bot_score, is_legitimate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`,
        [
          data.campaignId,
          data.promoterId,
          data.applicationId,
          data.platform,
          data.platformPostId,
          data.viewCount || 0,
          data.likeCount || 0,
          data.commentCount || 0,
          data.shareCount || 0,
          data.botScore || 0,
          data.isLegitimate !== undefined ? data.isLegitimate : true,
        ]
      );

      return this.mapRowToViewRecord(result.rows[0]);
    });
  }

  async update(id: string, data: Partial<ViewRecord>): Promise<ViewRecord | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.viewCount !== undefined) {
      updates.push(`view_count = $${paramIndex++}`);
      values.push(data.viewCount);
    }
    if (data.likeCount !== undefined) {
      updates.push(`like_count = $${paramIndex++}`);
      values.push(data.likeCount);
    }
    if (data.commentCount !== undefined) {
      updates.push(`comment_count = $${paramIndex++}`);
      values.push(data.commentCount);
    }
    if (data.shareCount !== undefined) {
      updates.push(`share_count = $${paramIndex++}`);
      values.push(data.shareCount);
    }
    if (data.botScore !== undefined) {
      updates.push(`bot_score = $${paramIndex++}`);
      values.push(data.botScore);
    }
    if (data.isLegitimate !== undefined) {
      updates.push(`is_legitimate = $${paramIndex++}`);
      values.push(data.isLegitimate);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    return this.withClient(async (client) => {
      const result = await client.query(
        `UPDATE view_records SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToViewRecord(result.rows[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'DELETE FROM view_records WHERE id = $1',
        [id]
      );

      return (result.rowCount ?? 0) > 0;
    });
  }

  async findAll(options: PaginationOptions = {}): Promise<ViewRecord[]> {
    const { limit = 100, offset = 0, orderBy = 'timestamp', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM view_records 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => this.mapRowToViewRecord(row));
    });
  }

  async getViewSummary(
    campaignId: string, 
    promoterId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<{
    totalViews: number;
    legitimateViews: number;
    botViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgBotScore: number;
  }> {
    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT 
          SUM(view_count) as total_views,
          SUM(CASE WHEN is_legitimate = true THEN view_count ELSE 0 END) as legitimate_views,
          SUM(CASE WHEN is_legitimate = false THEN view_count ELSE 0 END) as bot_views,
          SUM(like_count) as total_likes,
          SUM(comment_count) as total_comments,
          SUM(share_count) as total_shares,
          AVG(bot_score) as avg_bot_score
         FROM view_records 
         WHERE campaign_id = $1 AND promoter_id = $2 
         AND timestamp >= $3 AND timestamp <= $4`,
        [campaignId, promoterId, startDate, endDate]
      );

      const row = result.rows[0];
      return {
        totalViews: parseInt(row.total_views) || 0,
        legitimateViews: parseInt(row.legitimate_views) || 0,
        botViews: parseInt(row.bot_views) || 0,
        totalLikes: parseInt(row.total_likes) || 0,
        totalComments: parseInt(row.total_comments) || 0,
        totalShares: parseInt(row.total_shares) || 0,
        avgBotScore: parseFloat(row.avg_bot_score) || 0,
      };
    });
  }

  private mapRowToViewRecord(row: any): ViewRecord {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      promoterId: row.promoter_id,
      applicationId: row.application_id,
      platform: row.platform,
      platformPostId: row.platform_post_id,
      viewCount: row.view_count,
      likeCount: row.like_count,
      commentCount: row.comment_count,
      shareCount: row.share_count,
      botScore: row.bot_score,
      isLegitimate: row.is_legitimate,
      timestamp: row.timestamp,
    };
  }
}

export class TrackingSessionRepository extends BaseRepository<TrackingSession> {
  async findById(id: string): Promise<TrackingSession | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM tracking_sessions WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTrackingSession(result.rows[0]);
    });
  }

  async findByPromoterAndCampaign(promoterId: string, campaignId: string): Promise<TrackingSession[]> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM tracking_sessions WHERE promoter_id = $1 AND campaign_id = $2 ORDER BY created_at DESC',
        [promoterId, campaignId]
      );

      return result.rows.map(row => this.mapRowToTrackingSession(row));
    });
  }

  async findByPlatformPost(platform: 'tiktok' | 'instagram', platformPostId: string): Promise<TrackingSession | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM tracking_sessions WHERE platform = $1 AND platform_post_id = $2 AND is_active = true',
        [platform, platformPostId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTrackingSession(result.rows[0]);
    });
  }

  async findActiveSessions(): Promise<TrackingSession[]> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM tracking_sessions WHERE is_active = true ORDER BY last_checked ASC'
      );

      return result.rows.map(row => this.mapRowToTrackingSession(row));
    });
  }

  async create(data: Partial<TrackingSession>): Promise<TrackingSession> {
    return this.withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO tracking_sessions (
          promoter_id, campaign_id, application_id, platform, platform_post_id, 
          total_views, legitimate_views, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [
          data.promoterId,
          data.campaignId,
          data.applicationId,
          data.platform,
          data.platformPostId,
          data.totalViews || 0,
          data.legitimateViews || 0,
          data.isActive !== undefined ? data.isActive : true,
        ]
      );

      return this.mapRowToTrackingSession(result.rows[0]);
    });
  }

  async update(id: string, data: Partial<TrackingSession>): Promise<TrackingSession | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.totalViews !== undefined) {
      updates.push(`total_views = $${paramIndex++}`);
      values.push(data.totalViews);
    }
    if (data.legitimateViews !== undefined) {
      updates.push(`legitimate_views = $${paramIndex++}`);
      values.push(data.legitimateViews);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }

    // Always update last_checked and updated_at
    updates.push(`last_checked = NOW()`);
    updates.push(`updated_at = NOW()`);

    if (updates.length === 2) { // Only the timestamp updates
      return this.findById(id);
    }

    values.push(id);

    return this.withClient(async (client) => {
      const result = await client.query(
        `UPDATE tracking_sessions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTrackingSession(result.rows[0]);
    });
  }

  async updateLastChecked(id: string): Promise<TrackingSession | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'UPDATE tracking_sessions SET last_checked = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTrackingSession(result.rows[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'DELETE FROM tracking_sessions WHERE id = $1',
        [id]
      );

      return (result.rowCount ?? 0) > 0;
    });
  }

  async deactivateSession(id: string): Promise<TrackingSession | null> {
    return this.update(id, { isActive: false });
  }

  async findAll(options: PaginationOptions = {}): Promise<TrackingSession[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM tracking_sessions 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => this.mapRowToTrackingSession(row));
    });
  }

  private mapRowToTrackingSession(row: any): TrackingSession {
    return {
      id: row.id,
      promoterId: row.promoter_id,
      campaignId: row.campaign_id,
      applicationId: row.application_id,
      platform: row.platform,
      platformPostId: row.platform_post_id,
      startTime: row.start_time,
      lastChecked: row.last_checked,
      totalViews: row.total_views,
      legitimateViews: row.legitimate_views,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}