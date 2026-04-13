import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

test.describe('BRAPP-42: Fix TypeScript type mismatch in RouteEditorPage functional state update', () => {
  test.beforeAll(() => {
    const screenshotsDir = join(process.cwd(), 'screenshots');
    if (!existsSync(screenshotsDir)) {
      mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[type="email"]').fill('test@borarodar.app');
    await page.locator('input[type="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    // Wait for navigation to dashboard
    await page.waitForLoadState('networkidle');
    // Additional wait for page to stabilize
    await page.waitForTimeout(1000);
  });

  test('AC1: User navigates to the Route Editor page → the route configuration form and existing stops list are displayed correctly', async ({ page }) => {
    // Navigate to route editor page
    await page.locator('[data-testid="route-editor-link"]').click();
    await page.waitForLoadState('networkidle');
    // Wait a bit more for page to stabilize
    await page.waitForTimeout(1000);
    
    // Wait for route form and stops list to be visible with timeout
    await page.waitForSelector('[data-testid="route-editor-form"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="stops-list"]', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-42-ac-1.png', fullPage: true });
    
    // Verify route configuration form and stops list are displayed
    const routeForm = page.locator('[data-testid="route-editor-form"]');
    const stopsList = page.locator('[data-testid="stops-list"]');
    
    await expect(routeForm).toBeVisible();
    await expect(stopsList).toBeVisible();
  });

  test('AC2: User adds a new stop to the route → the stop is added to the list and the UI reflects the updated state without crashing', async ({ page }) => {
    // Navigate to route editor page
    await page.locator('[data-testid="route-editor-link"]').click();
    await page.waitForLoadState('networkidle');
    // Wait a bit more for page to stabilize
    await page.waitForTimeout(1000);
    
    // Add a new stop
    const addStopButton = page.locator('[data-testid="add-stop-button"]');
    await addStopButton.waitFor({ timeout: 15000 });
    await addStopButton.click();
    await page.waitForLoadState('networkidle');
    // Additional wait for UI to update
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-42-ac-2.png', fullPage: true });
    
    // Verify new stop was added with timeout
    const stops = page.locator('[data-testid="stop-item"]');
    await expect(stops).toHaveCount(1);
  });

  test('AC3: User removes an existing stop from the route → the stop is removed from the display and the sequence of remaining stops updates correctly', async ({ page }) => {
    // Navigate to route editor page
    await page.locator('[data-testid="route-editor-link"]').click();
    await page.waitForLoadState('networkidle');
    // Wait a bit more for page to stabilize
    await page.waitForTimeout(1000);
    
    // Add a stop first
    const addStopButton = page.locator('[data-testid="add-stop-button"]');
    await addStopButton.waitFor({ timeout: 15000 });
    await addStopButton.click();
    await page.waitForLoadState('networkidle');
    // Additional wait for UI to update
    await page.waitForTimeout(1000);
    
    // Remove the stop
    const removeStopButton = page.locator('[data-testid="remove-stop-button"]').first();
    await removeStopButton.waitFor({ timeout: 15000 });
    await removeStopButton.click();
    await page.waitForLoadState('networkidle');
    // Additional wait for UI to update
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-42-ac-3.png', fullPage: true });
    
    // Verify stop was removed with timeout
    const stops = page.locator('[data-testid="stop-item"]');
    await expect(stops).toHaveCount(0);
  });

  test('AC4: User saves the route after modifying the stops array → a success message appears indicating the route has been updated', async ({ page }) => {
    // Navigate to route editor page
    await page.locator('[data-testid="route-editor-link"]').click();
    await page.waitForLoadState('networkidle');
    // Wait a bit more for page to stabilize
    await page.waitForTimeout(1000);
    
    // Add a stop
    const addStopButton = page.locator('[data-testid="add-stop-button"]');
    await addStopButton.waitFor({ timeout: 15000 });
    await addStopButton.click();
    await page.waitForLoadState('networkidle');
    // Additional wait
    await page.waitForTimeout(1000);
    
    // Save the route
    const saveRouteButton = page.locator('[data-testid="save-route-button"]');
    await saveRouteButton.waitFor({ timeout: 15000 });
    await saveRouteButton.click();
    await page.waitForLoadState('networkidle');
    // Additional wait for save operation to complete
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-42-ac-4.png', fullPage: true });
    
    // Verify success message appears with timeout
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
  });
});