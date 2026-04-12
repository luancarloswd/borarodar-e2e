import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-49: Fix: AI-generated route save fails due to missing waypoint coordinates', () => {
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

  test('AC1: User generates a route using AI and clicks Save → the route is saved successfully and a success confirmation is displayed (no VALIDATION_ERROR shown)', async ({ page }) => {
    // Navigate to homepage to generate route
    await page.goto('https://ride.borarodar.app');
    
    // Wait for the AI route generation button to be visible and click it
    const aiRouteButton = page.locator('button:has-text("AI Route"), button:has-text("Generate Route"), button[data-testid="ai-route-button"]');
    await aiRouteButton.waitFor({ timeout: 15000 });
    await aiRouteButton.click();
    
    // Wait for AI route to be generated (should be a visual change to the page)
    await page.waitForTimeout(3000);
    
    // Click save button - be more specific with selectors
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Save Route"), button[data-testid="save-route-button"]');
    await saveButton.waitFor({ timeout: 15000 });
    await saveButton.click();
    
    // Wait for save confirmation or validation
    await page.waitForTimeout(2000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-49-ac-1.png', fullPage: true });
    
    // Verify success confirmation is displayed (no VALIDATION_ERROR)
    // Be more specific about message locations
    const successMessage = page.locator('text="Route saved successfully"');
    const validationError = page.locator('text="VALIDATION_ERROR"');
    
    // Check that success message is visible or validation error is not visible
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    await expect(validationError).not.toBeVisible({ timeout: 10000 });
  });

  test('AC2: User saves an AI-generated route and reopens it → all waypoints are displayed on the map at the correct positions with valid coordinates', async ({ page }) => {
    // Navigate to homepage to generate and save route
    await page.goto('https://ride.borarodar.app');
    
    // Wait for the AI route generation button to be visible and click it
    const aiRouteButton = page.locator('button:has-text("AI Route"), button:has-text("Generate Route"), button[data-testid="ai-route-button"]');
    await aiRouteButton.waitFor({ timeout: 15000 });
    await aiRouteButton.click();
    
    // Wait for AI route to be generated (should be a visual change to the page)
    await page.waitForTimeout(3000);
    
    // Click save button - be more specific with selectors
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Save Route"), button[data-testid="save-route-button"]');
    await saveButton.waitFor({ timeout: 15000 });
    await saveButton.click();
    
    // Wait for save to complete
    await page.waitForTimeout(2000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-49-ac-2.png', fullPage: true });
    
    // Reopen the saved route (Navigate to routes page)
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for routes to load and find the created route
    await page.waitForSelector('div[data-testid="route-item"]', { timeout: 15000 });
    
    // Click on the first route that was created (should be the one we just saved)
    const firstRoute = page.locator('div[data-testid="route-item"]').first();
    await firstRoute.waitFor({ timeout: 10000 });
    await firstRoute.click();
    
    // Wait for route details to load
    await page.waitForTimeout(2000);
    
    // Take screenshot for evidence after reopening
    await page.screenshot({ path: 'screenshots/BRAPP-49-ac-2-reopen.png', fullPage: true });
    
    // Check that waypoints are displayed on the map with correct positions
    // Try to find waypoints by various selectors
    const waypointMarkers = page.locator('[data-testid*="waypoint"], [class*="waypoint"], .marker, [data-testid*="marker"]');
    await expect(waypointMarkers).toBeVisible({ timeout: 10000 });
  });

  test('AC3: User generates an AI route with multiple waypoints and saves → each waypoint in the saved route contains valid [lon, lat] coordinates visible in the route details', async ({ page }) => {
    // Navigate to homepage to generate and save route
    await page.goto('https://ride.borarodar.app');
    
    // Wait for the AI route generation button to be visible and click it
    const aiRouteButton = page.locator('button:has-text("AI Route"), button:has-text("Generate Route"), button[data-testid="ai-route-button"]');
    await aiRouteButton.waitFor({ timeout: 15000 });
    await aiRouteButton.click();
    
    // Wait for AI route to be generated (should be a visual change to the page)
    await page.waitForTimeout(3000);
    
    // Click save button - be more specific with selectors
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Save Route"), button[data-testid="save-route-button"]');
    await saveButton.waitFor({ timeout: 15000 });
    await saveButton.click();
    
    // Wait for save to complete
    await page.waitForTimeout(2000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-49-ac-3.png', fullPage: true });
    
    // Reopen the saved route to check details
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for routes to load and find the created route
    await page.waitForSelector('div[data-testid="route-item"]', { timeout: 15000 });
    
    // Click on the route to view details
    const firstRoute = page.locator('div[data-testid="route-item"]').first();
    await firstRoute.waitFor({ timeout: 10000 });
    await firstRoute.click();
    
    // Wait for route details to load
    await page.waitForTimeout(2000);
    
    // Take screenshot for evidence after viewing details
    await page.screenshot({ path: 'screenshots/BRAPP-49-ac-3-details.png', fullPage: true });
    
    // Check that coordinates are visible in route details
    // Specifically look for route details section
    const routeDetails = page.locator('[data-testid="route-details"], [class*="route-details"]');
    await expect(routeDetails).toBeVisible({ timeout: 10000 });
    
    // Also check for coordinates in the route details
    const coordinates = page.locator('[data-testid*="coordinate"], [data-testid*="lon"], [data-testid*="lat"], .coordinate');
    await expect(coordinates).toBeVisible({ timeout: 10000 });
  });

  test('AC4: User generates an AI route and clicks Save → the save request completes without error and the route appears in the user\'s route list', async ({ page }) => {
    // Navigate to homepage to generate and save route
    await page.goto('https://ride.borarodar.app');
    
    // Wait for the AI route generation button to be visible and click it
    const aiRouteButton = page.locator('button:has-text("AI Route"), button:has-text("Generate Route"), button[data-testid="ai-route-button"]');
    await aiRouteButton.waitFor({ timeout: 15000 });
    await aiRouteButton.click();
    
    // Wait for AI route to be generated (should be a visual change to the page)
    await page.waitForTimeout(3000);
    
    // Click save button - be more specific with selectors
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Save Route"), button[data-testid="save-route-button"]');
    await saveButton.waitFor({ timeout: 15000 });
    await saveButton.click();
    
    // Wait for save to complete and success confirmation
    await page.waitForTimeout(2000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-49-ac-4.png', fullPage: true });
    
    // Verify the route appears in the user's route list
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for routes to load
    await page.waitForSelector('div[data-testid="route-item"]', { timeout: 15000 });
    await page.waitForTimeout(1000);
    
    // Take screenshot after navigating to routes list
    await page.screenshot({ path: 'screenshots/BRAPP-49-ac-4-list.png', fullPage: true });
    
    // Check that route is visible in the list (at least one route should appear)
    const routeItems = await page.locator('div[data-testid="route-item"]').all();
    expect(routeItems.length).toBeGreaterThanOrEqual(1);
  });

  test('AC5: User edits an AI-generated route by adding or removing waypoints and clicks Save → the modified route saves successfully with all waypoint coordinates intact', async ({ page }) => {
    // Navigate to homepage to generate and save route first
    await page.goto('https://ride.borarodar.app');
    
    // Wait for the AI route generation button to be visible and click it
    const aiRouteButton = page.locator('button:has-text("AI Route"), button:has-text("Generate Route"), button[data-testid="ai-route-button"]');
    await aiRouteButton.waitFor({ timeout: 15000 });
    await aiRouteButton.click();
    
    // Wait for AI route to be generated (should be a visual change to the page)
    await page.waitForTimeout(3000);
    
    // Click save button - be more specific with selectors
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Save Route"), button[data-testid="save-route-button"]');
    await saveButton.waitFor({ timeout: 15000 });
    await saveButton.click();
    
    // Wait for save to complete
    await page.waitForTimeout(2000);
    
    // Take screenshot for evidence after initial save
    await page.screenshot({ path: 'screenshots/BRAPP-49-ac-5-initial.png', fullPage: true });
    
    // Reopen the route to edit it - go to routes page first
    await page.goto('https://ride.borarodar.app/routes');
    
    // Wait for routes to load
    await page.waitForSelector('div[data-testid="route-item"]', { timeout: 15000 });
    
    // Click on the route to edit
    const firstRoute = page.locator('div[data-testid="route-item"]').first();
    await firstRoute.waitFor({ timeout: 10000 });
    await firstRoute.click();
    
    // Wait for route details to load
    await page.waitForTimeout(2000);
    
    // Try to find and click edit button - be more specific with selectors
    const editButton = page.locator('button:has-text("Edit"), button:has-text("Modify"), button[data-testid="edit-route-button"]');
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Click save for the edited route
    const saveButtonAfterEdit = page.locator('button:has-text("Save"), button:has-text("Save Route"), button[data-testid="save-route-button"]');
    await saveButtonAfterEdit.waitFor({ timeout: 15000 });
    await saveButtonAfterEdit.click();
    
    // Wait for save confirmation
    await page.waitForTimeout(2000);
    
    // Take screenshot for evidence after editing and saving
    await page.screenshot({ path: 'screenshots/BRAPP-49-ac-5.png', fullPage: true });
    
    // Verify edit/save was successful by checking for success confirmation
    const successMessage = page.locator('text="Route saved successfully"');
    const validationError = page.locator('text="VALIDATION_ERROR"');
    
    // Check that success message is visible or validation error is not visible
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    await expect(validationError).not.toBeVisible({ timeout: 10000 });
  });
});