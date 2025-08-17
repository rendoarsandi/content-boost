import { test, expect } from '@playwright/test';

/**
 * End-to-End Test for Landing Page
 *
 * This test covers the landing page functionality:
 * 1. Page loading and layout
 * 2. Navigation elements
 * 3. Hero section
 * 4. Feature sections
 * 5. CTA buttons and links
 * 6. Footer navigation
 * 7. Responsive design elements
 */

test.describe('Landing Page E2E Test', () => {
  test('Should load landing page correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Verify page loads and has correct title
    await expect(page).toHaveTitle(/ContentBoost/);

    // Verify main navigation header
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('a:has-text("ContentBoost")')).toBeVisible();

    // Verify navigation buttons
    await expect(page.locator('a:has-text("Masuk")')).toBeVisible();
    await expect(page.locator('a:has-text("Daftar Sekarang")')).toBeVisible();
  });

  test('Should display hero section correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Verify hero section elements
    await expect(page.locator('h1')).toContainText(
      'Tingkatkan Engagement Konten Anda'
    );
    await expect(
      page.locator('text=Platform Promosi Generasi Berikutnya')
    ).toBeVisible();
    await expect(page.locator('h1').getByText('Sistem Pay-Per-View')).toBeVisible();

    // Verify hero description
    await expect(
      page.locator('text=Platform promosi konten kreator')
    ).toBeVisible();
    await expect(page.locator('text=deteksi bot otomatis')).toBeVisible();

    // Verify hero CTA buttons
    await expect(
      page.locator('a:has-text("Mulai Sebagai Creator")')
    ).toBeVisible();
    await expect(
      page.locator('a:has-text("Bergabung Sebagai Promoter")')
    ).toBeVisible();
  });

  test('Should display creator features section', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Verify creator section
    await expect(
      page.locator('h2:has-text("Untuk Content Creators")')
    ).toBeVisible();
    await expect(
      page.locator('text=Tingkatkan reach dan engagement')
    ).toBeVisible();

    // Verify creator feature cards
    await expect(page.locator('text=Campaign Management')).toBeVisible();
    await expect(page.locator('text=Bot Detection')).toBeVisible();
    await expect(page.locator('text=Real-time Analytics')).toBeVisible();

    // Verify feature descriptions
    await expect(page.locator('text=budget dan rate per view')).toBeVisible();
    await expect(page.locator('text=views yang legitimate')).toBeVisible();
    await expect(page.locator('p').getByText('TikTok dan Instagram').first()).toBeVisible();
  });

  test('Should display promoter features section', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Verify promoter section
    await expect(page.locator('h2:has-text("Untuk Promoters")')).toBeVisible();
    await expect(
      page.locator('text=Hasilkan income dengan mempromosikan')
    ).toBeVisible();

    // Verify promoter feature cards
    await expect(page.locator('text=Content Editing')).toBeVisible();
    await expect(page.locator('text=Daily Payouts')).toBeVisible();
    await expect(page.locator('text=Social Integration')).toBeVisible();

    // Verify feature descriptions
    await expect(page.locator('text=edit sesuai gaya konten')).toBeVisible();
    await expect(page.locator('text=pembayaran harian otomatis')).toBeVisible();
    await expect(page.locator('text=Hubungkan akun TikTok')).toBeVisible();
  });

  test('Should display call-to-action section', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Verify CTA section
    await expect(
      page.locator('h2:has-text("Siap Meningkatkan Engagement")')
    ).toBeVisible();
    await expect(
      page.locator('text=ribuan creator dan promoter')
    ).toBeVisible();

    // Verify CTA button
    const ctaButton = page.locator('a:has-text("Mulai Sekarang Gratis")');
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toHaveAttribute('href', 'https://auth.domain.com');
  });

  test('Should display footer correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Verify footer sections
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('h3:has-text("ContentBoost")')).toBeVisible();
    await expect(
      page.locator('footer').getByText('Platform promosi konten kreator')
    ).toBeVisible();

    // Verify footer navigation sections
    await expect(page.locator('h4:has-text("Product")')).toBeVisible();
    await expect(page.locator('h4:has-text("Company")')).toBeVisible();
    await expect(page.locator('h4:has-text("Support")')).toBeVisible();

    // Verify footer links
    await expect(page.locator('a:has-text("Features")')).toBeVisible();
    await expect(page.locator('a:has-text("Pricing")')).toBeVisible();
    await expect(page.locator('a:has-text("About Us")')).toBeVisible();
    await expect(page.locator('a:has-text("Help Center")')).toBeVisible();

    // Verify copyright
    await expect(page.locator('text=© 2025 ContentBoost')).toBeVisible();
  });

  test('Should handle CTA button clicks correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Test hero CTA buttons
    const creatorButton = page
      .locator('a:has-text("Mulai Sebagai Creator")')
      .first();
    await expect(creatorButton).toHaveAttribute(
      'href',
      'https://auth.domain.com'
    );

    const promoterButton = page
      .locator('a:has-text("Bergabung Sebagai Promoter")')
      .first();
    await expect(promoterButton).toHaveAttribute(
      'href',
      'https://auth.domain.com'
    );

    // Test main CTA button
    const mainCTA = page.locator('a:has-text("Mulai Sekarang Gratis")');
    await expect(mainCTA).toHaveAttribute('href', 'https://auth.domain.com');
  });

  test('Should handle navigation clicks correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Test header navigation
    const loginButton = page.locator('a:has-text("Masuk")').first();
    await expect(loginButton).toHaveAttribute(
      'href',
      'https://auth.domain.com'
    );

    const signupButton = page.locator('a:has-text("Daftar Sekarang")').first();
    await expect(signupButton).toHaveAttribute(
      'href',
      'https://auth.domain.com'
    );

    // Test footer navigation (internal links)
    const featuresLink = page.locator('a:has-text("Features")');
    await expect(featuresLink).toHaveAttribute('href', '#features');

    const pricingLink = page.locator('a:has-text("Pricing")');
    await expect(pricingLink).toHaveAttribute('href', '#pricing');
  });

  test('Should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');

    // Verify mobile layout
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();

    // Verify mobile-specific layouts
    const heroButtons = page.locator(
      'a:has-text("Mulai Sebagai Creator"), a:has-text("Bergabung Sebagai Promoter")'
    );
    await expect(heroButtons).toHaveCount(2);

    // Verify feature cards stack on mobile
    const featureCards = page.locator('.card, [class*="card"]');
    for (let i = 0; i < (await featureCards.count()); i++) {
      await expect(featureCards.nth(i)).toBeVisible();
    }
  });

  test('Should be responsive on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000');

    // Verify tablet layout
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();

    // Verify content is properly displayed in tablet view
    await expect(
      page.locator('h2:has-text("Untuk Content Creators")')
    ).toBeVisible();
    await expect(page.locator('h2:has-text("Untuk Promoters")')).toBeVisible();
  });

  test('Should handle page navigation and anchors', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Test anchor navigation (if features section has ID)
    const featuresLink = page.locator('a[href="#features"]');
    if (await featuresLink.isVisible()) {
      await featuresLink.click();

      // Verify scroll to features section
      const featuresSection = page.locator(
        '#features, section:has(h2:has-text("Untuk Content Creators"))'
      );
      await expect(featuresSection).toBeInViewport();
    }
  });

  test('Should load all images and assets correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Check for any broken images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const src = await img.getAttribute('src');
      if (src) {
        // Verify image loads (basic check)
        await expect(img).toBeVisible();
      }
    }

    // Verify icons are loaded (Lucide icons)
    const svgCount = await page.locator('svg').count();
    expect(svgCount).toBeGreaterThan(0);
  });

  test('Should have proper SEO elements', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Check meta tags and SEO elements
    await expect(page).toHaveTitle(/ContentBoost/);

    // Verify heading hierarchy
    await expect(page.locator('h1')).toHaveCount(1);
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThan(0);

    // Verify proper heading structure
    const h1 = page.locator('h1').first();
    await expect(h1).toContainText('Tingkatkan Engagement');
  });
});
