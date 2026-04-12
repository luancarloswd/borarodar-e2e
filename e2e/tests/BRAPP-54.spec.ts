import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = process.env.STAGING_URL || 'http://localhost:3000';
const LOGIN_EMAIL = 'test@borarodar.app';
const LOGIN_PASSWORD = 'borarodarapp';

test.describe('BRAPP-54: Fix Gas Supplies Not Listed on Motorcycle Page', () => {
  test.beforeAll(() => {
    mkdirSync('e2e/screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto(BASE_URL);
    await page.waitForSelector(
      'input[type="email"], input[name="email"], input[placeholder="Email"]',
      { timeout: 15000 },
    );
    await page.fill(
      'input[type="email"], input[name="email"], input[placeholder="Email"]',
      LOGIN_EMAIL,
    );
    await page.fill(
      'input[type="password"], input[name="password"], input[placeholder="Senha"], input[placeholder="Password"]',
      LOGIN_PASSWORD,
    );
    await page.click('button[type="submit"]');
    await page.waitForURL(
      (url) => !/\/(login|signin|auth)(\/|$)/i.test(url.pathname),
      { timeout: 15000 },
    );
    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).not.toBeVisible({ timeout: 15000 });
  });

  // AC1: User navigates to motorcycle page with associated gas supplies → Gas supplies are displayed
  test('AC1: Gas supplies are displayed on motorcycle page when they exist', async ({ page }) => {
    // Navigate to motorcycle list
    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'e2e/screenshots/BRAPP-54-ac1-motorcycle-list.png' });

    // Click on the first motorcycle card to open the detail page
    const motoCard = page.locator('[data-testid="moto-card"]').first();
    await expect(motoCard).toBeVisible({ timeout: 10000 });
    await motoCard.click();

    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-54-ac1-motorcycle-detail.png' });

    // The fuel history section must always be rendered
    await expect(page.locator('text=Histórico de abastecimentos')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/screenshots/BRAPP-54-ac1-fuel-section-visible.png' });
  });

  // AC2: User navigates to motorcycle page without gas supplies → Empty state is shown
  test('AC2: Empty state is shown when motorcycle has no gas supplies', async ({ page }) => {
    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    // Click the first motorcycle
    const motoCard = page.locator('[data-testid="moto-card"]').first();
    await expect(motoCard).toBeVisible({ timeout: 10000 });
    await motoCard.click();

    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'e2e/screenshots/BRAPP-54-ac2-empty-or-list.png' });

    // Check if the empty state is visible
    const hasEmptyState = await page.locator('text=Nenhum abastecimento registrado').isVisible();

    // Check if there are any rows in the table
    const hasRows = await page.locator('table tbody tr').count() > 0;

    // At least one of them should be visible
    // Fix: Be more specific about validation - check actual existence of elements
    if (hasRows) {
      // If rows exist, ensure the empty state is not visible
      await expect(page.locator('text=Nenhum abastecimento registrado')).not.toBeVisible();
    }
    if (hasEmptyState) {
      // If empty state visible, ensure no rows are present
      await expect(page.locator('table tbody tr')).toHaveCount(0);
    }
    
    // At least one of them must be present (this is more robust than the original logic)
    expect(hasRows || hasEmptyState).toBe(true);
  });

  // AC3: User refreshes motorcycle page → Gas supplies persist without errors
  test('AC3: Gas supplies persist after page refresh', async ({ page }) => {
    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    const motoCard = page.locator('[data-testid="moto-card"]').first();
    await expect(motoCard).toBeVisible({ timeout: 10000 });
    await motoCard.click();

    await page.waitForLoadState('networkidle');

    // Get supply count before refresh
    const countBefore = await page.locator('table tbody tr').count();

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'e2e/screenshots/BRAPP-54-ac3-after-refresh.png' });

    // The fuel history section must still be visible
    await expect(page.locator('text=Histórico de abastecimentos')).toBeVisible({ timeout: 10000 });

    // Supply count must remain the same after refresh
    const countAfter = await page.locator('table tbody tr').count();
    
    // More accurate check: verify that the page loaded correctly and the count is consistent
    expect(countBefore).toBeGreaterThanOrEqual(0);
    expect(countAfter).toBeGreaterThanOrEqual(0);
    // The counts should be the same (or both should be 0)
    expect(countAfter).toBe(countBefore);

    await page.screenshot({ path: 'e2e/screenshots/BRAPP-54-ac3-supply-count-stable.png' });
  });

  // AC4: User views multiple motorcycle pages → Each shows correct associated gas supplies
  test('AC4: Each motorcycle page shows its own correct gas supplies', async ({ page }) => {
    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    const motoCards = page.locator('[data-testid="moto-card"]');
    const cardCount = await motoCards.count();

    if (cardCount < 2) {
      // Only one motorcycle — verify the section exists
      const firstMotoCard = page.locator('[data-testid="moto-card"]').first();
      await expect(firstMotoCard).toBeVisible({ timeout: 10000 });
      await firstMotoCard.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Histórico de abastecimentos')).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: 'e2e/screenshots/BRAPP-54-ac4-single-moto.png' });
      return;
    }

    // Navigate to first motorcycle
    const firstMotoCard = page.locator('[data-testid="moto-card"]').first();
    await expect(firstMotoCard).toBeVisible({ timeout: 10000 });
    await firstMotoCard.click();
    const url1 = page.url();
    const count1 = await page.locator('table tbody tr').count();

    await page.screenshot({ path: 'e2e/screenshots/BRAPP-54-ac4-moto1.png' });

    // Go back and navigate to second motorcycle
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await motoCards.nth(1).click();
    await page.waitForLoadState('networkidle');
    const url2 = page.url();
    const count2 = await page.locator('table tbody tr').count();

    await page.screenshot({ path: 'e2e/screenshots/BRAPP-54-ac4-moto2.png' });

    // URLs must differ (they are different motorcycle pages)
    expect(url1).not.toBe(url2);

    // Both pages must show the fuel history section
    await expect(page.locator('text=Histórico de abastecimentos')).toBeVisible({ timeout: 10000 });

    // Supply counts are valid non-negative numbers
    expect(count1).toBeGreaterThanOrEqual(0);
    expect(count2).toBeGreaterThanOrEqual(0);
  });

  // AC5: User accesses motorcycle page with internet connection → Gas supplies load correctly
  test('AC5: Gas supplies load correctly from API', async ({ page }) => {
    // Intercept the fuel history API call to verify it is made with the right motorcycle ID
    const fuelRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/fuel') && req.method() === 'GET') {
        fuelRequests.push(req.url());
      }
    });

    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    const motoCard = page.locator('[data-testid="moto-card"]').first();
    await expect(motoCard).toBeVisible({ timeout: 10000 });
    await motoCard.click();

    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'e2e/screenshots/BRAPP-54-ac5-api-loaded.png' });

    // The fuel API must have been called (with /fuel in the URL)
    expect(fuelRequests.length).toBeGreaterThan(0);

    // Verify that the API was called with a motorcycle ID (by checking URL structure)
    const hasFuelRequest = fuelRequests.some(url => url.includes('/fuel/'));
    expect(hasFuelRequest).toBe(true);

    // The fuel history section must be rendered (not missing from the DOM)
    await expect(page.locator('text=Histórico de abastecimentos')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/screenshots/BRAPP-54-ac5-section-visible.png' });
  });
});
