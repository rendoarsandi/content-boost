#!/usr/bin/env node

const { createDatabaseConnection, MigrationRunner } = require('../dist/index.js');

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = createDatabaseConnection({ url: databaseUrl });
  
  try {
    console.log('Connecting to database...');
    await db.connect();
    
    console.log('Running migrations...');
    const migrationRunner = new MigrationRunner();
    await migrationRunner.runMigrations();
    
    console.log('✓ All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

// Handle command line arguments
const command = process.argv[2];

if (command === 'rollback') {
  const migrationId = process.argv[3];
  if (!migrationId) {
    console.error('Migration ID is required for rollback');
    process.exit(1);
  }
  
  async function rollbackMigration() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('DATABASE_URL environment variable is required');
      process.exit(1);
    }

    const db = createDatabaseConnection({ url: databaseUrl });
    
    try {
      console.log('Connecting to database...');
      await db.connect();
      
      console.log(`Rolling back migration: ${migrationId}`);
      const migrationRunner = new MigrationRunner();
      await migrationRunner.rollbackMigration(migrationId);
      
      console.log('✓ Migration rolled back successfully');
    } catch (error) {
      console.error('Rollback failed:', error);
      process.exit(1);
    } finally {
      await db.disconnect();
    }
  }
  
  rollbackMigration();
} else {
  runMigrations();
}