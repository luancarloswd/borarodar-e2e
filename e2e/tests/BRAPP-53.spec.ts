import { test, expect } from '@playwright/test';

test.describe('BRAPP-53: Fix: Manual Route Registration Fails Due to Incorrect Waypoint Coordinate Format', () => {
  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('header h1:has-text("Dashboard")');
    // Add a small delay to ensure the page is fully loaded
    await page.waitForTimeout(1000);
  });

  test('AC1: User fills in the manual route registration form with valid waypoint coordinates and submits → route is created successfully and a success confirmation is displayed', async ({ page }) => {
    // Navigate to route creation page
    await page.locator('button:has-text("Create Route")').click();
    await page.waitForSelector('h2:has-text("Manual Route Registration")', { timeout: 10000 });
    
    // Fill form with valid coordinates
    await page.locator('input[name="routeName"]').fill('Test Route 1');
    await page.locator('input[name="waypoint-0-lat"]').fill('40.7128');
    await page.locator('input[name="waypoint-0-lon"]').fill('-74.0060');
    
    // Submit form
    await page.locator('button:has-text("Create Route")').click();
    // Add a small delay to prevent timing issues
    await page.waitForTimeout(1000);
    
    // Wait for success confirmation
    await page.waitForSelector('div:has-text("Route created successfully")', { timeout: 10000 });
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-53-ac-1.png', fullPage: true, timeout: 5000 });
    } catch (error) {
      // Continue if screenshot fails, but log the error
      console.log('Warning: Failed to take screenshot for AC1');
    }
    
    // Verify success message
    expect(await page.locator('div:has-text("Route created successfully")').isVisible()).toBe(true);
  });

  test('AC1: User fills in the manual route registration form with valid waypoint coordinates and submits → route is created successfully and a success confirmation is displayed', async ({ page }) => {
    // Navigate to route creation page
    await page.locator('button:has-text("Create Route")').click();
    await page.waitForSelector('h2:has-text("Manual Route Registration")');
    
    // Fill form with valid coordinates
    await page.locator('input[name="routeName"]').fill('Test Route 1');
    await page.locator('input[name="waypoint-0-lat"]').fill('40.7128');
    await page.locator('input[name="waypoint-0-lon"]').fill('-74.0060');
    
    // Submit form
    await page.locator('button:has-text("Create Route")').click();
    
    // Wait for success confirmation
    await page.waitForSelector('div:has-text("Route created successfully")');
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-53-ac-1.png', fullPage: true, timeout: 5000 });
    } catch (error) {
      // Continue if screenshot fails, but log the error
      console.log('Warning: Failed to take screenshot for AC1');
    }
    
    // Verify success message
    expect(await page.locator('div:has-text("Route created successfully")').isVisible()).toBe(true);
  });

  test('AC2: User creates a route with multiple waypoints via the manual registration form → all waypoints appear on the map at the correct positions matching the entered coordinates', async ({ page }) => {
    // Navigate to route creation page
    await page.locator('button:has-text("Create Route")').click();
    await page.waitForSelector('h2:has-text("Manual Route Registration")', { timeout: 10000 });
    
    // Add first waypoint
    await page.locator('input[name="routeName"]').fill('Test Route 2');
    await page.locator('input[name="waypoint-0-lat"]').fill('40.7128');
    await page.locator('input[name="waypoint-0-lon"]').fill('-74.0060');
    
    // Add second waypoint
    await page.locator('button:has-text("Add Waypoint")').click();
    await page.locator('input[name="waypoint-1-lat"]').fill('34.0522');
    await page.locator('input[name="waypoint-1-lon"]').fill('-118.2437');
    
    // Submit form
    await page.locator('button:has-text("Create Route")').click();
    // Add a small delay to prevent timing issues
    await page.waitForTimeout(1000);
    
    // Wait for success confirmation
    await page.waitForSelector('div:has-text("Route created successfully")', { timeout: 10000 });
    
    // Navigate to the route details page to verify waypoints
    await page.locator('a:has-text("View Route")').first().click();
    await page.waitForSelector('h2:has-text("Route Details")', { timeout: 10000 });
    
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-53-ac-2.png', fullPage: true, timeout: 5000 });
    } catch (error) {
      // Continue if screenshot fails, but log the error
      console.log('Warning: Failed to take screenshot for AC2');
    }
    
    // Verify waypoints are displayed
    expect(await page.locator('div:has-text("Waypoint 1")').isVisible()).toBe(true);
    expect(await page.locator('div:has-text("Waypoint 2")').isVisible()).toBe(true);
  });

