import { test, expect } from '@playwright/test';

// Test Convex integration and real-time features
test.describe('Convex Integration Tests', () => {
  test('should load dashboard without errors', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login for unauthenticated users
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should handle API routes with proper error responses', async ({ page }) => {
    // Test the Convex-powered API endpoint
    const response = await page.request.get('/api/campaigns/available');
    
    // Should return 401 for unauthenticated requests
    expect(response.status()).toBe(401);
    
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('error');
  });

  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check if main content loads
    await expect(page.locator('h1')).toContainText('ContentBoost', { timeout: 10000 });
  });

  test('should handle real-time features gracefully', async ({ page }) => {
    // Monitor console for Convex connection issues
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Should not have critical errors
    const criticalErrors = errors.filter(error => 
      error.includes('TypeError') || error.includes('ReferenceError')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Performance Tests', () => {
  test('should load pages within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
  });
});