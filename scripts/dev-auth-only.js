#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

async function runAuthDev() {
  console.log('🚀 Starting Auth App development server...');
  console.log('🌐 Will be available at: http://localhost:3001');
  console.log('');

  const child = spawn('npm', ['run', 'dev:direct'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(process.cwd(), 'apps', 'auth-app'),
  });

  // Set timeout warning after 30 seconds
  const warningTimeout = setTimeout(() => {
    console.warn(
      '⚠️  Auth App startup taking longer than expected (30 seconds)...'
    );
    console.log(
      'This is normal for Next.js development servers. Press Ctrl+C to stop.'
    );
    console.log('If the server seems stuck, you can:');
    console.log(
      '  1. Wait a bit longer (Next.js can take time on first startup)'
    );
    console.log('  2. Press Ctrl+C and try again');
    console.log('  3. Clear cache: cd apps/auth-app && npm run clean');
  }, 30 * 1000);

  // Set hard timeout after 5 minutes
  const hardTimeout = setTimeout(
    () => {
      console.error('❌ Auth App failed to start within 5 minutes');
      console.log('🛑 Terminating process...');
      child.kill('SIGTERM');

      setTimeout(() => {
        console.log('🔥 Force killing process...');
        child.kill('SIGKILL');
      }, 5000);
    },
    5 * 60 * 1000
  );

  child.on('close', code => {
    clearTimeout(warningTimeout);
    clearTimeout(hardTimeout);

    if (code === 0) {
      console.log('✅ Auth App development server stopped');
    } else if (code === null) {
      console.log('🛑 Auth App was terminated');
    } else {
      console.error(`❌ Auth App failed with code ${code}`);
      process.exit(code);
    }
  });

  child.on('error', error => {
    clearTimeout(warningTimeout);
    clearTimeout(hardTimeout);
    console.error('❌ Auth App failed:', error.message);
    process.exit(1);
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping Auth App...');
    clearTimeout(warningTimeout);
    clearTimeout(hardTimeout);
    child.kill('SIGTERM');

    // Force kill after 5 seconds if graceful shutdown fails
    setTimeout(() => {
      console.log('🔥 Force stopping...');
      child.kill('SIGKILL');
      process.exit(0);
    }, 5000);
  });

  // Handle other termination signals
  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, stopping Auth App...');
    child.kill('SIGTERM');
  });
}

runAuthDev().catch(error => {
  console.error('❌ Failed to start Auth App:', error);
  process.exit(1);
});
