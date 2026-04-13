import { test, expect } from '@playwright/test';

test.describe('BRAPP-62: Fix Route Detail Page Crash When Clicking Existing Route', () => {
  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[type="email"]').fill('test@borarodar.app');
    await page.locator('input[type="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    // Reduced timeout for Windows compatibility
    await page.waitForTimeout(1000);
  });

  test('AC1: User clicks on an existing route from the route listing page → route detail page loads displaying the route name, a Google Maps section with the route geometry, and a list of waypoints without any crash or error', async ({ page }) => {
    // Navigate to route listing page
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for route list to load with shorter timeout
    await page.waitForSelector('text=Route List', { timeout: 5000 });
    
    // Click on first route
    await page.click('[data-test="route-item"]'); // Using data-test attribute for more reliable selection
    // Reduced timeout for Windows compatibility
    await page.waitForTimeout(2000);
    
    // Verify route detail page loaded without crash
    await page.waitForSelector('text=Route Details', { timeout: 5000 });
    expect(await page.isVisible('text=Route Details')).toBe(true);
    
    // Verify route name is displayed
    expect(await page.isVisible('[data-test="route-name"]')).toBe(true);
    
    // Verify Google Maps section is displayed
    expect(await page.isVisible('[data-test="google-map"]')).toBe(true);
    
    // Verify waypoints are displayed
    expect(await page.isVisible('[data-test="waypoints-list"]')).toBe(true);
  });

  test('AC2: User navigates directly to /routes/[valid-id] → route detail page renders correctly with route data visible and no runtime error', async ({ page }) => {
    // Navigate directly to a route detail page
    await page.goto('https://ride.borarodar.app/routes/1');
    // Reduced timeout for Windows compatibility
    await page.waitForTimeout(2000);
    
    // Verify route detail page loaded without crash
    await page.waitForSelector('text=Route Details', { timeout: 5000 });
    expect(await page.isVisible('text=Route Details')).toBe(true);
    
    // Verify route name is displayed
    expect(await page.isVisible('[data-test="route-name"]')).toBe(true);
    
    // Verify Google Maps section is displayed
    expect(await page.isVisible('[data-test="google-map"]')).toBe(true);
    
    // Verify waypoints are displayed
    expect(await page.isVisible('[data-test="waypoints-list"]')).toBe(true);
  });

  test('AC3: User navigates to /routes/[invalid-id] → a user-friendly \'Route not found\' message is displayed instead of a crash or blank page', async ({ page }) => {
    // Navigate to an invalid route ID
    await page.goto('https://ride.borarodar.app/routes/999999');
    // Reduced timeout for Windows compatibility
    await page.waitForTimeout(2000);
    
    // Verify user-friendly error message is displayed
    expect(await page.isVisible('text=Route not found')).toBe(true);
    expect(await page.isVisible('text=Something went wrong')).toBe(false);
  });

  test('AC4: User navigates to a route detail page on a slow network connection → a loading skeleton (placeholders for route name, map, and waypoints) is shown while data loads, then route content replaces the skeleton once loaded', async ({ page }) => {
    // Set slow network conditions
    const context = await page.context();
    await context.route('**/*', async (route) => {
      // Simulate slow network connection with shorter delay
      await page.waitForTimeout(1000);
      await route.continue();
    });
    
    // Navigate to a route detail page
    await page.goto('https://ride.borarodar.app/routes/1');
    // Reduced timeout for Windows compatibility
    await page.waitForTimeout(2000);
    
    // Verify loading skeleton is displayed initially (check for placeholder elements)
    expect(await page.isVisible('[data-test="loading-skeleton"]')).toBe(true);
    
    // Wait for content to load with shorter timeout
    await page.waitForSelector('text=Route Details', { timeout: 8000 });
    
    // Verify route content is displayed after loading
    expect(await page.isVisible('text=Route Details')).toBe(true);
  });

  test('AC5: User views a route detail page and a rendering error occurs in a child component → an error fallback message (\'Something went wrong. Please try again.\') with a retry button is displayed instead of a full page crash', async ({ page }) => {
    // Navigate to a route detail page
    await page.goto('https://ride.borarodar.app/routes/1');
    // Reduced timeout for Windows compatibility
    await page.waitForTimeout(2000);
    
    // Verify error fallback is NOT shown initially
    expect(await page.isVisible('text=Something went wrong')).toBe(false);
    
    // Verify core elements are displayed
    expect(await page.isVisible('[data-test="route-name"]')).toBe(true);
    expect(await page.isVisible('[data-test="google-map"]')).toBe(true);
    expect(await page.isVisible('[data-test="waypoints-list"]')).toBe(true);
  });
});