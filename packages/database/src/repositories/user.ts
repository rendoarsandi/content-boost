import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { User, SocialAccount, UserSchema, SocialAccountSchema } from '../schemas/user';

export class UserRepository extends BaseRepository<User> {
  async findById(id: string): Promise<User | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    });
  }

  async create(data: Partial<User>): Promise<User> {
    const validatedData = UserSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(data);
    
    return this.withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO users (email, name, role) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [validatedData.email, validatedData.name, validatedData.role]
      );

      return this.mapRowToUser(result.rows[0]);
    });
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    return this.withClient(async (client) => {
      const result = await client.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'DELETE FROM users WHERE id = $1',
        [id]
      );

      return (result.rowCount ?? 0) > 0;
    });
  }

  async findAll(options: PaginationOptions = {}): Promise<User[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM users 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => this.mapRowToUser(row));
    });
  }

  async findPaginated(options: PaginationOptions = {}): Promise<PaginatedResult<User>> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      // Get total count
      const countResult = await client.query('SELECT COUNT(*) FROM users');
      const total = parseInt(countResult.rows[0].count);

      // Get data
      const dataResult = await client.query(
        `SELECT * FROM users 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const data = dataResult.rows.map(row => this.mapRowToUser(row));

      return {
        data,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    });
  }

  async findByRole(role: 'creator' | 'promoter' | 'admin', options: PaginationOptions = {}): Promise<User[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM users 
         WHERE role = $1 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $2 OFFSET $3`,
        [role, limit, offset]
      );

      return result.rows.map(row => this.mapRowToUser(row));
    });
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: row.status || 'active',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SocialAccountRepository extends BaseRepository<SocialAccount> {
  async findById(id: string): Promise<SocialAccount | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM social_accounts WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSocialAccount(result.rows[0]);
    });
  }

  async findByUserId(userId: string): Promise<SocialAccount[]> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM social_accounts WHERE user_id = $1',
        [userId]
      );

      return result.rows.map(row => this.mapRowToSocialAccount(row));
    });
  }

  async findByUserAndPlatform(userId: string, platform: 'tiktok' | 'instagram'): Promise<SocialAccount | null> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM social_accounts WHERE user_id = $1 AND platform = $2',
        [userId, platform]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSocialAccount(result.rows[0]);
    });
  }

  async create(data: Partial<SocialAccount>): Promise<SocialAccount> {
    const validatedData = SocialAccountSchema.omit({ id: true, createdAt: true }).parse(data);
    
    return this.withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO social_accounts (user_id, platform, platform_user_id, access_token, refresh_token, expires_at) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          validatedData.userId,
          validatedData.platform,
          validatedData.platformUserId,
          validatedData.accessToken,
          validatedData.refreshToken,
          validatedData.expiresAt,
        ]
      );

      return this.mapRowToSocialAccount(result.rows[0]);
    });
  }

  async update(id: string, data: Partial<SocialAccount>): Promise<SocialAccount | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.accessToken !== undefined) {
      updates.push(`access_token = $${paramIndex++}`);
      values.push(data.accessToken);
    }
    if (data.refreshToken !== undefined) {
      updates.push(`refresh_token = $${paramIndex++}`);
      values.push(data.refreshToken);
    }
    if (data.expiresAt !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      values.push(data.expiresAt);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    return this.withClient(async (client) => {
      const result = await client.query(
        `UPDATE social_accounts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSocialAccount(result.rows[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'DELETE FROM social_accounts WHERE id = $1',
        [id]
      );

      return (result.rowCount ?? 0) > 0;
    });
  }

  async deleteByUserAndPlatform(userId: string, platform: 'tiktok' | 'instagram'): Promise<boolean> {
    return this.withClient(async (client) => {
      const result = await client.query(
        'DELETE FROM social_accounts WHERE user_id = $1 AND platform = $2',
        [userId, platform]
      );

      return (result.rowCount ?? 0) > 0;
    });
  }

  async findAll(options: PaginationOptions = {}): Promise<SocialAccount[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return this.withClient(async (client) => {
      const result = await client.query(
        `SELECT * FROM social_accounts 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => this.mapRowToSocialAccount(row));
    });
  }

  private mapRowToSocialAccount(row: any): SocialAccount {
    return {
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      platformUserId: row.platform_user_id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }
}