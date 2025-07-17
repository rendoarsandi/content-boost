#!/usr/bin/env node

const { spawn } = require('child_process');

async function runMigration() {
  console.log('🗃️  Starting database migration...');
  
  const child = spawn('npm', ['run', 'migrate', '--workspace=@repo/database'], {
    stdio: 'inherit',
    shell: true
  });

  // Set timeout warning
  const warningTimeout = setTimeout(() => {
    console.warn('⚠️  Database migration running longer than expected (2 minutes)...');
  }, 2 * 60 * 1000);

  child.on('close', (code) => {
    clearTimeout(warningTimeout);
    if (code === 0) {
      console.log('✅ Database migration completed successfully');
    } else {
      console.error(`❌ Database migration failed with code ${code}`);
      process.exit(code);
    }
  });

  child.on('error', (error) => {
    clearTimeout(warningTimeout);
    console.error('❌ Database migration failed:', error.message);
    process.exit(1);
  });
}

runMigration();