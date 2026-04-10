import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-30: AI Feature Daily Interaction Limit per User', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://ride.borarodar.app');
    // Look for login form — email + password fields, submit button
    await page.fill('input[name="email"], input[type="email"]', 'test@borarodar.app');
    await page.fill('input[name="password"], input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    // Wait for dashboard/home to load
    await page.waitForURL('**/dashboard'); 
  });

  test('AC1: User attempts to scan a fuel receipt for the 11th time in a UTC day (with default limits) → A blocking modal appears, displaying a message that the daily limit for Fuel OCR has been reached and showing the reset time for interactions.', async ({ page }) => {
    // Note: Since we cannot actually perform 11 real API calls in a single E2E test without server manipulation,
    // This test follows the logic of the acceptance criterion. 
    // In a real E2E environment, we would intercept the API to return 429.
    
    await page.route('**/api/fuel/scan', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'AI_LIMIT_EXCECTED',
          feature: 'ocr',
          limit: 10,
          used: 10,
          resetAt: new Date().toISOString()
        })
      });
    });

    // Trigger the action that leads to the 429 (e.g., clicking a scan button)
    await page.click('button#trigger-fuel-scan'); 
    
    // Verify modal appearance
    const modal = page.locator('.ai-limit-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('daily limit for Fuel OCR has been reached');
    
    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-1.png', fullPage: true });
  });

  test('AC2: User successfully scans fuel receipts, reaching a point that 3 or fewer interactions remain for the day → A non-blocking banner appears at the top of the screen, warning the user about the low number of remaining daily AI interactions.', async ({ page }) => {
    // Intercept API to simulate 3 remaining
    await page.route('**/api/fuel/scan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
        headers: {
          'X-AI-Limit': '10',
          'X-AI-Remaining': '3',
          'X-AI-Reset': new Date().toISOString()
        }
      });
    });

    await page.click('button#trigger-fuel-scan');

    // Verify banner appearance
    const banner = page.locator('.ai-limit-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('low number of remaining daily AI interactions');

    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-2.png', fullPage: true });
  });

  test('AC3: User, after previously reaching the daily limit for Fuel OCR, attempts to scan a fuel receipt after the UTC midnight reset → The Fuel OCR scan completes successfully, and the displayed remaining interactions for Fuel OCR are reset to the full daily limit.', async ({ page }) => {
    // Simulate a successful scan after reset
    await page.route('**/api/fuel/scan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
        headers: {
          'X-AI-Limit': '10',
          'X-AI-Remaining': '10',
          'X-AI-Reset': new Date().toISOString()
        }
      });
    });

    await page.click('button#trigger-fuel-scan');

    // Verify success and reset limit display
    const banner = page.locator('.ai-limit-banner');
    await expect(banner).not.toBeVisible();
    
    // Checking for the presence of the 10/10 indicator if it exists in the UI
    await expect(page.locator('text=10/10')).toBeVisible();

    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-3.png', fullPage: true });
  });
});
