#!/usr/bin/env node

const { spawn } = require('child_process');

async function runTests() {
  console.log('🧪 Starting test suite...');
  
  const child = spawn('npx', ['turbo', 'run', 'test'], {
    stdio: 'inherit',
    shell: true
  });

  // Set timeout warning
  const warningTimeout = setTimeout(() => {
    console.warn('⚠️  Test suite running longer than expected (5 minutes)...');
  }, 5 * 60 * 1000);

  child.on('close', (code) => {
    clearTimeout(warningTimeout);
    if (code === 0) {
      console.log('✅ Test suite completed successfully');
    } else {
      console.error(`❌ Test suite failed with code ${code}`);
      process.exit(code);
    }
  });

  child.on('error', (error) => {
    clearTimeout(warningTimeout);
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

runTests();