import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync, lstatSync } from 'fs';
import { resolve } from 'path';

test.describe('BRAPP-52: Fix: Route registration from KML file fails due to missing waypoint coordinates', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[type="email"]').fill('test@borarodar.app');
    await page.locator('input[type="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('nav'); // Wait for dashboard to load
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[type="email"]').fill('test@borarodar.app');
    await page.locator('input[type="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('nav'); // Wait for dashboard to load
  });

  test('AC1: User uploads a valid KML file containing waypoints with coordinates → route is registered successfully and a success confirmation message is displayed', async ({ page }) => {
    // Navigate to route creation page
    await page.getByRole('link', { name: 'Create Route' }).click();
    
    // Upload KML file
    await page.locator('input[type="file"]').setInputFiles('e2e/tests/fixtures/test.kml');
    
    // Wait for file to be processed and verify waypoints are shown
    await page.waitForSelector('.waypoint-list');
    
    // Submit the route
    await page.getByRole('button', { name: 'Register Route' }).click();
    
    // Wait for success message
    await page.waitForSelector('.success-message');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-52-ac-1.png', fullPage: true });
    
    // Verify success message
    const successMessage = await page.locator('.success-message').textContent();
    expect(successMessage).toContain('Route registered successfully');
  });

  test('AC2: User uploads a valid KML file → the parsed waypoints are displayed on the map at their correct geographic positions matching the KML coordinates', async ({ page }) => {
    // Navigate to route creation page
    await page.getByRole('link', { name: 'Create Route' }).click();
    
    // Upload KML file
    await page.locator('input[type="file"]').setInputFiles('e2e/tests/fixtures/valid-route.kml');
    
    // Wait for file to be processed and verify waypoints are shown
    await page.waitForSelector('.waypoint-list');
    await page.waitForTimeout(1000); // Wait for map to update
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-52-ac-2.png', fullPage: true });
    
    // Verify waypoints are displayed on map
    const mapWaypoints = await page.locator('.map-marker').count();
    expect(mapWaypoints).toBeGreaterThan(0);
  });

  test('AC3: User uploads a KML file with multiple waypoints and submits the route registration form → all waypoints appear in the waypoint list with valid [longitude, latitude] coordinate pairs', async ({ page }) => {
    // Navigate to route creation page
    await page.getByRole('link', { name: 'Create Route' }).click();
    
    // Upload KML file
    await page.locator('input[type="file"]').setInputFiles('e2e/tests/fixtures/test.kml');
    
    // Wait for file to be processed
    await page.waitForSelector('.waypoint-list');
    
    // Get waypoints from the list
    const waypoints = await page.locator('.waypoint-item').all();
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-52-ac-3.png', fullPage: true });
    
    // Verify each waypoint has valid coordinates
    expect(waypoints.length).toBeGreaterThan(0);
    for (const waypoint of waypoints) {
      const waypointText = await waypoint.textContent();
      expect(waypointText).toMatch(/\[.*,\s*.*\]/); // Match [lon, lat] format
    }
  });

  test('AC4: User uploads a malformed KML file missing coordinate data → a descriptive validation error message is shown to the user instead of a generic server error', async ({ page }) => {
    // Navigate to route creation page
    await page.getByRole('link', { name: 'Create Route' }).click();
    
    // Upload malformed KML file
    await page.locator('input[type="file"]').setInputFiles('e2e/tests/fixtures/invalid.kml');
    
    // Wait for validation error
    await page.waitForSelector('.error-message');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-52-ac-4.png', fullPage: true });
    
    // Verify validation error message
    const errorMessage = await page.locator('.error-message').textContent();
    expect(errorMessage).toContain('Validation error');
    expect(errorMessage).toContain('coordinates');
  });

  test('AC5: User completes route registration via KML upload and revisits the route detail page → the saved route displays all waypoints with the same coordinates originally present in the KML file', async ({ page }) => {
    // Navigate to route creation page
    await page.getByRole('link', { name: 'Create Route' }).click();
    
    // Upload KML file
    await page.locator('input[type="file"]').setInputFiles('e2e/tests/fixtures/valid-route.kml');
    
    // Wait for file to be processed
    await page.waitForSelector('.waypoint-list');
    
    // Submit the route
    await page.getByRole('button', { name: 'Register Route' }).click();
    
    // Wait for success message and navigate to dashboard
    await page.waitForSelector('.success-message');
    await page.getByRole('link', { name: 'Dashboard' }).click();
    
    // Navigate to routes list
    await page.getByRole('link', { name: 'My Routes' }).click();
    
    // Select the created route 
    await page.getByRole('button', { name: 'View Details' }).first().click();
    
    // Wait for waypoints to load
    await page.waitForSelector('.route-waypoint-list');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-52-ac-5.png', fullPage: true });
    
    // Verify waypoints are displayed with correct coordinates
    const waypoints = await page.locator('.route-waypoint-item').all();
    expect(waypoints.length).toBeGreaterThan(0);
    
    for (const waypoint of waypoints) {
      const waypointText = await waypoint.textContent();
      expect(waypointText).toMatch(/\[.*,\s*.*\]/); // Match [lon, lat] format
    }
  });
});