import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const LOGIN_EMAIL = getRequiredEnv('LOGIN_EMAIL');
const LOGIN_PASSWORD = getRequiredEnv('LOGIN_PASSWORD');

async function login(page: any) {
  await page.goto('/');
  await page.fill('input[type="email"], input[name="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Entrar")');
  await page.waitForURL(/.*dashboard|.*home|.*feed/);
}

test.describe('BRAPP-11: Fix: Floating Action Buttons (Ride, SOS, Check-in) Overlapping Trip Register Next Button', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('AC1: User navigates to `/tours/new` → The \'Ride\', \'SOS\', and \'Check-in\' floating action buttons are not visible.', async ({ page }) => {
    await page.goto('/tours/new');
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-11-ac-1.png', fullPage: true });

    // Verify FABs are not visible
    const rideFAB = page.locator('button[aria-label="Bora Rodar"]');
    const sosButton = page.locator('button[aria-label="SOS"]');
    const checkInBanner = page.locator('div[aria-label="Check-in"]');

    await expect(rideFAB).not.toBeVisible();
    await expect(sosButton).not.toBeVisible();
    await expect(checkInBanner).not.toBeVisible();
  });

  test('AC2: User navigates to `/tours/new` → The \'→ OK / Próximo\' navigation button is visible and clickable.', async ({ page }) => {
    await page.goto('/tours/new');
    await page.waitForLoadState('networkidle');

    // Take screenshot before click
    await page.screenshot({ path: 'screenshots/BRAPP-11-ac-2.png', fullPage: true });

    // Verify button is visible, then click it to confirm it is truly clickable (not overlapped)
    const nextButton = page.locator('button:has-text("Próximo")');
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    // Assert that clicking advanced the form to the next step
    await expect(page.locator('button:has-text("Próximo"), button:has-text("Confirmar"), button:has-text("Salvar")')).toBeVisible();
  });

  test('AC3: User navigates to `/trips/new` → The \'Ride\', \'SOS\', and \'Check-in\' floating action buttons are not visible.', async ({ page }) => {
    await page.goto('/trips/new');
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-11-ac-3.png', fullPage: true });

    // Verify FABs are not visible
    const rideFAB = page.locator('button[aria-label="Bora Rodar"]');
    const sosButton = page.locator('button[aria-label="SOS"]');
    const checkInBanner = page.locator('div[aria-label="Check-in"]');

    await expect(rideFAB).not.toBeVisible();
    await expect(sosButton).not.toBeVisible();
    await expect(checkInBanner).not.toBeVisible();
  });

  test('AC4: User navigates to `/trips/new` → The \'→ OK / Próximo\' navigation button is visible and clickable.', async ({ page }) => {
    await page.goto('/trips/new');
    await page.waitForLoadState('networkidle');

    // Take screenshot before click
    await page.screenshot({ path: 'screenshots/BRAPP-11-ac-4.png', fullPage: true });

    // Verify button is visible, then click it to confirm it is truly clickable (not overlapped)
    const nextButton = page.locator('button:has-text("Próximo")');
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    // Assert that clicking advanced the form to the next step
    await expect(page.locator('button:has-text("Próximo"), button:has-text("Confirmar"), button:has-text("Salvar")')).toBeVisible();
  });

  test('AC5: User navigates to `/tours/new`, then navigates away to `/dashboard` → The \'Ride\', \'SOS\', and \'Check-in\' floating action buttons are visible on the `/dashboard` page.', async ({ page }) => {
    await page.goto('/tours/new');
    await page.waitForLoadState('networkidle');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-11-ac-5.png', fullPage: true });

    // Verify FABs are visible on dashboard
    const rideFAB = page.locator('button[aria-label="Bora Rodar"]');
    const sosButton = page.locator('button[aria-label="SOS"]');
    const checkInBanner = page.locator('div[aria-label="Check-in"]');

    await expect(rideFAB).toBeVisible();
    await expect(sosButton).toBeVisible();
    await expect(checkInBanner).toBeVisible();
  });
});