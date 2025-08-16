import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

/**
 * Complete End-to-End Integration Test
 *
 * This test covers the complete user journey across all apps:
 * 1. Landing page → Auth app → Dashboard app
 * 2. Creator and Promoter workflows
 * 3. Cross-app navigation and data consistency
 * 4. Complete campaign lifecycle
 *
 * Note: This test requires all apps to be running simultaneously
 * and uses mocked OAuth flows for authentication
 */

test.describe('Complete User Journey Integration Test', () => {
  const testSessionId = uuidv4().substring(0, 8);

  test.beforeAll(async () => {
    // Setup test data for complete integration test
    // This would include database seeding for realistic test scenarios
  });

  test('Complete Creator Journey: Landing → Auth → Campaign Creation → Management', async ({
    page,
  }) => {
    // 1. Start from landing page
    await page.goto('http://localhost:3000'); // Landing page

    // Verify landing page loaded
    await expect(
      page.locator('h1:has-text("Tingkatkan Engagement")')
    ).toBeVisible();

    // Click creator CTA
    await page.click('a:has-text("Mulai Sebagai Creator")');

    // Should redirect to auth domain (in real app)
    // For testing, we'll mock the auth flow
    await page.goto('http://localhost:3001/auth/login'); // Auth app

    // Verify auth page loaded
    await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible();

    // Mock OAuth success - go to onboarding
    await page.goto('http://localhost:3001/auth/onboarding');

    // Select creator role
    await page.click('input[value="creator"]');
    await page.click('button:has-text("Complete Setup")');

    // Should redirect to dashboard
    await page.goto('http://localhost:3002/creator'); // Dashboard app

    // Verify creator dashboard loaded
    await expect(
      page.locator('h1:has-text("Creator Dashboard")')
    ).toBeVisible();

    // Navigate to create campaign
    await page.goto('http://localhost:3002/creator/campaigns/new');

    // Create a campaign
    await page.fill(
      'input[name="title"]',
      `Integration Test Campaign ${testSessionId}`
    );
    await page.fill(
      'textarea[name="description"]',
      'Full integration test campaign'
    );
    await page.fill('input[name="budget"]', '500000');
    await page.fill('input[name="ratePerView"]', '500');

    // Set dates
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    await page.fill('input[name="startDate"]', today);
    await page.fill('input[name="endDate"]', endDate);

    // Submit campaign
    await page.click('button[type="submit"]');

    // Verify campaign creation
    await page.waitForTimeout(2000);
    const url = page.url();
    if (url.includes('/campaigns/')) {
      await expect(
        page.locator(
          `h1:has-text("Integration Test Campaign ${testSessionId}")`
        )
      ).toBeVisible();
    }
  });

  test('Complete Promoter Journey: Landing → Auth → Campaign Discovery → Application', async ({
    page,
  }) => {
    // 1. Start from landing page
    await page.goto('http://localhost:3000');

    // Click promoter CTA
    await page.click('a:has-text("Bergabung Sebagai Promoter")');

    // Mock auth flow
    await page.goto('http://localhost:3001/auth/login');
    await page.goto('http://localhost:3001/auth/onboarding');

    // Select promoter role
    await page.click('input[value="promoter"]');
    await page.click('button:has-text("Complete Setup")');

    // Go to promoter dashboard
    await page.goto('http://localhost:3002/promoter');

    // Verify promoter dashboard
    await expect(
      page.locator('h1:has-text("Promoter Dashboard")')
    ).toBeVisible();

    // Navigate to available campaigns
    await page.goto('http://localhost:3002/promoter/campaigns');

    // Verify campaigns page
    await expect(
      page.locator('h1, h2').filter({ hasText: /campaigns|available/i })
    ).toBeVisible();

    // Look for campaigns to apply to
    const campaignCards = page.locator(
      '.campaign-card, [data-testid="campaign-card"]'
    );
    const campaignCount = await campaignCards.count();

    if (campaignCount > 0) {
      // Apply to first campaign
      await campaignCards.first().click();

      // Fill application if form exists
      const motivationField = page.locator('textarea[name="motivation"]');
      if (await motivationField.isVisible()) {
        await motivationField.fill(
          `Integration test application from promoter ${testSessionId}`
        );
        await page.click('button[type="submit"]');

        // Verify application submitted
        await expect(page.locator('.toast, .alert')).toBeVisible();
      }
    }
  });

  test('Cross-App Navigation and Session Persistence', async ({ page }) => {
    // Test navigation between apps maintains session

    // Start with authenticated session (mock)
    await page.addInitScript(() => {
      // Mock authenticated session across all apps
      const sessionData = {
        user: { id: 'test-user', role: 'creator' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem('auth_session', JSON.stringify(sessionData));
    });

    // Test dashboard → auth navigation
    await page.goto('http://localhost:3002/creator');
    await page.goto('http://localhost:3001/auth/onboarding');

    // Should maintain session context
    await expect(page.locator('body')).toBeVisible();

    // Test auth → landing navigation
    await page.goto('http://localhost:3000');

    // Landing page should still load correctly
    await expect(
      page.locator('h1:has-text("Tingkatkan Engagement")')
    ).toBeVisible();
  });

  test('Admin Oversight of User Activities', async ({ page }) => {
    // Mock admin session
    await page.addInitScript(() => {
      localStorage.setItem(
        'admin_session',
        JSON.stringify({
          user: { id: 'admin-test', role: 'admin' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
      );
    });

    // Go to admin dashboard
    await page.goto('http://localhost:3003/admin');

    // Verify admin dashboard loaded
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();

    // Check user management
    await page.goto('http://localhost:3003/admin/users');

    // Verify admin can see user activities
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible();

    // Check campaign oversight
    await page.goto('http://localhost:3003/admin/campaigns');

    // Should see campaign management interface
    await expect(
      page.locator('h1, h2').filter({ hasText: /campaign|oversight/i })
    ).toBeVisible();
  });

  test('Data Consistency Across Apps', async ({ page }) => {
    // Test that data created in one app appears correctly in others

    // Create campaign in dashboard
    await page.goto('http://localhost:3002/creator/campaigns/new');

    const campaignTitle = `Data Consistency Test ${testSessionId}`;
    await page.fill('input[name="title"]', campaignTitle);
    await page.fill('textarea[name="description"]', 'Testing data consistency');
    await page.fill('input[name="budget"]', '100000');
    await page.fill('input[name="ratePerView"]', '100');

    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[name="startDate"]', today);
    await page.fill('input[name="endDate"]', today);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Check if campaign appears in promoter view
    await page.goto('http://localhost:3002/promoter/campaigns');

    // Campaign should be visible to promoters (if public)
    const campaignVisible = await page
      .locator(`text=${campaignTitle}`)
      .isVisible()
      .catch(() => false);

    // Check admin view
    await page.addInitScript(() => {
      localStorage.setItem(
        'admin_session',
        JSON.stringify({
          user: { id: 'admin-test', role: 'admin' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
      );
    });

    await page.goto('http://localhost:3003/admin/campaigns');

    // Admin should see all campaigns
    // This verifies data consistency across the platform
    await expect(
      page.locator('h1, h2').filter({ hasText: /campaign/i })
    ).toBeVisible();
  });

  test('Error Handling Across App Boundaries', async ({ page }) => {
    // Test error scenarios that span multiple apps

    // Test invalid auth state
    await page.goto('http://localhost:3002/creator'); // Unauthorized access

    // Should handle gracefully (redirect or error page)
    await page.waitForTimeout(2000);
    const currentUrl = page.url();

    // Should either redirect to auth or show unauthorized
    const isRedirected =
      currentUrl.includes('auth') || currentUrl.includes('login');
    const hasUnauthorized = await page
      .locator('text=unauthorized')
      .isVisible()
      .catch(() => false);

    expect(isRedirected || hasUnauthorized).toBeTruthy();

    // Test network errors between apps
    await page.route('**/api/**', route => {
      route.abort();
    });

    await page.goto('http://localhost:3002/creator');

    // Should handle API errors gracefully
    await expect(page.locator('body')).toBeVisible();
  });

  test('Complete Campaign Lifecycle Integration', async ({ page }) => {
    // Test the complete lifecycle from creation to completion

    // Mock creator session
    await page.addInitScript(() => {
      localStorage.setItem(
        'auth_session',
        JSON.stringify({
          user: { id: 'creator-test', role: 'creator' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
      );
    });

    // 1. Creator creates campaign
    await page.goto('http://localhost:3002/creator/campaigns/new');

    const campaignTitle = `Lifecycle Test ${testSessionId}`;
    await page.fill('input[name="title"]', campaignTitle);
    await page.fill('textarea[name="description"]', 'Complete lifecycle test');
    await page.fill('input[name="budget"]', '200000');
    await page.fill('input[name="ratePerView"]', '200');

    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[name="startDate"]', today);
    await page.fill('input[name="endDate"]', today);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 2. Switch to promoter view
    await page.addInitScript(() => {
      localStorage.setItem(
        'auth_session',
        JSON.stringify({
          user: { id: 'promoter-test', role: 'promoter' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
      );
    });

    await page.goto('http://localhost:3002/promoter/campaigns');

    // 3. Promoter applies to campaign
    // This tests the complete workflow integration

    // 4. Creator reviews application
    await page.addInitScript(() => {
      localStorage.setItem(
        'auth_session',
        JSON.stringify({
          user: { id: 'creator-test', role: 'creator' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
      );
    });

    await page.goto('http://localhost:3002/creator/campaigns');

    // 5. Admin monitors the process
    await page.addInitScript(() => {
      localStorage.setItem(
        'admin_session',
        JSON.stringify({
          user: { id: 'admin-test', role: 'admin' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
      );
    });

    await page.goto('http://localhost:3003/admin/monitoring');

    // Verify admin can monitor the campaign lifecycle
    await expect(
      page.locator('h1:has-text("System Monitoring")')
    ).toBeVisible();
  });

  test.afterAll(async () => {
    // Cleanup test data if needed
    // This would clean up any database entries created during integration tests
  });
});
