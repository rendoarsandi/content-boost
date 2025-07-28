import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

/**
 * End-to-End Test for Creator Journey
 * 
 * This test covers the complete creator journey:
 * 1. Registration and login
 * 2. Campaign creation
 * 3. Promoter application review
 * 4. Campaign metrics monitoring
 * 5. Payout verification
 */

test.describe('Creator Journey E2E Test', () => {
  const testEmail = `creator-${uuidv4().substring(0, 8)}@test.com`;
  const testPassword = 'TestPassword123!';
  let campaignId: string;
  
  test.beforeAll(async () => {
    // Setup test data if needed
    // This could include creating a test user in the database
  });

  test('Creator Registration and Login', async ({ page }) => {
    // Visit auth page
    await page.goto('http://auth.localhost:3000/register');
    
    // Fill registration form
    await page.fill('input[name="name"]', 'Test Creator');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // Select creator role
    await page.click('input[value="creator"]');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify redirect to dashboard
    await page.waitForURL('http://dashboard.localhost:3000/creator');
    
    // Verify dashboard loaded correctly
    await expect(page.locator('h1')).toContainText('Creator Dashboard');
  });

  test('Campaign Creation', async ({ page }) => {
    // Login if needed
    await page.goto('http://auth.localhost:3000/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Navigate to campaign creation
    await page.goto('http://dashboard.localhost:3000/creator/campaigns/new');
    
    // Fill campaign form
    await page.fill('input[name="title"]', 'Test Campaign');
    await page.fill('textarea[name="description"]', 'This is a test campaign for E2E testing');
    await page.fill('input[name="budget"]', '1000000');
    await page.fill('input[name="ratePerView"]', '1000');
    
    // Add requirements
    await page.click('button:has-text("Add Requirement")');
    await page.fill('input[name="requirements.0"]', 'Minimum 1000 followers');
    
    // Upload material (mock)
    await page.setInputFiles('input[type="file"]', {
      name: 'test-material.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test image content')
    });
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify redirect to campaign detail
    await page.waitForURL(/http:\/\/dashboard\.localhost:3000\/creator\/campaigns\/[a-f0-9-]+/);
    
    // Extract campaign ID from URL for later tests
    const url = page.url();
    campaignId = url.split('/').pop() || '';
    
    // Verify campaign created successfully
    await expect(page.locator('h1')).toContainText('Test Campaign');
    await expect(page.locator('div.status-badge')).toContainText('Active');
  });

  test('Promoter Application Review', async ({ page }) => {
    // Login if needed and navigate to applications
    await page.goto('http://auth.localhost:3000/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Navigate to campaign applications
    await page.goto(`http://dashboard.localhost:3000/creator/campaigns/${campaignId}/applications`);
    
    // Mock: Create a test application if none exists
    const hasApplications = await page.locator('table tbody tr').count() > 0;
    
    if (!hasApplications) {
      // This is a mock - in a real test, we'd have another test user apply
      console.log('No applications found, test will simulate application review');
      
      // Navigate to the API endpoint that would show applications
      await page.goto(`http://dashboard.localhost:3000/creator/applications/mock-application-id`);
    } else {
      // Click on first application
      await page.click('table tbody tr:first-child a');
    }
    
    // Approve application
    await page.click('button:has-text("Approve")');
    
    // Verify approval confirmation
    await expect(page.locator('.toast')).toContainText('Application approved');
  });

  test('Campaign Metrics Monitoring', async ({ page }) => {
    // Login if needed
    await page.goto('http://auth.localhost:3000/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Navigate to campaign metrics
    await page.goto(`http://dashboard.localhost:3000/creator/campaigns/${campaignId}`);
    
    // Verify metrics components are loaded
    await expect(page.locator('h2:has-text("Real-time Metrics")')).toBeVisible();
    await expect(page.locator('.metrics-card')).toHaveCount(4); // Views, Likes, Comments, Shares
    
    // Wait for metrics to load (if real-time)
    await page.waitForTimeout(2000);
    
    // Verify some metrics data is displayed (could be 0 in test)
    await expect(page.locator('.metrics-card:first-child .value')).toBeVisible();
  });

  test('Payout Verification', async ({ page }) => {
    // Login if needed
    await page.goto('http://auth.localhost:3000/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Navigate to analytics/finance section
    await page.goto('http://dashboard.localhost:3000/creator/analytics');
    
    // Verify financial data is displayed
    await expect(page.locator('h2:has-text("Campaign Finances")')).toBeVisible();
    
    // Check campaign budget usage
    await expect(page.locator('.budget-card')).toBeVisible();
    
    // Check payout history (might be empty in test)
    await expect(page.locator('h3:has-text("Payout History")')).toBeVisible();
  });

  test.afterAll(async () => {
    // Clean up test data if needed
  });
});