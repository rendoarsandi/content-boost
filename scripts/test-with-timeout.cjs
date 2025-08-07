const { spawn } = require('child_process');

// Configuration
const TEST_TIMEOUT = 300000; // 5 minutes maximum per test suite
const WARNING_TIMEOUT = 60000; // 1 minute warning
const CHECK_INTERVAL = 5000; // Check every 5 seconds

let testProcess = null;
let startTime = Date.now();
let warningShown = false;

function showWarning() {
  console.log('\n⚠️  WARNING: Test suite has been running for 1+ minute');
  console.log('   This might indicate slow tests or potential issues.');
  console.log('   Press Ctrl+C to terminate if needed.\n');
}

function showTimeout() {
  console.log('\n❌ TIMEOUT: Test suite exceeded maximum timeout (5 minutes)');
  console.log('   Terminating tests to prevent hanging...\n');

  if (testProcess) {
    testProcess.kill('SIGTERM');
    setTimeout(() => {
      if (testProcess && !testProcess.killed) {
        console.log('   Force killing test process...');
        testProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

function startTests() {
  console.log('🧪 Starting test suite with timeout monitoring...\n');

  // Get test command from arguments or use default
  const testArgs = process.argv.slice(2);
  const testCommand = testArgs.length > 0 ? testArgs : ['run', 'test'];

  // Start the test process
  const command =
    testCommand[0] === 'run' && testCommand[1] === 'test'
      ? ['turbo', 'run', 'test']
      : ['npm', ...testCommand];
  testProcess = spawn(command[0], command.slice(1), {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  });

  // Handle process events
  testProcess.on('error', error => {
    console.error('❌ Failed to start test process:', error.message);
    process.exit(1);
  });

  testProcess.on('exit', (code, signal) => {
    const elapsed = Date.now() - startTime;
    const elapsedSeconds = Math.round(elapsed / 1000);

    if (signal === 'SIGTERM' || signal === 'SIGKILL') {
      console.log('\n🛑 Test process terminated due to timeout');
      process.exit(1);
    } else if (code !== 0) {
      console.log(
        `\n❌ Tests failed with code ${code} (took ${elapsedSeconds} seconds)`
      );
      process.exit(code);
    } else {
      console.log(`\n✅ All tests passed (took ${elapsedSeconds} seconds)`);
      process.exit(0);
    }
  });

  // Start timeout monitoring
  const timeoutInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;

    // Show warning at 1 minute
    if (elapsed >= WARNING_TIMEOUT && !warningShown) {
      showWarning();
      warningShown = true;
    }

    // Force terminate at 5 minutes
    if (elapsed >= TEST_TIMEOUT) {
      clearInterval(timeoutInterval);
      showTimeout();
    }
  }, CHECK_INTERVAL);

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n🛑 Received interrupt signal, stopping test process...');
    clearInterval(timeoutInterval);

    if (testProcess) {
      testProcess.kill('SIGTERM');
      setTimeout(() => {
        if (testProcess && !testProcess.killed) {
          testProcess.kill('SIGKILL');
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
    if (testProcess) {
      testProcess.kill('SIGTERM');
    }
    process.exit(1);
  });
}

// Start the tests
startTests();
