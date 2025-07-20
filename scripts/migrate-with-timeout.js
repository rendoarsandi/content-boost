const { spawn } = require('child_process');

// Configuration
const MIGRATE_TIMEOUT = 120000; // 2 minutes maximum
const WARNING_TIMEOUT = 30000; // 30 seconds warning
const CHECK_INTERVAL = 5000; // Check every 5 seconds

let migrateProcess = null;
let startTime = Date.now();
let warningShown = false;

function showWarning() {
  console.log('\n⚠️  WARNING: Migration has been running for 30+ seconds');
  console.log('   This might indicate a complex migration or database issues.');
  console.log('   Press Ctrl+C to terminate if needed.\n');
}

function showTimeout() {
  console.log('\n❌ TIMEOUT: Migration exceeded maximum timeout (2 minutes)');
  console.log('   Terminating migration to prevent hanging...\n');
  
  if (migrateProcess) {
    migrateProcess.kill('SIGTERM');
    setTimeout(() => {
      if (migrateProcess && !migrateProcess.killed) {
        console.log('   Force killing migration process...');
        migrateProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

function startMigration() {
  console.log('🗄️  Starting database migration with timeout monitoring...\n');
  
  // Get migration command from arguments or use default
  const migrateArgs = process.argv.slice(2);
  const migrateCommand = migrateArgs.length > 0 ? migrateArgs : ['run', 'db:migrate'];
  
  // Start the migration process
  migrateProcess = spawn('npm', migrateCommand, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  // Handle process events
  migrateProcess.on('error', (error) => {
    console.error('❌ Failed to start migration process:', error.message);
    process.exit(1);
  });

  migrateProcess.on('exit', (code, signal) => {
    const elapsed = Date.now() - startTime;
    const elapsedSeconds = Math.round(elapsed / 1000);
    
    if (signal === 'SIGTERM' || signal === 'SIGKILL') {
      console.log('\n🛑 Migration process terminated due to timeout');
      process.exit(1);
    } else if (code !== 0) {
      console.log(`\n❌ Migration failed with code ${code} (took ${elapsedSeconds} seconds)`);
      process.exit(code);
    } else {
      console.log(`\n✅ Migration completed successfully (took ${elapsedSeconds} seconds)`);
      process.exit(0);
    }
  });

  // Start timeout monitoring
  const timeoutInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    
    // Show warning at 30 seconds
    if (elapsed >= WARNING_TIMEOUT && !warningShown) {
      showWarning();
      warningShown = true;
    }
    
    // Force terminate at 2 minutes
    if (elapsed >= MIGRATE_TIMEOUT) {
      clearInterval(timeoutInterval);
      showTimeout();
    }
  }, CHECK_INTERVAL);

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n🛑 Received interrupt signal, stopping migration process...');
    clearInterval(timeoutInterval);
    
    if (migrateProcess) {
      migrateProcess.kill('SIGTERM');
      setTimeout(() => {
        if (migrateProcess && !migrateProcess.killed) {
          migrateProcess.kill('SIGKILL');
        }
        process.exit(1);
      }, 3000);
    } else {
      process.exit(1);
    }
  });

  // Handle other termination signals
  process.on('SIGTERM', () => {
    clearInterval(timeoutInterval);
    if (migrateProcess) {
      migrateProcess.kill('SIGTERM');
    }
    process.exit(1);
  });
}

// Start the migration
startMigration();