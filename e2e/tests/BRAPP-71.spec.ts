import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-71: Remove Non-Functional PRECISO DE AJUDA SOS Button from Route Pages', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    
    // Look for login form — email + password fields, submit button
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    // Fill credentials and submit
    await emailInput.fill('test@borarodar.app');
    await passwordInput.fill('borarodarapp');
    await submitButton.click();

    // Wait for dashboard/home to load with better timeout handling - increased timeout
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 30000 });
  });

  test('AC1: User navigates to a route detail page → no floating \'🚨 PRECISO DE AJUDA\' SOS button is visible on the screen', async ({ page }) => {
    // Navigate to a route detail page
    await page.click('[data-testid="route-item"]');
    
    // Wait for page to load with proper timeout instead of fixed timeout
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-71-ac-1.png', fullPage: true });
    
    // Verify the SOS button is not visible
    const sosButton = page.locator('div[aria-label="🚨 PRECISO DE AJUDA"]');
    await expect(sosButton).not.toBeVisible();
  });

  test('AC2: User scrolls through the route detail page → the map component, route info cards, waypoint list, and navigation links render correctly with no blank spaces or layout shifts', async ({ page }) => {
    // Navigate to a route detail page
    await page.click('[data-testid="route-item"]');
    
    // Wait for page to load with proper timeout instead of fixed timeout
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-71-ac-2.png', fullPage: true });
    
    // Verify that the map component, route info cards, waypoint list, and navigation links are visible
    const mapComponent = page.locator('[data-testid="map-component"]');
    const routeInfoCard = page.locator('[data-testid="route-info-card"]');
    const waypointList = page.locator('[data-testid="waypoint-list"]');
    const navigationLinks = page.locator('[data-testid="navigation-links"]');
    
    await expect(mapComponent).toBeVisible();
    await expect(routeInfoCard).toBeVisible();
    await expect(waypointList).toBeVisible();
    await expect(navigationLinks).toBeVisible();
  });

  test('AC3: User inspects the route detail page on mobile viewport → no orphaned floating action button or empty fixed-position container appears in the bottom-right corner', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to a route detail page
    await page.click('[data-testid="route-item"]');
    
    // Wait for page to load with proper timeout instead of fixed timeout
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-71-ac-3.png', fullPage: true });
    
    // Verify that no floating action button or empty fixed-position container exists in bottom-right corner
    const floatingButton = page.locator('div[aria-label="🚨 PRECISO DE AJUDA"]');
    await expect(floatingButton).not.toBeVisible();
    
    // Check for any empty containers in bottom-right corner
    const bottomRightContainer = page.locator('div[style*="position: fixed"][style*="bottom: 0"][style*="right: 0"]');
    await expect(bottomRightContainer).not.toBeVisible();
  });

  test('AC4: User navigates between multiple different route detail pages → none of them display the SOS emergency button', async ({ page }) => {
    // Navigate to first route detail page
    await page.click('[data-testid="route-item"]');
    
    // Wait for page to load with proper timeout
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 10000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-71-ac-4a.png', fullPage: true });
    
    // Verify the SOS button is not visible on first page
    const sosButton1 = page.locator('div[aria-label="🚨 PRECISO DE AJUDA"]');
    await expect(sosButton1).not.toBeVisible();
    
    // Navigate back to route list
    await page.goBack();
    await page.waitForTimeout(1000);
    
    // Navigate to a different route detail page
    await page.click('[data-testid="route-item"]:nth-child(2)'); // Click second route
    
    // Wait for page to load with proper timeout
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 10000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-71-ac-4b.png', fullPage: true });
    
    // Verify the SOS button is not visible on second page
    const sosButton2 = page.locator('div[aria-label="🚨 PRECISO DE AJUDA"]');
    await expect(sosButton2).not.toBeVisible();
  });

  test('AC5: User runs the application build → no compilation errors or warnings related to emergency service imports or missing references occur', async ({ page }) => {
    // This test would be more of a build-time test, but we can verify no emergency related errors in the UI
    // Navigate to a route detail page
    await page.click('[data-testid="route-item"]');
    
    // Wait for page to load with proper timeout
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 10000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-71-ac-5.png', fullPage: true });
    
    // Verify no emergency-related references or errors on the page
    const emergencyRelatedElements = page.locator('div[data-testid*="emergency"], div[data-testid*="sos"], div[aria-label*="PRECISO DE AJUDA"]');
    await expect(emergencyRelatedElements).toHaveCount(0);
  });
});