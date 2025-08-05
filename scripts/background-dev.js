const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const LOG_DIR = path.join(process.cwd(), 'logs', 'app');
const MAX_RESTARTS = 3;
const RESTART_DELAY = 5000; // 5 seconds
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

let devProcess = null;
let restartCount = 0;
let isShuttingDown = false;
let logStream = null;

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function createLogStream() {
  const timestamp = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `dev-${timestamp}.log`);

  // Check if log file is too large
  if (fs.existsSync(logFile)) {
    const stats = fs.statSync(logFile);
    if (stats.size > MAX_LOG_SIZE) {
      const backupFile = path.join(
        LOG_DIR,
        `dev-${timestamp}-${Date.now()}.log`
      );
      fs.renameSync(logFile, backupFile);
    }
  }

  logStream = fs.createWriteStream(logFile, { flags: 'a' });
  return logStream;
}

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;

  console.log(logMessage.trim());

  if (logStream) {
    logStream.write(logMessage);
  }
}

function startDevServer() {
  if (isShuttingDown) return;

  log(
    `Starting development server (attempt ${restartCount + 1}/${MAX_RESTARTS + 1})`
  );

  // Create new log stream
  if (logStream) {
    logStream.end();
  }
  createLogStream();

  // Start the development server
  devProcess = spawn('turbo', ['run', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    cwd: process.cwd(),
    detached: false,
  });

  // Log process ID
  log(`Development server started with PID: ${devProcess.pid}`);

  // Handle stdout
  devProcess.stdout.on('data', data => {
    const output = data.toString().trim();
    if (output) {
      log(`STDOUT: ${output}`);
    }
  });

  // Handle stderr
  devProcess.stderr.on('data', data => {
    const output = data.toString().trim();
    if (output) {
      log(`STDERR: ${output}`, 'ERROR');
    }
  });

  // Handle process events
  devProcess.on('error', error => {
    log(`Failed to start development server: ${error.message}`, 'ERROR');
    handleProcessExit(1);
  });

  devProcess.on('exit', (code, signal) => {
    if (signal) {
      log(`Development server terminated with signal: ${signal}`, 'WARN');
    } else {
      log(
        `Development server exited with code: ${code}`,
        code === 0 ? 'INFO' : 'ERROR'
      );
    }
    handleProcessExit(code);
  });
}

function handleProcessExit(code) {
  if (isShuttingDown) return;

  devProcess = null;

  if (code !== 0 && restartCount < MAX_RESTARTS) {
    restartCount++;
    log(`Restarting in ${RESTART_DELAY / 1000} seconds...`, 'WARN');

    setTimeout(() => {
      startDevServer();
    }, RESTART_DELAY);
  } else if (restartCount >= MAX_RESTARTS) {
    log(
      `Maximum restart attempts (${MAX_RESTARTS}) reached. Stopping.`,
      'ERROR'
    );
    shutdown(1);
  } else {
    log('Development server stopped normally');
    shutdown(0);
  }
}

function healthCheck() {
  if (!devProcess || isShuttingDown) return;

  // Simple health check - verify process is still running
  try {
    process.kill(devProcess.pid, 0); // Signal 0 checks if process exists
    log('Health check: Development server is running');
  } catch (error) {
    log('Health check: Development server appears to be dead', 'ERROR');
    handleProcessExit(1);
  }
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;

  isShuttingDown = true;
  log('Shutting down background development server...');

  if (devProcess) {
    log(`Terminating process ${devProcess.pid}...`);
    devProcess.kill('SIGTERM');

    setTimeout(() => {
      if (devProcess && !devProcess.killed) {
        log('Force killing process...', 'WARN');
        devProcess.kill('SIGKILL');
      }
    }, 5000);
  }

  if (logStream) {
    logStream.end();
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 1000);
}

// Handle signals
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...', 'WARN');
  shutdown(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...', 'WARN');
  shutdown(0);
});

process.on('uncaughtException', error => {
  log(`Uncaught exception: ${error.message}`, 'ERROR');
  log(`Stack trace: ${error.stack}`, 'ERROR');
  shutdown(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'ERROR');
  shutdown(1);
});

// Start health check interval
const healthCheckInterval = setInterval(healthCheck, HEALTH_CHECK_INTERVAL);

// Cleanup interval on shutdown
process.on('exit', () => {
  clearInterval(healthCheckInterval);
});

// Start the server
log('Starting background development server with auto-restart...');
startDevServer();