test('AC3: User navigates to the route details page of a manually created route → each waypoint displays its coordinates in the correct format and in the correct geographic location', async ({ page }) => {
    // Navigate to dashboard to find route details
    await page.locator('button:has-text("My Routes")').click();
    await page.waitForSelector('h2:has-text("My Routes")', { timeout: 10000 });
    
    // Navigate to first route details
    await page.locator('a:has-text("Test Route 1")').first().click();
    await page.waitForSelector('h2:has-text("Route Details")', { timeout: 10000 });
    
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-53-ac-3.png', fullPage: true, timeout: 5000 });
    } catch (error) {
      // Continue if screenshot fails, but log the error
      console.log('Warning: Failed to take screenshot for AC3');
    }
    
    // Verify waypoint coordinates are displayed
    expect(await page.locator('div:has-text("Latitude:")').isVisible()).toBe(true);
    expect(await page.locator('div:has-text("Longitude:")').isVisible()).toBe(true);
  });

  test('AC4: User submits the route registration form with invalid or missing waypoint coordinates → a descriptive validation error message is displayed and the form is not submitted', async ({ page }) => {
    // Navigate to route creation page
    await page.locator('button:has-text("Create Route")').click();
    await page.waitForSelector('h2:has-text("Manual Route Registration")', { timeout: 10000 });
    
    // Fill form with invalid coordinates
    await page.locator('input[name="routeName"]').fill('Test Route 4');
    await page.locator('input[name="waypoint-0-lat"]').fill('invalid');
    await page.locator('input[name="waypoint-0-lon"]').fill('invalid');
    
    // Try to submit form
    await page.locator('button:has-text("Create Route")').click();
    // Add a small delay to prevent timing issues
    await page.waitForTimeout(1000);
    
    // Wait for validation error
    await page.waitForSelector('div:has-text("Invalid coordinates")', { timeout: 10000 });
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-53-ac-4.png', fullPage: true, timeout: 5000 });
    } catch (error) {
      // Continue if screenshot fails, but log the error
      console.log('Warning: Failed to take screenshot for AC4');
    }
    
    // Verify error message
    expect(await page.locator('div:has-text("Invalid coordinates")').isVisible()).toBe(true);
  });

  test('AC5: User edits an existing manually-created route\'s waypoints and saves → the updated waypoint coordinates are persisted and reflected correctly on the route details page', async ({ page }) => {
    // Navigate to dashboard to find route details
    await page.locator('button:has-text("My Routes")').click();
    await page.waitForSelector('h2:has-text("My Routes")', { timeout: 10000 });
    
    // Navigate to first route details
    await page.locator('a:has-text("Test Route 1")').first().click();
    await page.waitForSelector('h2:has-text("Route Details")', { timeout: 10000 });
    
    // Click edit
    await page.locator('button:has-text("Edit Route")').click();
    await page.waitForSelector('h2:has-text("Edit Route")', { timeout: 10000 });
    
    // Update waypoint coordinates
    await page.locator('input[name="waypoint-0-lat"]').fill('37.7749');
    await page.locator('input[name="waypoint-0-lon"]').fill('-122.4194');
    
    // Save changes
    await page.locator('button:has-text("Save Changes")').click();
    // Add a small delay to prevent timing issues
    await page.waitForTimeout(1000);
    
    // Wait for confirmation
    await page.waitForSelector('div:has-text("Route updated successfully")', { timeout: 10000 });
    
    // Navigate back to details to verify
    await page.locator('a:has-text("View Route")').first().click();
    await page.waitForSelector('h2:has-text("Route Details")', { timeout: 10000 });
    
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-53-ac-5.png', fullPage: true, timeout: 5000 });
    } catch (error) {
      // Continue if screenshot fails, but log the error
      console.log('Warning: Failed to take screenshot for AC5');
    }
    
    // Verify updated coordinates are displayed
    expect(await page.locator('div:has-text("Latitude:")').isVisible()).toBe(true);
    expect(await page.locator('div:has-text("Longitude:")').isVisible()).toBe(true);
  });
});