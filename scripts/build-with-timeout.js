const { spawn } = require('child_process');

// Configuration
const BUILD_TIMEOUT = 600000; // 10 minutes maximum
const WARNING_TIMEOUT = 120000; // 2 minutes warning
const CHECK_INTERVAL = 10000; // Check every 10 seconds

let buildProcess = null;
let startTime = Date.now();
let warningShown = false;

function showWarning() {
  console.log('\n⚠️  WARNING: Build process has been running for 2+ minutes');
  console.log('   This might indicate a slow build or potential issues.');
  console.log('   Press Ctrl+C to terminate if needed.\n');
}

function showTimeout() {
  console.log('\n❌ TIMEOUT: Build process exceeded maximum timeout (10 minutes)');
  console.log('   Terminating build to prevent hanging...\n');
  
  if (buildProcess) {
    buildProcess.kill('SIGTERM');
    setTimeout(() => {
      if (buildProcess && !buildProcess.killed) {
        console.log('   Force killing build process...');
        buildProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

function startBuild() {
  console.log('🔨 Starting build process with timeout monitoring...\n');
  
  // Start the build process
  buildProcess = spawn('turbo', ['run', 'build'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  // Handle process events
  buildProcess.on('error', (error) => {
    console.error('❌ Failed to start build process:', error.message);
    process.exit(1);
  });

  buildProcess.on('exit', (code, signal) => {
    const elapsed = Date.now() - startTime;
    const elapsedMinutes = Math.round(elapsed / 60000);
    
    if (signal === 'SIGTERM' || signal === 'SIGKILL') {
      console.log('\n🛑 Build process terminated due to timeout');
      process.exit(1);
    } else if (code !== 0) {
      console.log(`\n❌ Build process failed with code ${code} (took ${elapsedMinutes} minutes)`);
      process.exit(code);
    } else {
      console.log(`\n✅ Build completed successfully (took ${elapsedMinutes} minutes)`);
      process.exit(0);
    }
  });

  // Start timeout monitoring
  const timeoutInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    
    // Show warning at 2 minutes
    if (elapsed >= WARNING_TIMEOUT && !warningShown) {
      showWarning();
      warningShown = true;
    }
    
    // Force terminate at 10 minutes
    if (elapsed >= BUILD_TIMEOUT) {
      clearInterval(timeoutInterval);
      showTimeout();
    }
  }, CHECK_INTERVAL);

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n🛑 Received interrupt signal, stopping build process...');
    clearInterval(timeoutInterval);
    
    if (buildProcess) {
      buildProcess.kill('SIGTERM');
      setTimeout(() => {
        if (buildProcess && !buildProcess.killed) {
          buildProcess.kill('SIGKILL');
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
    if (buildProcess) {
      buildProcess.kill('SIGTERM');
    }
    process.exit(1);
  });
}

// Start the build
startBuild();