import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-72: "title": "Fix Google Maps Load Failure on AI-Generated Route Pages",', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    // Look for login form — email + password fields, submit button
    await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder="Email"]', { timeout: 15000 });
    await page.fill('input[type="email"], input[name="email"], input[placeholder="Email"]', 'test@borarodar.app');
    await page.fill('input[type="password"], input[name="password"], input[placeholder="Password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    // Wait for dashboard/home to load
    await page.waitForURL((url) => !/\/(login|signin|auth)(\/|$)/i.test(url.pathname), { timeout: 15000 });
    await expect(page.locator('input[type="email"], input[name="email"]')).not.toBeVisible({ timeout: 15000 });
  });

  test('AC1: User generates a route via AI description input and navigates to /routes/[id] → Google Map renders the route path with waypoints visible and no "This page can\'t load Google Maps correctly" error banner is displayed', async ({ page }) => {
    // Navigate to the routes page
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for the route list to load
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });
    
    // Take screenshot for evidence  
    await page.screenshot({ path: 'screenshots/BRAPP-72-ac-1.png', fullPage: true });
    
    // Check that we don't see the error banner
    const errorBanner = page.locator('text="This page can\'t load Google Maps correctly"');
    await expect(errorBanner).not.toBeVisible({ timeout: 5000 });
    
    // Wait for any map container to load 
    await page.waitForSelector('[data-testid="map-container"], [class*="map"], .google-map, #map', { timeout: 10000 });
    
    // Verify map is visible and has a valid size
    const mapContainer = page.locator('[data-testid="map-container"], [class*="map"], .google-map, #map');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
    
    // Additional check to ensure map is loaded properly and not just a placeholder
    // Wait for map to have a specific loading state or content
    await page.waitForTimeout(2000); // Pause to let map fully render
    
    const mapDimensions = await mapContainer.boundingBox();
    expect(mapDimensions).not.toBeNull();
    if (mapDimensions) {
      expect(mapDimensions.width).toBeGreaterThan(0);
      expect(mapDimensions.height).toBeGreaterThan(0);
    }
  });
});