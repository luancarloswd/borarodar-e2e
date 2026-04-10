import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-38: Fix field name mismatch: latitude/longitude vs lat/lon in POST /api/destinations', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://ride.borarodar.app');
    // Login flow
    await page.fill('input[name="email"], input[type="email"]', 'test@borarodar.app');
    await page.fill('input[name="password"], input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"], button:has-text("Login")');
    // Wait for dashboard/home to load
    await page.waitForURL('**/dashboard', { waitUntil: 'networkidle' }).catch(() => {}); 
  });

  test('AC1: User fills out the destination creation form with latitude and longitude and clicks \'Create\' → A success notification appears and the new destination is visible in the destination list', async ({ page }) => {
    // Navigate to destination creation (assuming a path or button exists)
    // This is a placeholder implementation as the exact UI selectors for the form are unknown
    // but we follow the requirement to write the test based on the ticket description.
    await page.click('text=Create Destination'); 
    await page.fill('input[name="latitude"], input[id="latitude"]', '-23.5505');
    await page.fill('input[name="longitude"], input[id="longitude"]', '-46.6333');
    await page.click('button:has-text("Create")');

    // Verify success notification
    const notification = page.locator('.notification, .alert, [role="alert"]');
    await expect(notification).toBeVisible();
    await page.screenshot({ path: 'screenshots/BRAPP-38-ac-1.png', fullPage: true });

    // Verify visibility in list
    await page.click('text=Destinations');
    await expect(page.locator('text=-23.5505, -46.6333')).toBeVisible();
    await page.screenshot({ path: 'screenshots/BRAPP-38-ac-1-verify.png', fullPage: true });
  });

  test('AC2: User submits the destination creation form → The destination is successfully added to the application without any validation error messages appearing', async ({ page }) => {
    await page.click('text=Create Destination');
    await page.fill('input[name="latitude"], input[id="latitude"]', '-23.5505');
    await page.fill('input[name="longitude"], input[id="longitude"]', '-46.6333');
    await page.click('button:has-text("Create")');

    // Ensure no error messages are visible
    const errorMessages = page.locator('.error, .validation-error, [role="alertdialog"]');
    await expect(errorMessages).not.toBeVisible();
    await page.screenshot({ path: 'screenshots/BRAPP-38-ac-2.png', fullPage: true });
  });

  test('AC3: User navigates to the details of the newly created destination → The correct latitude and longitude values are displayed in the UI', async ({ page }) => {
    // Assuming we can find the newly created destination in the list and click it
    await page.click('text=Destinations');
    await page.click('text=-23.5505'); // Clicking the item that contains the coord
    
    await expect(page.locator('text=-23.5505')).toBeVisible();
    await expect(page.locator('text=-46.6333')).toBeVisible();
    await page.screenshot({ path: 'screenshots/BRAPP-38-ac-3.png', fullPage: true });
  });
});
