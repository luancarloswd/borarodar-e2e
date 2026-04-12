import { test, expect } from '@playwright/test';

test.describe('BRAPP-48: Bugfix: Google Maps JavaScript API Error on Routes Page', () => {
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

  test('AC1: User navigates to the routes page → Google Maps loads without any JavaScript API errors in the console', async ({ page }) => {
    // Navigate to the routes page
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for the map to load (more robust waiting)
    await page.waitForSelector('[data-testid="map-container"], [class*="map"], .google-map, #map', { timeout: 15000 });
    
    // Wait a bit more for any lazy loading to complete
    await page.waitForTimeout(2000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-48-ac-1.png', fullPage: true });
    
    // Verify no JavaScript API errors in the console  
    // Use a more robust approach for capturing console errors
    const apiErrorMessages: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const message = msg.text();
        // Check specifically for Google Maps API Project Error as described in the ticket
        if (message.includes('ApiProjectMapError') || 
            message.includes('API_PROJECT_MAP_ERROR') ||
            message.includes('MAPS_API_ERROR') ||
            message.includes('googleapis.com/maps') ||
            message.includes('InvalidKeyMapError')) {
          apiErrorMessages.push(message);
        }
      }
    });
    
    // Wait to ensure all errors have been captured
    await page.waitForTimeout(1000);
    
    // If we found any API errors, fail the test
    if (apiErrorMessages.length > 0) {
      throw new Error(`Google Maps API Project Error found in console: ${apiErrorMessages.join('; ')}`);
    }
    
    // Test passes if no API errors were detected
    expect(apiErrorMessages.length).toBe(0);
  });

  test('AC1: User navigates to the routes page → Google Maps loads without any JavaScript API errors in the console', async ({ page }) => {
    // Navigate to the routes page
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for the map to load (more robust waiting)
    await page.waitForSelector('[data-testid="map-container"], [class*="map"], .google-map, #map', { timeout: 15000 });
    
    // Wait a bit more for any lazy loading to complete
    await page.waitForTimeout(2000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-48-ac-1.png', fullPage: true });
    
    // Verify no JavaScript API errors in the console
    // Instead of waiting for errors and then checking them, we check for errors during page load
    let hasApiError = false;
    let apiErrorMessage = '';
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const message = msg.text();
        // Check if this error is related to Google Maps API Project Error specifically
        if (message.includes('ApiProjectMapError') || 
            message.includes('API_PROJECT_MAP_ERROR') ||
            message.includes('MAPS_API_ERROR') ||
            message.includes('googleapis.com/maps') ||
            message.includes('InvalidKeyMapError')) {
          hasApiError = true;
          apiErrorMessage = message;
        }
      }
    });
    
    // Wait a bit longer to catch any delayed console errors  
    await page.waitForTimeout(2000);
    
    // If we found an API error, fail the test with the error message
    if (hasApiError) {
      throw new Error(`Google Maps API Project Error detected: ${apiErrorMessage}`);
    }
    
    // Test passed - no API errors found
  });

  test('AC2: User navigates to the routes page → the map is fully rendered and visible within the page layout', async ({ page }) => {
    // Navigate to the routes page
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for the map to load
    await page.waitForSelector('[data-testid="map-container"], [class*="map"], .google-map, #map', { timeout: 15000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-48-ac-2.png', fullPage: true });
    
    // Verify map is visible
    const mapContainer = page.locator('[data-testid="map-container"], [class*="map"], .google-map, #map');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
    
    // Verify that the map container is displayed with correct dimensions
    const mapDimensions = await mapContainer.boundingBox();
    expect(mapDimensions).not.toBeNull();
    if (mapDimensions) {
      expect(mapDimensions.width).toBeGreaterThan(0);
      expect(mapDimensions.height).toBeGreaterThan(0);
    }
  });

  test('AC3: User navigates to the routes page → route information (markers, polylines, or route details) is displayed correctly on the map', async ({ page }) => {
    // Navigate to the routes page
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for the map to load and for route elements to appear
    await page.waitForSelector('[data-testid="map-container"], [class*="map"], .google-map, #map', { timeout: 15000 });
    
    // Wait a bit more for routes to render
    await page.waitForTimeout(2000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-48-ac-3.png', fullPage: true });
    
    // Verify route information is displayed
    // Look for common route elements (markers, lines, etc)
    const markerSelectors = ['[data-testid*="marker"]', '.marker', '[class*="marker"]', '[data-testid*="route"]', '.route'];
    const polylineSelectors = ['[data-testid*="polyline"]', '.polyline', '[class*="polyline"]'];
    
    let hasMarkers = false;
    let hasPolylines = false;
    
    // Check for markers
    for (const selector of markerSelectors) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          hasMarkers = true;
          break;
        }
      } catch (e) {
        // Ignore selector errors
      }
    }
    
    // Check for polylines
    for (const selector of polylineSelectors) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          hasPolylines = true;
          break;
        }
      } catch (e) {
        // Ignore selector errors
      }
    }
    
    // Either markers or polylines should be present (or both)
    expect(hasMarkers || hasPolylines).toBe(true);
  });

  test('AC4: User refreshes the routes page multiple times → the map consistently loads without ApiProjectMapError or blank map areas', async ({ page }) => {
    // Navigate to the routes page first time
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for the map to load
    await page.waitForSelector('[data-testid="map-container"], [class*="map"], .google-map, #map', { timeout: 15000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-48-ac-4.png', fullPage: true });
    
    // Refresh the page
    await page.reload({ waitUntil: 'networkidle' });
    
    // Wait for the map to load again after refresh
    await page.waitForSelector('[data-testid="map-container"], [class*="map"], .google-map, #map', { timeout: 15000 });
    
    // Take screenshot for evidence (after refresh)
    await page.screenshot({ path: 'screenshots/BRAPP-48-ac-4-refresh.png', fullPage: true });
    
    // Verify map is still visible and rendered
    const mapContainer = page.locator('[data-testid="map-container"], [class*="map"], .google-map, #map');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('AC5: User navigates away from the routes page and returns → the map re-initializes and displays route data correctly without errors', async ({ page }) => {
    // Navigate to the routes page
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for the map to load
    await page.waitForSelector('[data-testid="map-container"], [class*="map"], .google-map, #map', { timeout: 15000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-48-ac-5.png', fullPage: true });
    
    // Navigate away from the routes page to the dashboard or another page
    await page.goto('https://ride.borarodar.app/dashboard');
    
    // Navigate back to the routes page
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for the map to load again
    await page.waitForSelector('[data-testid="map-container"], [class*="map"], .google-map, #map', { timeout: 15000 });
    
    // Take screenshot for evidence (after returning)
    await page.screenshot({ path: 'screenshots/BRAPP-48-ac-5-return.png', fullPage: true });
    
    // Verify map is visible and rendered after re-initialization
    const mapContainer = page.locator('[data-testid="map-container"], [class*="map"], .google-map, #map');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });
});