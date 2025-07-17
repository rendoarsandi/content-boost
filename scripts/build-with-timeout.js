#!/usr/bin/env node

const { spawn } = require('child_process');

async function runBuild() {
  console.log('🏗️  Starting build process...');
  
  const child = spawn('npx', ['turbo', 'run', 'build'], {
    stdio: 'inherit',
    shell: true
  });

  // Set timeout warning
  const warningTimeout = setTimeout(() => {
    console.warn('⚠️  Build process running longer than expected (10 minutes)...');
  }, 10 * 60 * 1000);

  child.on('close', (code) => {
    clearTimeout(warningTimeout);
    if (code === 0) {
      console.log('✅ Build completed successfully');
    } else {
      console.error(`❌ Build failed with code ${code}`);
      process.exit(code);
    }
  });

  child.on('error', (error) => {
    clearTimeout(warningTimeout);
    console.error('❌ Build process failed:', error.message);
    process.exit(1);
  });
}

runBuild();