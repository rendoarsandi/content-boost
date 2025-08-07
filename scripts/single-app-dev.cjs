const { spawn } = require('child_process');
const path = require('path');

// Configuration
const DEV_TIMEOUT = 30000; // 30 seconds warning
const MAX_TIMEOUT = 300000; // 5 minutes maximum
const CHECK_INTERVAL = 5000; // Check every 5 seconds

let devProcess = null;
let startTime = Date.now();
let warningShown = false;

// Get app name from command line arguments
const appName = process.argv[2];

if (!appName) {
  console.error('❌ Please specify an app name:');
  console.log('   npm run dev:app dashboard-app');
  console.log('   npm run dev:app auth-app');
  console.log('   npm run dev:app landing-page');
  console.log('   npm run dev:app admin-app');
  process.exit(1);
}

// Validate app exists
const appPath = path.join(process.cwd(), 'apps', appName);
const fs = require('fs');

if (!fs.existsSync(appPath)) {
  console.error(`❌ App "${appName}" not found in apps/ directory`);
  process.exit(1);
}

function showWarning() {
  console.log(`\n⚠️  WARNING: ${appName} has been running for 30+ seconds`);
  console.log(
    '   This might indicate the server is stuck or taking too long to start.'
  );
  console.log('   Press Ctrl+C to terminate if needed.\n');
}

function showMaxTimeout() {
  console.log(`\n❌ TIMEOUT: ${appName} exceeded maximum timeout (5 minutes)`);
  console.log('   Terminating process to prevent hanging...\n');

  if (devProcess) {
    devProcess.kill('SIGTERM');
    setTimeout(() => {
      if (devProcess && !devProcess.killed) {
        console.log('   Force killing process...');
        devProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

function startSingleApp() {
  console.log(`🚀 Starting ${appName} with timeout monitoring...\n`);

  // Start the specific app
  devProcess = spawn('turbo', ['run', 'dev', '--filter', appName], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  });

  // Handle process events
  devProcess.on('error', error => {
    console.error(`❌ Failed to start ${appName}:`, error.message);
    process.exit(1);
  });

  devProcess.on('exit', (code, signal) => {
    if (signal === 'SIGTERM' || signal === 'SIGKILL') {
      console.log(`\n🛑 ${appName} terminated due to timeout`);
    } else if (code !== 0) {
      console.log(`\n❌ ${appName} exited with code ${code}`);
    } else {
      console.log(`\n✅ ${appName} stopped normally`);
    }
    process.exit(code || 0);
  });

  // Start timeout monitoring
  const timeoutInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;

    // Show warning at 30 seconds
    if (elapsed >= DEV_TIMEOUT && !warningShown) {
      showWarning();
      warningShown = true;
    }

    // Force terminate at 5 minutes
    if (elapsed >= MAX_TIMEOUT) {
      clearInterval(timeoutInterval);
      showMaxTimeout();
    }
  }, CHECK_INTERVAL);

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log(`\n🛑 Received interrupt signal, stopping ${appName}...`);
    clearInterval(timeoutInterval);

    if (devProcess) {
      devProcess.kill('SIGTERM');
      setTimeout(() => {
        if (devProcess && !devProcess.killed) {
          devProcess.kill('SIGKILL');
        }
        process.exit(0);
      }, 3000);
    } else {
      process.exit(0);
    }
  });

  // Handle other termination signals
  process.on('SIGTERM', () => {
    clearInterval(timeoutInterval);
    if (devProcess) {
      devProcess.kill('SIGTERM');
    }
    process.exit(0);
  });
}

// Start the app
startSingleApp();
