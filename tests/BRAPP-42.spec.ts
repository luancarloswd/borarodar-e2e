import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

test.describe('BRAPP-42: Fix TypeScript type mismatch in RouteEditorPage functional state update', () => {
  const loginEmail = process.env.LOGIN_EMAIL;
  const loginPassword = process.env.LOGIN_PASSWORD;

  test.beforeAll(() => {
    const screenshotsDir = join(process.cwd(), 'screenshots');
    if (!existsSync(screenshotsDir)) {
      mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!loginEmail || !loginPassword, 'LOGIN_EMAIL and LOGIN_PASSWORD must be set to run these tests.');

    // Login flow
    await page.goto('/');
    await page.locator('input[type="email"]').fill(loginEmail!);
    await page.locator('input[type="password"]').fill(loginPassword!);
    await page.locator('button[type="submit"]').click();
    
    // Wait for a deterministic post-login UI signal instead of network idle / fixed delays
    await expect(page.locator('[data-testid="route-editor-link"]')).toBeVisible({ timeout: 15000 });
  });

  test('AC1: User navigates to the Route Editor page → the route configuration form and existing stops list are displayed correctly', async ({ page }) => {
    // Navigate to route editor page
    await page.locator('[data-testid="route-editor-link"]').click();
    
    // Verify route configuration form and stops list are displayed
    const routeForm = page.locator('[data-testid="route-editor-form"]');
    const stopsList = page.locator('[data-testid="stops-list"]');
    
    await expect(routeForm).toBeVisible({ timeout: 15000 });
    await expect(stopsList).toBeVisible({ timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-42-ac-1.png', fullPage: true });
  });

  test('AC2: User adds a new stop to the route → the stop is added to the list and the UI reflects the updated state without crashing', async ({ page }) => {
    // Navigate to route editor page
    await page.locator('[data-testid="route-editor-link"]').click();
    
    const stops = page.locator('[data-testid="stop-item"]');
    await expect(page.locator('[data-testid="stops-list"]')).toBeVisible({ timeout: 15000 });
    const initialCount = await stops.count();
    
    // Add a new stop
    const addStopButton = page.locator('[data-testid="add-stop-button"]');
    await expect(addStopButton).toBeVisible({ timeout: 15000 });
    await addStopButton.click();
    
    // Verify new stop was added
    await expect(stops).toHaveCount(initialCount + 1, { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-42-ac-2.png', fullPage: true });
  });

  test('AC3: User removes an existing stop from the route → the stop is removed from the display and the sequence of remaining stops updates correctly', async ({ page }) => {
    // Navigate to route editor page
    await page.locator('[data-testid="route-editor-link"]').click();
    
    // Add a stop first if needed, or just work with what's there
    const addStopButton = page.locator('[data-testid="add-stop-button"]');
    await expect(addStopButton).toBeVisible({ timeout: 15000 });
    await addStopButton.click();
    
    const stops = page.locator('[data-testid="stop-item"]');
    await expect(stops).not.toHaveCount(0, { timeout: 15000 });
    const countAfterAdd = await stops.count();
    
    // Remove the stop
    const removeStopButton = page.locator('[data-testid="remove-stop-button"]').first();
    await expect(removeStopButton).toBeVisible({ timeout: 15000 });
    await removeStopButton.click();
    
    // Verify stop was removed
    await expect(stops).toHaveCount(countAfterAdd - 1, { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-42-ac-3.png', fullPage: true });
  });

  test('AC4: User saves the route after modifying the stops array → a success message appears indicating the route has been updated', async ({ page }) => {
    // Navigate to route editor page
    await page.locator('[data-testid="route-editor-link"]').click();
    
    // Add a stop
    const addStopButton = page.locator('[data-testid="add-stop-button"]');
    await expect(addStopButton).toBeVisible({ timeout: 15000 });
    await addStopButton.click();
    
    // Save the route
    const saveRouteButton = page.locator('[data-testid="save-route-button"]');
    await expect(saveRouteButton).toBeVisible({ timeout: 15000 });
    await saveRouteButton.click();
    
    // Verify success message appears with timeout
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toBeVisible({ timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-42-ac-4.png', fullPage: true });
  });
});
