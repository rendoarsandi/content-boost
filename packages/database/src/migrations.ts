import { PoolClient } from 'pg';
import { getDatabaseConnection } from './connection';

export interface Migration {
  id: string;
  name: string;
  timestamp: number;
  up: (client: PoolClient) => Promise<void>;
  down: (client: PoolClient) => Promise<void>;
}

export interface MigrationRecord {
  id: string;
  name: string;
  timestamp: number;
  executed_at: Date;
}

export class MigrationRunner {
  private migrations: Migration[] = [];
  private db = getDatabaseConnection();

  constructor() {
    this.loadMigrations();
  }

  private loadMigrations(): void {
    // Load all migrations in order
    this.migrations = [
      {
        id: '001',
        name: 'create_initial_tables',
        timestamp: 20240101000000,
        up: this.createInitialTables,
        down: this.dropInitialTables,
      },
      {
        id: '002',
        name: 'create_indexes_and_partitions',
        timestamp: 20240101000001,
        up: this.createIndexesAndPartitions,
        down: this.dropIndexesAndPartitions,
      },
    ];
  }

  async ensureMigrationsTable(): Promise<void> {
    const client = await this.db.getClient();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          timestamp BIGINT NOT NULL,
          executed_at TIMESTAMP DEFAULT NOW()
        );
      `);
    } finally {
      client.release();
    }
  }

  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const client = await this.db.getClient();
    try {
      const result = await client.query(
        'SELECT id, name, timestamp, executed_at FROM migrations ORDER BY timestamp ASC'
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<void> {
    await this.ensureMigrationsTable();
    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));

    const pendingMigrations = this.migrations.filter(m => !executedIds.has(m.id));

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to run.');
      return;
    }

    console.log(`Running ${pendingMigrations.length} pending migrations...`);

    for (const migration of pendingMigrations) {
      console.log(`Running migration: ${migration.id} - ${migration.name}`);
      
      await this.db.transaction(async (client) => {
        await migration.up(client);
        await client.query(
          'INSERT INTO migrations (id, name, timestamp) VALUES ($1, $2, $3)',
          [migration.id, migration.name, migration.timestamp]
        );
      });

      console.log(`✓ Migration ${migration.id} completed`);
    }

    console.log('All migrations completed successfully.');
  }

  async rollbackMigration(id: string): Promise<void> {
    const migration = this.migrations.find(m => m.id === id);
    if (!migration) {
      throw new Error(`Migration ${id} not found`);
    }

    const executed = await this.getExecutedMigrations();
    const executedMigration = executed.find(m => m.id === id);
    if (!executedMigration) {
      throw new Error(`Migration ${id} has not been executed`);
    }

    console.log(`Rolling back migration: ${id} - ${migration.name}`);

    await this.db.transaction(async (client) => {
      await migration.down(client);
      await client.query('DELETE FROM migrations WHERE id = $1', [id]);
    });

    console.log(`✓ Migration ${id} rolled back successfully`);
  }

  // Migration implementations
  private async createInitialTables(client: PoolClient): Promise<void> {
    // Create enums
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('creator', 'promoter', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE social_platform AS ENUM ('tiktok', 'instagram');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE material_type AS ENUM ('google_drive', 'youtube', 'image', 'video');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role user_role NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create social_accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform social_platform NOT NULL,
        platform_user_id VARCHAR(255) NOT NULL,
        access_token VARCHAR(1000) NOT NULL,
        refresh_token VARCHAR(1000),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, platform)
      );
    `);

    // Create campaigns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        budget DECIMAL(15,2) NOT NULL,
        rate_per_view DECIMAL(10,2) NOT NULL,
        status campaign_status DEFAULT 'draft' NOT NULL,
        requirements JSONB,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create campaign_materials table
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaign_materials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        type material_type NOT NULL,
        url VARCHAR(1000) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create campaign_applications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaign_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        promoter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status application_status DEFAULT 'pending' NOT NULL,
        submitted_content TEXT,
        tracking_link VARCHAR(500) NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW() NOT NULL,
        reviewed_at TIMESTAMP
      );
    `);

    // Create view_records table (partitioned by timestamp)
    await client.query(`
      CREATE TABLE IF NOT EXISTS view_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        promoter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        application_id UUID REFERENCES campaign_applications(id) ON DELETE CASCADE,
        platform social_platform NOT NULL,
        platform_post_id VARCHAR(255) NOT NULL,
        view_count INTEGER NOT NULL DEFAULT 0,
        like_count INTEGER NOT NULL DEFAULT 0,
        comment_count INTEGER NOT NULL DEFAULT 0,
        share_count INTEGER NOT NULL DEFAULT 0,
        bot_score INTEGER NOT NULL DEFAULT 0 CHECK (bot_score >= 0 AND bot_score <= 100),
        is_legitimate BOOLEAN NOT NULL DEFAULT true,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL
      ) PARTITION BY RANGE (timestamp);
    `);

    // Create tracking_sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tracking_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        promoter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        application_id UUID REFERENCES campaign_applications(id) ON DELETE CASCADE,
        platform social_platform NOT NULL,
        platform_post_id VARCHAR(255) NOT NULL,
        start_time TIMESTAMP DEFAULT NOW() NOT NULL,
        last_checked TIMESTAMP DEFAULT NOW() NOT NULL,
        total_views INTEGER NOT NULL DEFAULT 0,
        legitimate_views INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create payouts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        promoter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        application_id UUID REFERENCES campaign_applications(id) ON DELETE CASCADE,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        total_views INTEGER NOT NULL DEFAULT 0,
        legitimate_views INTEGER NOT NULL DEFAULT 0,
        bot_views INTEGER NOT NULL DEFAULT 0,
        rate_per_view DECIMAL(10,2) NOT NULL,
        gross_amount DECIMAL(15,2) NOT NULL,
        platform_fee DECIMAL(15,2) NOT NULL,
        net_amount DECIMAL(15,2) NOT NULL,
        status payout_status DEFAULT 'pending' NOT NULL,
        processed_at TIMESTAMP,
        failure_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create platform_revenue table
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_revenue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        total_fees DECIMAL(15,2) NOT NULL DEFAULT 0,
        withdrawn_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        available_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create withdrawals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        revenue_id UUID NOT NULL REFERENCES platform_revenue(id) ON DELETE CASCADE,
        amount DECIMAL(15,2) NOT NULL,
        status payout_status DEFAULT 'pending' NOT NULL,
        processed_at TIMESTAMP,
        failure_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
  }

  private async createIndexesAndPartitions(client: PoolClient): Promise<void> {
    // Create indexes for performance
    await client.query('CREATE INDEX IF NOT EXISTS view_records_timestamp_idx ON view_records (timestamp);');
    await client.query('CREATE INDEX IF NOT EXISTS view_records_campaign_promoter_idx ON view_records (campaign_id, promoter_id);');
    await client.query('CREATE INDEX IF NOT EXISTS view_records_platform_post_idx ON view_records (platform, platform_post_id);');
    await client.query('CREATE INDEX IF NOT EXISTS view_records_bot_score_idx ON view_records (bot_score);');

    await client.query('CREATE INDEX IF NOT EXISTS tracking_sessions_active_idx ON tracking_sessions (is_active, last_checked);');
    await client.query('CREATE INDEX IF NOT EXISTS tracking_sessions_campaign_promoter_idx ON tracking_sessions (campaign_id, promoter_id);');
    await client.query('CREATE INDEX IF NOT EXISTS tracking_sessions_platform_post_idx ON tracking_sessions (platform, platform_post_id);');

    await client.query('CREATE INDEX IF NOT EXISTS payouts_status_idx ON payouts (status);');
    await client.query('CREATE INDEX IF NOT EXISTS payouts_period_idx ON payouts (period_start, period_end);');
    await client.query('CREATE INDEX IF NOT EXISTS payouts_promoter_idx ON payouts (promoter_id);');
    await client.query('CREATE INDEX IF NOT EXISTS payouts_campaign_idx ON payouts (campaign_id);');
    await client.query('CREATE INDEX IF NOT EXISTS payouts_processed_at_idx ON payouts (processed_at);');

    await client.query('CREATE INDEX IF NOT EXISTS platform_revenue_period_idx ON platform_revenue (period_start, period_end);');

    // Create partitions for view_records (monthly partitions for current and next 3 months)
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const partitionName = `view_records_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF view_records
        FOR VALUES FROM ('${date.toISOString()}') TO ('${nextDate.toISOString()}');
      `);
    }
  }

  private async dropInitialTables(client: PoolClient): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await client.query('DROP TABLE IF EXISTS withdrawals CASCADE;');
    await client.query('DROP TABLE IF EXISTS platform_revenue CASCADE;');
    await client.query('DROP TABLE IF EXISTS payouts CASCADE;');
    await client.query('DROP TABLE IF EXISTS tracking_sessions CASCADE;');
    await client.query('DROP TABLE IF EXISTS view_records CASCADE;');
    await client.query('DROP TABLE IF EXISTS campaign_applications CASCADE;');
    await client.query('DROP TABLE IF EXISTS campaign_materials CASCADE;');
    await client.query('DROP TABLE IF EXISTS campaigns CASCADE;');
    await client.query('DROP TABLE IF EXISTS social_accounts CASCADE;');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');

    // Drop enums
    await client.query('DROP TYPE IF EXISTS payout_status CASCADE;');
    await client.query('DROP TYPE IF EXISTS application_status CASCADE;');
    await client.query('DROP TYPE IF EXISTS material_type CASCADE;');
    await client.query('DROP TYPE IF EXISTS campaign_status CASCADE;');
    await client.query('DROP TYPE IF EXISTS social_platform CASCADE;');
    await client.query('DROP TYPE IF EXISTS user_role CASCADE;');
  }

  private async dropIndexesAndPartitions(client: PoolClient): Promise<void> {
    // Drop partition tables
    const result = await client.query(`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE tablename LIKE 'view_records_%' 
      AND schemaname = 'public';
    `);

    for (const row of result.rows) {
      await client.query(`DROP TABLE IF EXISTS ${row.tablename} CASCADE;`);
    }

    // Indexes will be dropped automatically when tables are dropped
  }
}