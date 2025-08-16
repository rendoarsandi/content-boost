import { test, expect } from '@playwright/test';

/**
 * End-to-End Test for OAuth Authentication Flow
 *
 * This test covers the OAuth authentication process:
 * 1. Landing on login page
 * 2. OAuth button interactions (TikTok/Instagram)
 * 3. Mock OAuth callback handling
 * 4. Role selection in onboarding
 * 5. Redirect to appropriate dashboard
 *
 * Note: Uses mocked OAuth flows for testing since real OAuth
 * requires approved app credentials and external provider interaction
 */

test.describe('OAuth Authentication E2E Test', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session data
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('Should display OAuth login options', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login');

    // Verify page loaded correctly
    await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible();
    await expect(
      page.locator('text=Sign in to manage your campaigns')
    ).toBeVisible();

    // Verify OAuth buttons exist and are clickable
    const tiktokButton = page.locator(
      'button:has-text("Continue with TikTok")'
    );
    const instagramButton = page.locator(
      'button:has-text("Continue with Instagram")'
    );

    await expect(tiktokButton).toBeVisible();
    await expect(tiktokButton).toBeEnabled();
    await expect(instagramButton).toBeVisible();
    await expect(instagramButton).toBeEnabled();

    // Verify proper styling for OAuth buttons
    await expect(tiktokButton).toHaveClass(/bg-black/);
    await expect(instagramButton).toHaveClass(/bg-gradient-to-r/);
  });

  test('Should handle TikTok OAuth flow (mocked)', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login');

    // Mock OAuth by intercepting the OAuth request
    await page.route('**/auth/callback*', async route => {
      // Mock successful OAuth callback
      await route.fulfill({
        status: 302,
        headers: {
          Location: 'http://localhost:3000/auth/onboarding',
        },
      });
    });

    // Click TikTok OAuth button
    await page.click('button:has-text("Continue with TikTok")');

    // Verify loading state
    await expect(page.locator('text=Connecting...')).toBeVisible();

    // In a real test, we'd mock the OAuth provider redirect
    // For now, navigate directly to onboarding (simulating successful OAuth)
    await page.goto('http://localhost:3000/auth/onboarding');

    // Verify onboarding page loaded
    await expect(page.locator('h1:has-text("Choose Your Role")')).toBeVisible();
  });

  test('Should handle Instagram OAuth flow (mocked)', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login');

    // Mock OAuth callback
    await page.route('**/auth/callback*', async route => {
      await route.fulfill({
        status: 302,
        headers: {
          Location: 'http://localhost:3000/auth/onboarding',
        },
      });
    });

    // Click Instagram OAuth button
    await page.click('button:has-text("Continue with Instagram")');

    // Verify loading state
    await expect(page.locator('text=Connecting...')).toBeVisible();

    // Navigate to onboarding (simulating successful OAuth)
    await page.goto('http://localhost:3000/auth/onboarding');

    // Verify onboarding page loaded
    await expect(page.locator('h1:has-text("Choose Your Role")')).toBeVisible();
  });

  test('Should handle onboarding role selection - Creator', async ({
    page,
  }) => {
    // Navigate directly to onboarding (simulating successful OAuth)
    await page.goto('http://localhost:3000/auth/onboarding');

    // Verify onboarding page elements
    await expect(page.locator('h1:has-text("Choose Your Role")')).toBeVisible();
    await expect(
      page.locator('text=Select your role to get started')
    ).toBeVisible();

    // Verify role options exist
    const creatorOption = page.locator('input[value="creator"]');
    const promoterOption = page.locator('input[value="promoter"]');

    await expect(creatorOption).toBeVisible();
    await expect(promoterOption).toBeVisible();

    // Select creator role
    await creatorOption.click();

    // Verify role selection UI feedback
    await expect(page.locator('label:has(input[value="creator"])')).toHaveClass(
      /border-primary/
    );

    // Submit role selection
    const submitButton = page.locator('button:has-text("Complete Setup")');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Verify redirect to creator dashboard
    await page.waitForURL('**/creator');
    await expect(
      page.locator('h1:has-text("Creator Dashboard")')
    ).toBeVisible();
  });

  test('Should handle onboarding role selection - Promoter', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/auth/onboarding');

    // Select promoter role
    await page.click('input[value="promoter"]');

    // Verify role selection UI feedback
    await expect(
      page.locator('label:has(input[value="promoter"])')
    ).toHaveClass(/border-primary/);

    // Submit role selection
    await page.click('button:has-text("Complete Setup")');

    // Verify redirect to promoter dashboard
    await page.waitForURL('**/promoter');
    await expect(
      page.locator('h1:has-text("Promoter Dashboard")')
    ).toBeVisible();
  });

  test('Should validate role selection requirement', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/onboarding');

    // Try to submit without selecting a role
    const submitButton = page.locator('button:has-text("Complete Setup")');
    await expect(submitButton).toBeDisabled();

    // Select a role to enable submit
    await page.click('input[value="creator"]');
    await expect(submitButton).toBeEnabled();
  });

  test('Should handle error states gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login?error=oauth_error');

    // Verify error message is displayed
    await expect(page.locator('.alert-destructive, .toast')).toBeVisible();

    // Verify user can still attempt login
    await expect(
      page.locator('button:has-text("Continue with TikTok")')
    ).toBeEnabled();
    await expect(
      page.locator('button:has-text("Continue with Instagram")')
    ).toBeEnabled();
  });

  test('Should provide back navigation options', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login');

    // Verify back to website link exists
    const backLink = page.locator('a:has-text("Back to Website")');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', 'https://www.domain.com');

    // Test onboarding back navigation
    await page.goto('http://localhost:3000/auth/onboarding');

    const backToLogin = page.locator('a:has-text("Back to Login")');
    await expect(backToLogin).toBeVisible();
    await expect(backToLogin).toHaveAttribute('href', '/login');
  });
});
