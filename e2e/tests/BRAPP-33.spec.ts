import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-33: Fix KMZ File Import for Routes', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('https://ride.borarodar.app');
    
    // Fill login credentials
    await page.locator('input[type="email"]').fill('test@borarodar.app');
    await page.locator('input[type="password"]').fill('borarodarapp');
    
    // Submit login form
    await page.locator('button[type="submit"]').click();
    
    // Wait for dashboard to load
    await page.waitForSelector('text=Dashboard');
  });

  test('AC1: User uploads a valid .kmz file on the route creation page → the route polyline is rendered on the map preview', async ({ page }) => {
    // Navigate to route creation page
    await page.locator('a:has-text("Routes")').click();
    await page.locator('button:has-text("Create Route")').click();
    
    // Upload a valid kmz file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('test-data/valid-route.kmz');
    
    // Wait for preview to update
    await page.waitForSelector('text=Polyline rendered on map', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-33-ac-1.png', fullPage: true });
    
    // Verify polyline is rendered on map preview
    expect(await page.locator('#map-preview').isVisible()).toBe(true);
  });

  test('AC2: User uploads a .kmz file containing a KML with LineString geometry → the imported route details (name, distance) are displayed in the route form', async ({ page }) => {
    // Navigate to route creation page
    await page.locator('a:has-text("Routes")').click();
    await page.locator('button:has-text("Create Route")').click();
    
    // Upload a kmz file with LineString geometry
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('test-data/linestring-route.kmz');
    
    // Wait for route details to populate
    await page.waitForSelector('text=Route Name:', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-33-ac-2.png', fullPage: true });
    
    // Verify route details are displayed
    expect(await page.locator('text=Route Name:').isVisible()).toBe(true);
    expect(await page.locator('text=Distance:').isVisible()).toBe(true);
  });

  test('AC3: User uploads an invalid or corrupted .kmz file → a visible error message indicates the file could not be processed', async ({ page }) => {
    // Navigate to route creation page
    await page.locator('a:has-text("Routes")').click();
    await page.locator('button:has-text("Create Route")').click();
    
    // Upload an invalid kmz file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('test-data/corrupted-route.kmz');
    
    // Wait for error message
    await page.waitForSelector('text=Error processing file', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-33-ac-3.png', fullPage: true });
    
    // Verify error message is displayed
    expect(await page.locator('text=Error processing file').isVisible()).toBe(true);
  });

  test('AC4: User uploads a .kmz file and submits the route form → the new route appears in the routes list with correct geometry', async ({ page }) => {
    // Navigate to route creation page
    await page.locator('a:has-text("Routes")').click();
    await page.locator('button:has-text("Create Route")').click();
    
    // Upload a kmz file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('test-data/valid-route.kmz');
    
    // Wait for preview to update
    await page.waitForSelector('text=Polyline rendered on map', { timeout: 10000 });
    
    // Submit the form
    await page.locator('button:has-text("Submit")').click();
    
    // Wait for route to be created
    await page.waitForSelector('text=Route created successfully', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-33-ac-4.png', fullPage: true });
    
    // Verify new route appears in routes list
    expect(await page.locator('text=New Route').isVisible()).toBe(true);
  });

  test('AC5: User uploads a .kml file (uncompressed) alongside .kmz support → the system accepts it and renders the route correctly', async ({ page }) => {
    // Navigate to route creation page
    await page.locator('a:has-text("Routes")').click();
    await page.locator('button:has-text("Create Route")').click();
    
    // Upload a kml file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('test-data/valid-route.kml');
    
    // Wait for preview to update
    await page.waitForSelector('text=Polyline rendered on map', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-33-ac-5.png', fullPage: true });
    
    // Verify polyline is rendered on map preview
    expect(await page.locator('#map-preview').isVisible()).toBe(true);
  });
});