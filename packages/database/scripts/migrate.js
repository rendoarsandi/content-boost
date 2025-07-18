#!/usr/bin/env node

const { MigrationRunner } = require('../dist/migrations');
const { createDatabaseConnection } = require('../dist/connection');

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/creator_promotion_platform';
  
  console.log('Connecting to database...');
  const db = createDatabaseConnection({ url: databaseUrl });
  
  try {
    await db.connect();
    console.log('Database connected successfully');
    
    const migrationRunner = new MigrationRunner();
    await migrationRunner.runMigrations();
    
    console.log('Migration process completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
    console.log('Database connection closed');
  }
}

// Handle command line arguments
const command = process.argv[2];
const migrationId = process.argv[3];

if (command === 'rollback' && migrationId) {
  // Rollback specific migration
  (async () => {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/creator_promotion_platform';
    const db = createDatabaseConnection({ url: databaseUrl });
    
    try {
      await db.connect();
      const migrationRunner = new MigrationRunner();
      await migrationRunner.rollbackMigration(migrationId);
    } catch (error) {
      console.error('Rollback failed:', error);
      process.exit(1);
    } finally {
      await db.disconnect();
    }
  })();
} else {
  // Run migrations
  runMigrations();
}