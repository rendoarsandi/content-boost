#!/usr/bin/env node

const { spawn } = require('child_process');

async function runDev() {
  console.log('🚀 Starting development servers...');
  
  const child = spawn('npx', ['turbo', 'run', 'dev', '--parallel'], {
    stdio: 'inherit',
    shell: true
  });

  // Set timeout warning
  const warningTimeout = setTimeout(() => {
    console.warn('⚠️  Development servers running longer than expected (30 seconds startup)...');
    console.log('This is normal for development servers. Press Ctrl+C to stop.');
  }, 30 * 1000);

  child.on('close', (code) => {
    clearTimeout(warningTimeout);
    if (code === 0) {
      console.log('✅ Development servers stopped');
    } else {
      console.error(`❌ Development servers failed with code ${code}`);
      process.exit(code);
    }
  });

  child.on('error', (error) => {
    clearTimeout(warningTimeout);
    console.error('❌ Development servers failed:', error.message);
    process.exit(1);
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping development servers...');
    child.kill('SIGTERM');
  });
}

runDev();