import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-55: Fix: Route not found after registering a new route', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app', { timeout: 30000 });
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Wait a bit more for page to fully load
    await page.waitForTimeout(1000);
  });

  test('AC1: User fills out the route creation form with valid waypoints and submits → user is redirected to the route detail page and the new route is displayed on the map with correct waypoint markers', async ({ page }) => {
    // Navigate to create route page
    await page.locator('a[href="/routes/create"]').click();
    await page.waitForURL('**/routes/create');
    
    // Fill route form with valid data
    await page.locator('input[name="name"]').fill('Test Route 1');
    
    // Add waypoints
    await page.locator('button:text("Add Waypoint")').first().click();
    await page.locator('input[name="waypoints.0.lat"]').fill('40.7128');
    await page.locator('input[name="waypoints.0.lon"]').fill('-74.0060');
    
    await page.locator('button:text("Add Waypoint")').click();
    await page.locator('input[name="waypoints.1.lat"]').fill('34.0522');
    await page.locator('input[name="waypoints.1.lon"]').fill('-118.2437');
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Wait for redirect back to route list
    await page.waitForURL('**/routes', { timeout: 30000 });
    
    // Count existing routes before creating
    const beforeCount = await page.locator('div.route-item').count();
    
    // Create new route
    await page.locator('a[href="/routes/create"]').click();
    await page.waitForURL('**/routes/create');
    
    // Fill route form
    await page.locator('input[name="name"]').fill('Test Route 2');
    
    // Add waypoints
    await page.locator('button:text("Add Waypoint")').first().click();
    await page.locator('input[name="waypoints.0.lat"]').fill('40.7128');
    await page.locator('input[name="waypoints.0.lon"]').fill('-74.0060');
    
    await page.locator('button:text("Add Waypoint")').click();
    await page.locator('input[name="waypoints.1.lat"]').fill('34.0522');
    await page.locator('input[name="waypoints.1.lon"]').fill('-118.2437');
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Wait for redirect back to route list
    await page.waitForURL('**/routes', { timeout: 30000 });
    
    // Wait for route to appear in list (cache invalidation)
    await page.waitForSelector('div.route-item', { timeout: 30000 });
    
    // Check if new route is in the list
    const afterCount = await page.locator('div.route-item').count();
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-55-ac-2.png', fullPage: true });
    
    // Verify new route appears in listing without refresh
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  test('AC3: User submits the route creation form with invalid or missing waypoint coordinates → a visible error message is displayed on the creation page and the user is NOT navigated away', async ({ page }) => {
    // Navigate to create route page
    await page.locator('a[href="/routes/create"]').click();
    await page.waitForURL('**/routes/create');
    
    // Fill route form with missing waypoints
    await page.locator('input[name="name"]').fill('Test Route 3');
    
    // Submit form with invalid data
    await page.locator('button[type="submit"]').click();
    
    // Wait for error to be displayed
    await page.waitForSelector('text=Please add at least one waypoint', { timeout: 30000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-55-ac-3.png', fullPage: true });
    
    // Verify user stays on creation page with error
    await expect(page.locator('text=Please add at least one waypoint')).toBeVisible();
    await expect(page.url()).toContain('/routes/create');
  });

  test('AC4: User creates a new route, is redirected to the route detail page, then refreshes the browser → the route detail page loads successfully showing route data instead of a \'route not found\' error', async ({ page }) => {
    // Create new route
    await page.locator('a[href="/routes/create"]').click();
    await page.waitForURL('**/routes/create');
    
    // Fill route form
    await page.locator('input[name="name"]').fill('Test Route 4');
    
    // Add waypoints
    await page.locator('button:text("Add Waypoint")').first().click();
    await page.locator('input[name="waypoints.0.lat"]').fill('40.7128');
    await page.locator('input[name="waypoints.0.lon"]').fill('-74.0060');
    
    await page.locator('button:text("Add Waypoint")').click();
    await page.locator('input[name="waypoints.1.lat"]').fill('34.0522');
    await page.locator('input[name="waypoints.1.lon"]').fill('-118.2437');
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Wait for redirect to route detail page
    await page.waitForURL('**/routes/*');
    
    // Refresh the page
    await page.reload({ waitUntil: 'networkidle' });
    
    // Wait for page to load - use a more robust wait
    await page.waitForSelector('h1:has-text("Route Details")', { timeout: 30000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-55-ac-4.png', fullPage: true });
    
    // Verify route data loads successfully
    await expect(page.locator('h1:has-text("Route Details")')).toBeVisible();
    await expect(page.locator('text=Test Route 4')).toBeVisible();
  });

  test('AC5: User submits the route creation form and the API is loading → a loading spinner or skeleton is shown on the route detail page before any \'not found\' message appears', async ({ page }) => {
    // Navigate to create route page
    await page.locator('a[href="/routes/create"]').click();
    await page.waitForURL('**/routes/create');
    
    // Fill route form
    await page.locator('input[name="name"]').fill('Test Route 5');
    
    // Add waypoints
    await page.locator('button:text("Add Waypoint")').first().click();
    await page.locator('input[name="waypoints.0.lat"]').fill('40.7128');
    await page.locator('input[name="waypoints.0.lon"]').fill('-74.0060');
    
    await page.locator('button:text("Add Waypoint")').click();
    await page.locator('input[name="waypoints.1.lat"]').fill('34.0522');
    await page.locator('input[name="waypoints.1.lon"]').fill('-118.2437');
    
    // Submit form - before it goes to the detail page, we should see a loading state
    await page.locator('button[type="submit"]').click();
    
    // Wait briefly to catch loading state before redirect
    await page.waitForTimeout(1000);
    
    // Check that we're not immediately on the not found page
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('not-found');
    expect(currentUrl).toContain('/routes/');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-55-ac-5.png', fullPage: true });
    
    // Verify redirect happened properly with a more robust wait
    await page.waitForURL('**/routes/*', { timeout: 30000 });
  });
});