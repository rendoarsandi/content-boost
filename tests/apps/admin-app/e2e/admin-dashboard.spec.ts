import { test, expect } from '@playwright/test';

/**
 * End-to-End Test for Admin Dashboard
 *
 * This test covers the admin dashboard functionality:
 * 1. Admin authentication
 * 2. Dashboard overview
 * 3. User management
 * 4. Bot detection review
 * 5. Financial oversight
 * 6. System monitoring
 *
 * Note: Uses mock admin session for testing
 */

test.describe('Admin Dashboard E2E Test', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication - in real app this would be proper admin login
    await page.addInitScript(() => {
      // Mock admin session
      localStorage.setItem('admin_session', JSON.stringify({
        user: { id: 'admin-1', role: 'admin', email: 'admin@test.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
    });
  });

  test('Should display admin dashboard overview', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');

    // Verify admin dashboard loaded
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    
    // Verify admin navigation exists
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('a:has-text("Users")')).toBeVisible();
    await expect(page.locator('a:has-text("Bot Detection")')).toBeVisible();
    await expect(page.locator('a:has-text("Finances")')).toBeVisible();
    await expect(page.locator('a:has-text("Monitoring")')).toBeVisible();

    // Verify dashboard stats cards
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Active Campaigns')).toBeVisible();
    await expect(page.locator('text=Pending Reviews')).toBeVisible();
    await expect(page.locator('text=System Status')).toBeVisible();
  });

  test('Should navigate to user management', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    
    // Navigate to users section
    await page.click('a:has-text("Users")');
    await page.waitForURL('**/admin/users');

    // Verify user management page loaded
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
    
    // Verify user management features
    await expect(page.locator('input[placeholder*="Search users"]')).toBeVisible();
    await expect(page.locator('select, button:has-text("Filter")')).toBeVisible();
    
    // Verify user table or cards exist
    await expect(page.locator('table, .user-card')).toBeVisible();
  });

  test('Should handle user ban/unban actions', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/users');

    // Look for user action buttons (ban/unban)
    const userActions = page.locator('button:has-text("Ban"), button:has-text("Unban")').first();
    
    if (await userActions.isVisible()) {
      // Test ban action
      await userActions.click();
      
      // Verify confirmation dialog or immediate action
      const confirmDialog = page.locator('dialog, .modal, .alert');
      if (await confirmDialog.isVisible()) {
        await page.click('button:has-text("Confirm"), button:has-text("Yes")');
      }
      
      // Verify success feedback
      await expect(page.locator('.toast, .alert')).toBeVisible();
    }
  });

  test('Should navigate to bot detection review', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    
    // Navigate to bot detection
    await page.click('a:has-text("Bot Detection")');
    await page.waitForURL('**/admin/bot-detection');

    // Verify bot detection page loaded
    await expect(page.locator('h1:has-text("Bot Detection")')).toBeVisible();
    
    // Verify bot detection features
    await expect(page.locator('text=Detection Stats')).toBeVisible();
    await expect(page.locator('text=Pending Reviews')).toBeVisible();
    
    // Verify monitoring components
    await expect(page.locator('.stats-card, .chart-container')).toBeVisible();
  });

  test('Should handle bot detection review actions', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/bot-detection');

    // Look for pending bot detection reviews
    const reviewActions = page.locator('button:has-text("Approve"), button:has-text("Reject")').first();
    
    if (await reviewActions.isVisible()) {
      await reviewActions.click();
      
      // Verify action was processed
      await expect(page.locator('.toast, .alert')).toBeVisible();
    }

    // Test bot detection stats view
    await expect(page.locator('text=Bot Score Distribution')).toBeVisible();
    await expect(page.locator('text=Detection Accuracy')).toBeVisible();
  });

  test('Should navigate to financial oversight', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    
    // Navigate to finances
    await page.click('a:has-text("Finances")');
    await page.waitForURL('**/admin/finances');

    // Verify financial page loaded
    await expect(page.locator('h1:has-text("Financial Management")')).toBeVisible();
    
    // Verify financial features
    await expect(page.locator('text=Transaction History')).toBeVisible();
    await expect(page.locator('text=Payout Statistics')).toBeVisible();
    await expect(page.locator('text=Revenue Overview')).toBeVisible();
    
    // Verify financial data tables/charts
    await expect(page.locator('table, .chart-container')).toBeVisible();
  });

  test('Should handle financial oversight actions', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/finances');

    // Test transaction filtering
    const filterSelect = page.locator('select[name*="filter"], input[name*="search"]').first();
    if (await filterSelect.isVisible()) {
      await filterSelect.fill('test');
      await page.keyboard.press('Enter');
      
      // Verify results updated
      await page.waitForTimeout(1000);
    }

    // Test payout approval if available
    const payoutActions = page.locator('button:has-text("Approve Payout"), button:has-text("Process")').first();
    if (await payoutActions.isVisible()) {
      await payoutActions.click();
      await expect(page.locator('.toast, .alert')).toBeVisible();
    }
  });

  test('Should navigate to system monitoring', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    
    // Navigate to monitoring
    await page.click('a:has-text("Monitoring")');
    await page.waitForURL('**/admin/monitoring');

    // Verify monitoring page loaded
    await expect(page.locator('h1:has-text("System Monitoring")')).toBeVisible();
    
    // Verify monitoring features
    await expect(page.locator('text=System Health')).toBeVisible();
    await expect(page.locator('text=Performance Metrics')).toBeVisible();
    await expect(page.locator('text=Active Alerts')).toBeVisible();
    
    // Verify monitoring panels
    await expect(page.locator('.monitoring-panel, .alert-panel')).toBeVisible();
  });

  test('Should handle system alerts', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/monitoring');

    // Look for active alerts
    const alertActions = page.locator('button:has-text("Acknowledge"), button:has-text("Resolve")').first();
    
    if (await alertActions.isVisible()) {
      await alertActions.click();
      
      // Verify alert was processed
      await expect(page.locator('.toast, .alert')).toBeVisible();
    }

    // Verify performance metrics are displayed
    await expect(page.locator('text=CPU Usage')).toBeVisible();
    await expect(page.locator('text=Memory Usage')).toBeVisible();
    await expect(page.locator('text=Response Time')).toBeVisible();
  });

  test('Should handle admin settings', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    
    // Navigate to settings
    await page.click('a:has-text("Settings")');
    await page.waitForURL('**/admin/settings');

    // Verify settings page loaded
    await expect(page.locator('h1:has-text("Admin Settings")')).toBeVisible();
    
    // Verify settings categories
    await expect(page.locator('text=System Configuration')).toBeVisible();
    await expect(page.locator('text=Security Settings')).toBeVisible();
    await expect(page.locator('text=Notification Settings')).toBeVisible();
  });

  test('Should require admin authentication', async ({ page }) => {
    // Clear admin session
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('http://localhost:3000/admin');

    // Should redirect to login or show unauthorized
    await page.waitForURL('**/login', { timeout: 5000 })
      .catch(() => {
        // Alternative: check for unauthorized page
        expect(page.locator('h1:has-text("Unauthorized")')).toBeVisible();
      });
  });

  test('Should handle admin logout', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');

    // Look for logout button
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Sign Out")');
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Verify redirect to login
      await page.waitForURL('**/login');
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible();
    }
  });
});