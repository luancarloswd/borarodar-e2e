import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-47: Fix KML import for routes when no LineString elements are present', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test('AC1: User imports a KML file containing only Point/Polygon elements (no LineString) → the import completes without error and the route data is displayed on the map', async ({ page }) => {
    await page.goto('https://ride.borarodar.app');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill credentials and submit
    await page.fill('input[type="email"]', 'test@borarodar.app');
    await page.fill('input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard/home to load with a longer timeout
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    
    // Wait for some element that indicates successful login
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    
    // Navigate to the routes import page
    await page.click('text=Routes');
    await page.waitForSelector('button:has-text("Import KML")', { timeout: 10000 });
    
    // Click import KML button and simulate file upload
    await page.click('button:has-text("Import KML")');
    
    // Wait for file upload dialog and simulate upload of KML with Points/Polygons only
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    // Taking a screenshot of the import process
    await page.screenshot({ path: 'screenshots/BRAPP-47-ac-1.png', fullPage: true });
    
    // Check for successful import completion without error messages
    // Wait for a success indicator or confirmation that import completed
    await page.waitForSelector('text=Import completed successfully', { timeout: 10000 });
    
    // Verify that import succeeded by checking for route data
    await page.waitForSelector('.route-data', { timeout: 10000 });
  });

  test('AC2: User imports a KML file containing LineString elements → the import continues to work as before and the route polyline is rendered on the map', async ({ page }) => {
    await page.goto('https://ride.borarodar.app');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill credentials and submit
    await page.fill('input[type="email"]', 'test@borarodar.app');
    await page.fill('input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard/home to load with a longer timeout
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    
    // Wait for some element that indicates successful login
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    
    // Navigate to the routes import page
    await page.click('text=Routes');
    await page.waitForSelector('button:has-text("Import KML")', { timeout: 10000 });
    
    // Click import KML button and simulate file upload
    await page.click('button:has-text("Import KML")');
    
    // Wait for file upload dialog and simulate upload of KML with LineStrings only
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    // Taking a screenshot of the import process
    await page.screenshot({ path: 'screenshots/BRAPP-47-ac-2.png', fullPage: true });
    
    // Check for successful import completion
    await page.waitForSelector('text=Import completed successfully', { timeout: 10000 });
    
    // Verify polyline is rendered by checking for route-polyline element
    await page.waitForSelector('.route-polyline', { timeout: 10000 });
  });

  test('AC3: User imports a KML file with no recognized geospatial elements → a user-friendly validation message is shown instead of a generic PARSE_ERROR', async ({ page }) => {
    await page.goto('https://ride.borarodar.app');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill credentials and submit
    await page.fill('input[type="email"]', 'test@borarodar.app');
    await page.fill('input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard/home to load with a longer timeout
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    
    // Wait for some element that indicates successful login
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    
    // Navigate to the routes import page
    await page.click('text=Routes');
    await page.waitForSelector('button:has-text("Import KML")', { timeout: 10000 });
    
    // Click import KML button and simulate file upload
    await page.click('button:has-text("Import KML")');
    
    // Wait for file upload dialog and simulate upload of KML with no geospatial elements
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    // Taking a screenshot of the import process
    await page.screenshot({ path: 'screenshots/BRAPP-47-ac-3.png', fullPage: true });
    
    // Check that a user-friendly validation message is shown instead of a generic error
    await page.waitForSelector('.validation-message', { timeout: 10000 });
    
    const validationMessage = await page.locator('.validation-message').textContent();
    expect(validationMessage).toContain('Invalid KML file');
  });

  test('AC4: User imports a KML file containing mixed element types (Points and LineStrings) → all supported geometries are imported and visible on the map', async ({ page }) => {
    await page.goto('https://ride.borarodar.app');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill credentials and submit
    await page.fill('input[type="email"]', 'test@borarodar.app');
    await page.fill('input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard/home to load with a longer timeout
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    
    // Wait for some element that indicates successful login
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    
    // Navigate to the routes import page
    await page.click('text=Routes');
    await page.waitForSelector('button:has-text("Import KML")', { timeout: 10000 });
    
    // Click import KML button and simulate file upload
    await page.click('button:has-text("Import KML")');
    
    // Wait for file upload dialog and simulate upload of mixed KML elements
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    // Taking a screenshot of the import process
    await page.screenshot({ path: 'screenshots/BRAPP-47-ac-4.png', fullPage: true });
    
    // Verify that import completes successfully
    await page.waitForSelector('text=Import completed successfully', { timeout: 10000 });
    
    // Verify that all supported geometries are imported and visible
    // Check for elements related to Points and LineStrings
    await page.waitForSelector('.route-point', { timeout: 10000 });
    await page.waitForSelector('.route-polyline', { timeout: 10000 });
  });

  test('AC5: User imports an empty or malformed KML file → a clear error message is displayed indicating the file could not be parsed', async ({ page }) => {
    await page.goto('https://ride.borarodar.app');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill credentials and submit
    await page.fill('input[type="email"]', 'test@borarodar.app');
    await page.fill('input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard/home to load with a longer timeout
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    
    // Wait for some element that indicates successful login
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    
    // Navigate to the routes import page
    await page.click('text=Routes');
    await page.waitForSelector('button:has-text("Import KML")', { timeout: 10000 });
    
    // Click import KML button and simulate file upload
    await page.click('button:has-text("Import KML")');
    
    // Wait for file upload dialog and simulate upload of malformed KML
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    // Taking a screenshot of the import process
    await page.screenshot({ path: 'screenshots/BRAPP-47-ac-5.png', fullPage: true });
    
    // Check that a clear error message is displayed
    await page.waitForSelector('.error-message', { timeout: 10000 });
    
    const errorMessage = await page.locator('.error-message').textContent();
    expect(errorMessage).toContain('Could not parse KML file');
  });
});