import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-11: Fix: Floating Action Buttons (Ride, SOS, Check-in) Overlapping Trip Register Next Button', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[type="email"]').fill('test@borarodar.app');
    await page.locator('input[type="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    // Wait for dashboard/home to load
    await page.waitForSelector('nav');
  });

  test('AC1: User navigates to `/tours/new` → The \'Ride\', \'SOS\', and \'Check-in\' floating action buttons are not visible.', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/tours/new');
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
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
    await page.goto('https://ride.borarodar.app/tours/new');
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-11-ac-2.png', fullPage: true });
    
    // Verify navigation button is visible and clickable
    const nextButton = page.locator('button:has-text("Próximo")');
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();
  });

  test('AC3: User navigates to `/trips/new` → The \'Ride\', \'SOS\', and \'Check-in\' floating action buttons are not visible.', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/trips/new');
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
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
    await page.goto('https://ride.borarodar.app/trips/new');
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-11-ac-4.png', fullPage: true });
    
    // Verify navigation button is visible and clickable
    const nextButton = page.locator('button:has-text("Próximo")');
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();
  });

  test('AC5: User navigates to `/tours/new`, then navigates away to `/dashboard` → The \'Ride\', \'SOS\', and \'Check-in\' floating action buttons are visible on the `/dashboard` page.', async ({ page }) => {
    // Navigate to tours/new first
    await page.goto('https://ride.borarodar.app/tours/new');
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Navigate to dashboard
    await page.goto('https://ride.borarodar.app/dashboard');
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
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