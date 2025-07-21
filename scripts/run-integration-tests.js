const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout
const REPORT_DIR = path.join(__dirname, '../reports/integration');

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Get current timestamp for report naming
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const reportFile = path.join(REPORT_DIR, `integration-test-report-${timestamp}.json`);

// Apps to test
const apps = ['dashboard-app', 'admin-app'];

// Run tests for each app
async function runTests() {
  console.log('Starting integration tests...');
  
  const results = {
    timestamp,
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    },
    appResults: {}
  };

  for (const app of apps) {
    console.log(`\nRunning tests for ${app}...`);
    
    try {
      const testDir = path.join(__dirname, `../apps/${app}/__tests__/integration`);
      
      // Skip if no integration tests exist for this app
      if (!fs.existsSync(testDir)) {
        console.log(`No integration tests found for ${app}, skipping...`);
        continue;
      }
      
      // Run tests with vitest
      const testProcess = spawn('npx', [
        'vitest', 
        'run', 
        '--dir', 
        `apps/${app}/__tests__/integration`,
        '--reporter', 
        'json'
      ], {
        cwd: path.join(__dirname, '..'),
        stdio: ['ignore', 'pipe', 'inherit']
      });
      
      // Set timeout
      const timeout = setTimeout(() => {
        console.error(`\nTest timeout after ${TIMEOUT_MS / 1000} seconds for ${app}`);
        testProcess.kill();
      }, TIMEOUT_MS);
      
      // Collect test output
      let output = '';
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });
      
      // Wait for process to complete
      await new Promise((resolve) => {
        testProcess.on('close', (code) => {
          clearTimeout(timeout);
          
          // Try to parse test results
          try {
            const testResults = JSON.parse(output);
            
            results.appResults[app] = {
              exitCode: code,
              testResults
            };
            
            // Update summary
            results.summary.total += testResults.numTotalTests || 0;
            results.summary.passed += testResults.numPassedTests || 0;
            results.summary.failed += testResults.numFailedTests || 0;
            results.summary.skipped += testResults.numPendingTests || 0;
            
            console.log(`\n${app} tests completed with exit code ${code}`);
          } catch (err) {
            console.error(`\nFailed to parse test results for ${app}:`, err);
            results.appResults[app] = {
              exitCode: code,
              error: 'Failed to parse test results'
            };
          }
          
          resolve();
        });
      });
      
    } catch (err) {
      console.error(`\nError running tests for ${app}:`, err);
      results.appResults[app] = {
        error: err.message
      };
    }
  }
  
  // Write report
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  console.log(`\nTest report written to ${reportFile}`);
  
  // Print summary
  console.log('\nTest Summary:');
  console.log(`Total: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Skipped: ${results.summary.skipped}`);
  
  // Exit with error if any tests failed
  if (results.summary.failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Error running integration tests:', err);
  process.exit(1);
});