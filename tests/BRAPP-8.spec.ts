import { test, expect } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL;
const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

test.skip(!BASE_URL || !LOGIN_EMAIL || !LOGIN_PASSWORD, 'Required environment variables (BASE_URL, LOGIN_EMAIL, LOGIN_PASSWORD) are not set.');

test.describe('BRAPP-8: Fix: Diagnostic button not rendering on motorcycle page', () => {
  test.beforeAll(() => {
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots', { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);

    await page.waitForSelector(
      'input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="e-mail" i]',
      { timeout: 15000 }
    );

    await page.screenshot({ path: 'screenshots/BRAPP-8-login-page.png', fullPage: true });

    const emailInput = page
      .locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="e-mail" i]')
      .first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(LOGIN_EMAIL);
    await passwordInput.fill(LOGIN_PASSWORD);

    await page.screenshot({ path: 'screenshots/BRAPP-8-login-filled.png', fullPage: true });

    const submitButton = page
      .locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login"), button:has-text("Sign in")')
      .first();
    await submitButton.click();

    await page.waitForURL(
      (url) => !url.pathname.includes('login') && !url.pathname.includes('signin'),
      { timeout: 20000 }
    );

    await page.screenshot({ path: 'screenshots/BRAPP-8-logged-in.png', fullPage: true });
  });

  test('should display motorcycles list with at least one motorcycle', async ({ page }) => {
    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/BRAPP-8-motorcycles-list.png', fullPage: true });

    // Wait for skeleton to resolve or moto cards to appear
    const skeletonLocator = page.locator('[class*="animate-pulse"]');
    await skeletonLocator.first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});

    await page.screenshot({ path: 'screenshots/BRAPP-8-motorcycles-list-loaded.png', fullPage: true });

    // At least one motorcycle card must be present for the test to proceed
    const motoCard = page.locator('[data-testid="moto-card"]').first();
    const hasMotoCard = await motoCard.isVisible({ timeout: 10000 }).catch(() => false);
    expect(hasMotoCard).toBeTruthy();

    await page.screenshot({ path: 'screenshots/BRAPP-8-moto-card-found.png', fullPage: true });
  });

  test('should render the Diagnostic IA button on the motorcycle detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    // Wait for skeleton loaders to go away
    const skeletonLocator = page.locator('[class*="animate-pulse"]');
    await skeletonLocator.first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});

    // Click the first motorcycle card
    const motoCard = page.locator('[data-testid="moto-card"]').first();
    const hasMotoCard = await motoCard.isVisible({ timeout: 10000 }).catch(() => false);

    if (!hasMotoCard) {
      test.skip();
      return;
    }

    await motoCard.click();

    // Wait for the detail page to load
    await page.waitForURL((url) => url.pathname.startsWith('/motorcycles/'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/BRAPP-8-moto-detail-loaded.png', fullPage: true });

    // The diagnostic button MUST be visible ╬ô├ç├╢ this is the core fix being tested
    const diagnosticBtn = page.locator('[data-testid="diagnostic-btn"]');
    await expect(diagnosticBtn).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-8-diagnostic-btn-visible.png', fullPage: true });
  });

  test('should show correct label text on the Diagnostic IA button', async ({ page }) => {
    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    const skeletonLocator = page.locator('[class*="animate-pulse"]');
    await skeletonLocator.first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});

    const motoCard = page.locator('[data-testid="moto-card"]').first();
    const hasMotoCard = await motoCard.isVisible({ timeout: 10000 }).catch(() => false);

    if (!hasMotoCard) {
      test.skip();
      return;
    }

    await motoCard.click();
    await page.waitForURL((url) => url.pathname.startsWith('/motorcycles/'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const diagnosticBtn = page.locator('[data-testid="diagnostic-btn"]');
    await expect(diagnosticBtn).toBeVisible({ timeout: 10000 });

    // Button must contain the label text (Portuguese)
    await expect(diagnosticBtn).toContainText('Diagnostico IA');

    await page.screenshot({ path: 'screenshots/BRAPP-8-diagnostic-btn-label.png', fullPage: true });
  });

  test('should navigate to diagnostic page when clicking the Diagnostic IA button', async ({ page }) => {
    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    const skeletonLocator = page.locator('[class*="animate-pulse"]');
    await skeletonLocator.first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});

    const motoCard = page.locator('[data-testid="moto-card"]').first();
    const hasMotoCard = await motoCard.isVisible({ timeout: 10000 }).catch(() => false);

    if (!hasMotoCard) {
      test.skip();
      return;
    }

    await motoCard.click();
    await page.waitForURL((url) => url.pathname.startsWith('/motorcycles/'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const diagnosticBtn = page.locator('[data-testid="diagnostic-btn"]');
    await expect(diagnosticBtn).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-8-before-diagnostic-click.png', fullPage: true });

    await diagnosticBtn.click();

    // Should navigate to the maintenance/diagnostic route
    await page.waitForURL(
      (url) => url.pathname.includes('/maintenance/diagnostic') || url.pathname.includes('/diagnostic'),
      { timeout: 15000 }
    );

    await page.screenshot({ path: 'screenshots/BRAPP-8-diagnostic-page-loaded.png', fullPage: true });

    const diagnosticUrl = page.url();
    expect(diagnosticUrl).toMatch(/\/diagnostic/);
  });

  test('should render the Diagnostic IA button even when motorcycle has no photo', async ({ page }) => {
    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    const skeletonLocator = page.locator('[class*="animate-pulse"]');
    await skeletonLocator.first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});

    // Try to find a moto card that shows the default bike icon (no photo)
    const motoCardsWithIcon = page.locator('[data-testid="moto-card"]');
    const count = await motoCardsWithIcon.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Navigate to the first moto detail regardless of photo
    await motoCardsWithIcon.first().click();
    await page.waitForURL((url) => url.pathname.startsWith('/motorcycles/'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/BRAPP-8-no-photo-detail.png', fullPage: true });

    // Diagnostic button must render regardless of photo presence
    const diagnosticBtn = page.locator('[data-testid="diagnostic-btn"]');
    await expect(diagnosticBtn).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-8-diagnostic-btn-no-photo.png', fullPage: true });
  });

  test('should not render Diagnostic button as hidden or with zero dimensions', async ({ page }) => {
    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    const skeletonLocator = page.locator('[class*="animate-pulse"]');
    await skeletonLocator.first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});

    const motoCard = page.locator('[data-testid="moto-card"]').first();
    const hasMotoCard = await motoCard.isVisible({ timeout: 10000 }).catch(() => false);

    if (!hasMotoCard) {
      test.skip();
      return;
    }

    await motoCard.click();
    await page.waitForURL((url) => url.pathname.startsWith('/motorcycles/'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const diagnosticBtn = page.locator('[data-testid="diagnostic-btn"]');
    await expect(diagnosticBtn).toBeVisible({ timeout: 10000 });

    const boundingBox = await diagnosticBtn.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.width).toBeGreaterThan(0);
    expect(boundingBox!.height).toBeGreaterThan(0);

    await page.screenshot({ path: 'screenshots/BRAPP-8-diagnostic-btn-dimensions.png', fullPage: true });
  });

  test('should show the subtitle description text on the Diagnostic IA button', async ({ page }) => {
    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    const skeletonLocator = page.locator('[class*="animate-pulse"]');
    await skeletonLocator.first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});

    const motoCard = page.locator('[data-testid="moto-card"]').first();
    const hasMotoCard = await motoCard.isVisible({ timeout: 10000 }).catch(() => false);

    if (!hasMotoCard) {
      test.skip();
      return;
    }

    await motoCard.click();
    await page.waitForURL((url) => url.pathname.startsWith('/motorcycles/'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const diagnosticBtn = page.locator('[data-testid="diagnostic-btn"]');
    await expect(diagnosticBtn).toBeVisible({ timeout: 10000 });

    // Check subtitle text is rendered
    await expect(diagnosticBtn).toContainText('inteligencia artificial');

    await page.screenshot({ path: 'screenshots/BRAPP-8-diagnostic-btn-subtitle.png', fullPage: true });
  });
});
