import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-38: Fix field name mismatch: latitude/longitude vs lat/lon in POST /api/destinations', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    const loginEmail = process.env.E2E_EMAIL;
    const loginPassword = process.env.E2E_PASSWORD;

    if (!loginEmail || !loginPassword) {
      throw new Error('Missing required environment variables: E2E_EMAIL and/or E2E_PASSWORD');
    }

    await page.goto('/');
    // Login flow
    await page.fill('input[name="email"], input[type="email"]', loginEmail);
    await page.fill('input[name="password"], input[type="password"]', loginPassword);
    await page.click('button[type="submit"], button:has-text("Login")');
    // Wait for dashboard/home to load
    await page.waitForURL('**/dashboard', { waitUntil: 'networkidle' });
  });

  test('AC1: User fills out the destination creation form with latitude and longitude and clicks \'Create\' → A success notification appears and the new destination is visible in the destination list', async ({ page }) => {
    const uniqueSuffix = Date.now().toString();
    const latitude = `-23.55${uniqueSuffix.slice(-2)}`;
    const longitude = `-46.63${uniqueSuffix.slice(-2)}`;

    // Create the destination needed by this test so it does not depend on other tests.
    await page.click('text=Create Destination');
    await page.fill('input[name="latitude"], input[id="latitude"]', latitude);
    await page.fill('input[name="longitude"], input[id="longitude"]', longitude);

    const createDestinationRequestPromise = page.waitForRequest((request) =>
      request.method() === 'POST' && request.url().includes('/api/destinations')
    );

    await page.click('button:has-text("Create")');

    const createDestinationRequest = await createDestinationRequestPromise;
    const payload = createDestinationRequest.postDataJSON() as Record<string, unknown>;

    expect(payload).toMatchObject({
      latitude: latitude,
      longitude: longitude,
    });
    expect(payload).not.toHaveProperty('lat');
    expect(payload).not.toHaveProperty('lon');

    // Verify success notification
    const notification = page.locator('.notification, .alert, [role="alert"]').first();
    await expect(notification).toBeVisible();
    await page.screenshot({ path: 'screenshots/BRAPP-38-ac-1.png', fullPage: true });

    // Verify visibility in list
    await page.click('text=Destinations');
    await expect(page.locator(`text=${latitude}`)).toBeVisible();
    await expect(page.locator(`text=${longitude}`)).toBeVisible();
    await page.screenshot({ path: 'screenshots/BRAPP-38-ac-1-verify.png', fullPage: true });
  });

  test('AC2: User submits the destination creation form → The destination is successfully added to the application without any validation error messages appearing', async ({ page }) => {
    const uniqueSuffix = Date.now().toString();
    const latitude = `-23.55${uniqueSuffix.slice(-2)}`;
    const longitude = `-46.63${uniqueSuffix.slice(-2)}`;

    await page.click('text=Create Destination');
    await page.fill('input[name="latitude"], input[id="latitude"]', latitude);
    await page.fill('input[name="longitude"], input[id="longitude"]', longitude);
    await page.click('button:has-text("Create")');

    // Ensure no error messages are visible
    const errorMessages = page.locator('.error, .validation-error, [role="alertdialog"]');
    await expect(errorMessages).not.toBeVisible();
    await page.screenshot({ path: 'screenshots/BRAPP-38-ac-2.png', fullPage: true });
  });

  test('AC3: User navigates to the details of the newly created destination → The correct latitude and longitude values are displayed in the UI', async ({ page }) => {
    const uniqueSuffix = Date.now().toString();
    const latitude = `-23.55${uniqueSuffix.slice(-2)}`;
    const longitude = `-46.63${uniqueSuffix.slice(-2)}`;

    // Create the destination needed by this test so it does not depend on other tests.
    await page.click('text=Create Destination');
    await page.fill('input[name="latitude"], input[id="latitude"]', latitude);
    await page.fill('input[name="longitude"], input[id="longitude"]', longitude);
    await page.click('button:has-text("Create")');

    // Navigate to the destination list and open the destination created by this test.
    await page.click('text=Destinations');
    await page.click(`text=${latitude}`);
    
    await expect(page.locator(`text=${latitude}`)).toBeVisible();
    await expect(page.locator(`text=${longitude}`)).toBeVisible();
    await page.screenshot({ path: 'screenshots/BRAPP-38-ac-3.png', fullPage: true });
  });
});
