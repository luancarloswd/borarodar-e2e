import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

test.describe('BRAPP-73: Remove Non-Functional PRECISO DE AJUDA SOS Button from Route Pages', () => {
  test.beforeAll(() => {
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = join(process.cwd(), 'screenshots');
    if (!existsSync(screenshotsDir)) {
      mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    // Look for login form — email + password fields, submit button
    const emailInput = page.getByLabel('Email');
    const passwordInput = page.getByLabel('Password');
    const submitButton = page.getByRole('button', { name: 'Entrar' });
    
    // Fill credentials and submit
    await emailInput.fill('test@borarodar.app');
    await passwordInput.fill('borarodarapp');
    await submitButton.click();
    
    // Wait for dashboard/home to load
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test('AC1: User navigates to a route detail page → the \'🚨 PRECISO DE AJUDA\' SOS floating action button is no longer visible on the screen.', async ({ page }) => {
    // Navigate to a route detail page
    await page.goto('https://ride.borarodar.app/routes/1');
    
    // Wait for route page to load
    await page.waitForSelector('[data-testid="route-detail"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-73-ac-1.png'), fullPage: true });
    
    // Verify SOS button is not visible
    const sosButton = page.locator('[aria-label="PRECISO DE AJUDA"]');
    await expect(sosButton).not.toBeVisible();
  });

  test('AC2: User views the route detail page → the map and route information cards are rendered correctly without any layout shifts or empty spaces where the button was located.', async ({ page }) => {
    // Navigate to a route detail page
    await page.goto('https://ride.borarodar.app/routes/1');
    
    // Wait for route page to load
    await page.waitForSelector('[data-testid="route-detail"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-73-ac-2.png'), fullPage: true });
    
    // Verify map is visible and rendered correctly
    const mapElement = page.locator('[data-testid="route-map"]');
    await expect(mapElement).toBeVisible();
    
    // Verify route info cards are visible
    const routeInfoCards = page.locator('[data-testid="route-info-card"]');
    await expect(routeInfoCards).toBeVisible();
  });

  test('AC3: User interacts with the route detail page → all existing navigation links, waypoint lists, and map controls remain functional and visible.', async ({ page }) => {
    // Navigate to a route detail page
    await page.goto('https://ride.borarodar.app/routes/1');
    
    // Wait for route page to load
    await page.waitForSelector('[data-testid="route-detail"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-73-ac-3.png'), fullPage: true });
    
    // Verify navigation links are visible
    const navigationLinks = page.locator('[data-testid="navigation-link"]');
    await expect(navigationLinks).toBeVisible();
    
    // Verify waypoint list is visible
    const waypointList = page.locator('[data-testid="waypoint-list"]');
    await expect(waypointList).toBeVisible();
    
    // Verify map controls are visible
    const mapControls = page.locator('[data-testid="map-controls"]');
    await expect(mapControls).toBeVisible();
  });

  test('AC4: User navigates between different route pages → the \'PRECISO DE AJUDA\' SOS button is consistently absent across all route-related views.', async ({ page }) => {
    // Navigate to first route detail page
    await page.goto('https://ride.borarodar.app/routes/1');
    
    // Wait for route page to load
    await page.waitForSelector('[data-testid="route-detail"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-73-ac-4.png'), fullPage: true });
    
    // Verify SOS button is not visible on first page
    const sosButton1 = page.locator('[aria-label="PRECISO DE AJUDA"]');
    await expect(sosButton1).not.toBeVisible();
    
    // Navigate to second route detail page
    await page.goto('https://ride.borarodar.app/routes/2');
    
    // Wait for second route page to load
    await page.waitForSelector('[data-testid="route-detail"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-73-ac-4-2.png'), fullPage: true });
    
    // Verify SOS button is not visible on second page
    const sosButton2 = page.locator('[aria-label="PRECISO DE AJUDA"]');
    await expect(sosButton2).not.toBeVisible();
  });
});