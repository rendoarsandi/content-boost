#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const processes = new Map();

function ensureLogDir() {
  const logDir = path.join(process.cwd(), 'logs', 'app');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

function startApp(name, workspace, port) {
  console.log(`🚀 Starting ${name} on port ${port}...`);
  
  const logDir = ensureLogDir();
  const logPath = path.join(logDir, `${name}.log`);
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  
  const child = spawn('npm', ['run', 'dev', `--workspace=${workspace}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, PORT: port.toString() }
  });

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  
  child.on('close', (code) => {
    console.log(`📝 ${name} exited with code ${code}`);
    processes.delete(name);
  });

  child.on('error', (error) => {
    console.error(`❌ ${name} error:`, error.message);
    processes.delete(name);
  });

  processes.set(name, child);
}

async function runBackgroundDev() {
  console.log('🔄 Starting background development processes...');
  
  // Start each app on different ports
  startApp('landing-page', '@repo/landing-page', 3000);
  startApp('auth-app', '@repo/auth-app', 3001);
  startApp('dashboard-app', '@repo/dashboard-app', 3002);
  startApp('admin-app', '@repo/admin-app', 3003);

  console.log('✅ All background processes started');
  console.log('📝 Logs are being written to logs/app/');
  console.log('🌐 Apps will be available on:');
  console.log('  - Landing Page: http://localhost:3000');
  console.log('  - Auth App: http://localhost:3001');
  console.log('  - Dashboard App: http://localhost:3002');
  console.log('  - Admin App: http://localhost:3003');
  console.log('🛑 Press Ctrl+C to stop all processes');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping all processes...');
    for (const [name, child] of processes) {
      console.log(`🛑 Stopping ${name}...`);
      child.kill('SIGTERM');
    }
    process.exit(0);
  });

  // Keep the main process alive
  process.stdin.resume();
}

runBackgroundDev();