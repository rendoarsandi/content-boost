import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

/**
 * End-to-End Test for Creator Journey
 *
 * This test covers the complete creator journey:
 * 1. OAuth authentication and role selection
 * 2. Campaign creation
 * 3. Promoter application review
 * 4. Campaign metrics monitoring
 * 5. Payout verification
 *
 * Note: Uses mock OAuth for testing since TikTok/Instagram OAuth 
 * requires real credentials and approval process
 */

test.describe('Creator Journey E2E Test', () => {
  const testUserId = `creator-${uuidv4().substring(0, 8)}`;
  let campaignId: string;

  test.beforeAll(async () => {
    // Setup test data - mock authenticated user
    // In real implementation, this would setup test database state
  });

  test('Creator OAuth Authentication and Role Selection', async ({ page }) => {
    // Mock: Visit auth page (in real test, this would be mocked OAuth flow)
    await page.goto('http://localhost:3000/auth/login');

    // Verify OAuth login options exist
    await expect(page.locator('button:has-text("Continue with TikTok")')).toBeVisible();
    await expect(page.locator('button:has-text("Continue with Instagram")')).toBeVisible();

    // Mock OAuth success: Navigate directly to onboarding 
    // (simulating successful OAuth callback)
    await page.goto('http://localhost:3000/auth/onboarding');

    // Select creator role in onboarding
    await page.click('input[value="creator"]');
    
    // Submit role selection
    await page.click('button:has-text("Complete Setup")');

    // Verify redirect to creator dashboard
    await page.waitForURL('**/creator');

    // Verify dashboard loaded correctly with actual UI elements
    await expect(page.locator('h1:has-text("Creator Dashboard")')).toBeVisible();
    await expect(page.locator('text=Total Campaigns')).toBeVisible();
    await expect(page.locator('text=Active Promoters')).toBeVisible();
  });

  test('Campaign Creation', async ({ page }) => {
    // Mock authenticated session - navigate directly to campaign creation
    await page.goto('http://localhost:3000/creator/campaigns/new');

    // Verify campaign creation page loaded
    await expect(page.locator('h1:has-text("Create New Campaign")')).toBeVisible();
    await expect(page.locator('text=Set up a new promotion campaign')).toBeVisible();

    // Fill campaign form with actual form fields
    await page.fill('input[name="title"]', 'Test E2E Campaign');
    await page.fill('textarea[name="description"]', 'This is a test campaign for E2E testing');
    await page.fill('input[name="budget"]', '1000000');
    await page.fill('input[name="ratePerView"]', '1000');
    
    // Set dates
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await page.fill('input[name="startDate"]', today);
    await page.fill('input[name="endDate"]', endDate);

    // Add requirement
    await page.fill('input[name="requirements.0"]', 'Minimum 1000 followers');

    // Add campaign material
    await page.fill('input[name="materialTitle"]', 'Test Material');
    await page.fill('input[name="materialUrl"]', 'https://example.com/material');
    await page.selectOption('select[name="materialType"]', 'youtube');
    await page.click('button:has-text("Add Material")');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for success and extract campaign ID
    await page.waitForTimeout(2000); // Allow for form submission
    
    // Verify successful creation (could be redirect or success message)
    const url = page.url();
    if (url.includes('/campaigns/')) {
      campaignId = url.split('/').pop() || '';
      await expect(page.locator('h1:has-text("Test E2E Campaign")')).toBeVisible();
    } else {
      // Alternative: check for success message on same page
      await expect(page.locator('.toast, .alert')).toContainText(/success|created/i);
    }
  });

  test('Promoter Application Review', async ({ page }) => {
    // Login if needed and navigate to applications
    await page.goto('http://auth.localhost:3000/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Navigate to campaign applications
    await page.goto(
      `http://dashboard.localhost:3000/creator/campaigns/${campaignId}/applications`
    );

    // Mock: Create a test application if none exists
    const hasApplications = (await page.locator('table tbody tr').count()) > 0;

    if (!hasApplications) {
      // This is a mock - in a real test, we'd have another test user apply
      console.log(
        'No applications found, test will simulate application review'
      );

      // Navigate to the API endpoint that would show applications
      await page.goto(
        `http://dashboard.localhost:3000/creator/applications/mock-application-id`
      );
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
    await page.goto(
      `http://dashboard.localhost:3000/creator/campaigns/${campaignId}`
    );

    // Verify metrics components are loaded
    await expect(
      page.locator('h2:has-text("Real-time Metrics")')
    ).toBeVisible();
    await expect(page.locator('.metrics-card')).toHaveCount(4); // Views, Likes, Comments, Shares

    // Wait for metrics to load (if real-time)
    await page.waitForTimeout(2000);

    // Verify some metrics data is displayed (could be 0 in test)
    await expect(
      page.locator('.metrics-card:first-child .value')
    ).toBeVisible();
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
    await expect(
      page.locator('h2:has-text("Campaign Finances")')
    ).toBeVisible();

    // Check campaign budget usage
    await expect(page.locator('.budget-card')).toBeVisible();

    // Check payout history (might be empty in test)
    await expect(page.locator('h3:has-text("Payout History")')).toBeVisible();
  });

  test.afterAll(async () => {
    // Clean up test data if needed
  });
});
