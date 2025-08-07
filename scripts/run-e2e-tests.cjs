/**
 * Script to run end-to-end tests with timeout monitoring
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const MAX_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const APPS_WITH_E2E = ['dashboard-app']; // Add more apps as they get E2E tests

// Ensure reports directory exists
const reportsDir = path.join(__dirname, '../reports/e2e');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Run E2E tests for each app
async function runE2ETests() {
  console.log('🧪 Running E2E tests with timeout monitoring...');

  for (const app of APPS_WITH_E2E) {
    console.log(`\n📱 Running E2E tests for ${app}...`);

    const appDir = path.join(__dirname, '../apps', app);

    // Check if playwright.config.ts exists
    const configPath = path.join(appDir, 'playwright.config.ts');
    if (!fs.existsSync(configPath)) {
      console.log(`⚠️ No Playwright config found for ${app}, skipping...`);
      continue;
    }

    // Run the tests with timeout
    try {
      await runCommandWithTimeout(
        'npx',
        ['playwright', 'test', '--reporter=html,list'],
        {
          cwd: appDir,
          env: { ...process.env, PLAYWRIGHT_HTML_REPORT: '../../reports/e2e' },
        },
        MAX_TIMEOUT
      );

      console.log(`✅ E2E tests for ${app} completed successfully!`);
    } catch (error) {
      console.error(
        `❌ E2E tests for ${app} failed or timed out:`,
        error.message
      );
      process.exit(1);
    }
  }

  console.log('\n🎉 All E2E tests completed!');
  console.log(
    `📊 Reports available at: ${path.relative(process.cwd(), reportsDir)}`
  );
}

// Run command with timeout
function runCommandWithTimeout(command, args, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      ...options,
      stdio: 'inherit',
    });

    const timeout = setTimeout(() => {
      console.log(
        `\n⏰ Test execution timed out after ${timeoutMs / 60000} minutes!`
      );
      process.kill('SIGTERM');
      reject(new Error('Test execution timed out'));
    }, timeoutMs);

    process.on('close', code => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    process.on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Run the tests
runE2ETests().catch(err => {
  console.error('Error running E2E tests:', err);
  process.exit(1);
});
