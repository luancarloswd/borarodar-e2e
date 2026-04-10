import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-33: Fix KMZ File Import for Routes', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://ride.borarodar.app');
    
    // Login flow
    await page.fill('input[name="email"], input[type="email"]', 'test@borarodar.app');
    await page.fill('input[name="password"], input[type="password"]', 'borodaraapp');
    await page.click('button[type="submit"], button:has-text("Login")');

    // Wait for dashboard/home to load
    await page.waitForLoadState('networkidle');
  });

  test('User uploads a valid KMZ file for a new route → a new route entry appears in the routes list.', async ({ page }) => {
    // Navigate to route creation page - more robust selector
    await page.click('a:has-text("Create Route"), a[href="/routes/create"], button:has-text("Create Route")');
    
    // 1. Upload KMZ file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('.upload-button, [data-test="upload-button"]'); 
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/valid.kmz');
    
    // Wait for route list to load or update
    await page.waitForSelector('.route-list-item, .route-entry, [data-test="route-item"]', { timeout: 15000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-33-ac-1.png', fullPage: true });
    
    // Assertion to check new route appears
    await expect(page.locator('.route-list-item, .route-entry, [data-test="route-item"]')).toBeVisible();
  });

  test('User attempts to upload a non-KMZ file type (e.g., .txt, .zip without KML) → an error message indicating an invalid file type is displayed.', async ({ page }) => {
    // Navigate to route creation page
    await page.click('a:has-text("Create Route"), a[href="/routes/create"], button:has-text("Create Route")'); 
    
    // Trigger upload of invalid file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('.upload-button, [data-test="upload-button"]'); 
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/invalid.txt');

    const errorMsg = page.locator('.error-message, .alert, [data-test="error-message"]');
    await expect(errorMsg).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/BRAPP-33-ac-2.png', fullPage: true });
  });

  test('User uploads a KMZ file containing invalid or malformed KML data → an error message indicating KMZ processing failure is displayed.', async ({ page }) => {
    // Navigate to route creation page
    await page.click('a:has-text("Create Route"), a[href="/routes/create"], button:has-text("Create Route")'); 
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('.upload-button, [data-test="upload-button"]'); 
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/malformed.kmz');

    const errorMsg = page.locator('.error-message, .alert, [data-test="error-message"]');
    await expect(errorMsg).toBeVisible();

    await page.screenshot({ path: 'screenshots/BRAPP-33-ac-3.png', fullPage: true });
  });

  test('User navigates to the details of a successfully imported KMZ route → the route\'s path is correctly displayed on the map.', async ({ page }) => {
    // Navigate to a known route detail page
    await page.click('a:has-text("Route Details"), a[href="/routes/1"], [data-test="route-detail-link"]'); 
    
    // Check if map contains path elements
    await page.waitForSelector('.map-container, [data-test="map-container"]');
    const pathVisible = await page.locator('.map-path-layer, [data-test="map-path-layer"]').isVisible();
    expect(pathVisible).toBe(true);

    await page.screenshot({ path: 'screenshots/BRAPP-33-ac-4.png', fullPage: true });
  });
});
});
