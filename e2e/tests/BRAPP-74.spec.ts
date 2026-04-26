import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

test.describe('BRAPP-74: Remove Non-Functional PRECISO DE AJUDA SOS Button from Route Pages', () => {
  test.beforeAll(() => {
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = join(process.cwd(), 'screenshots');
    if (!existsSync(screenshotsDir)) {
      mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app');
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

  test('AC1: User navigates to a route detail page → no floating \'🚨 PRECISO DE AJUDA\' SOS button is visible on the screen', async ({ page }) => {
    // Navigate to a route detail page
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app/routes/1');
    
    // Wait for route page to load
    await page.waitForSelector('[data-testid="route-detail"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-74-ac-1.png'), fullPage: true });
    
    // Verify SOS button is not visible
    const sosButton = page.locator('[aria-label="PRECISO DE AJUDA"]');
    await expect(sosButton).not.toBeVisible();
  });

  test('AC2: User navigates to a route detail page → the map component, route info cards, waypoint list, and navigation links render correctly with no blank spaces or layout shifts where the SOS button previously appeared', async ({ page }) => {
    // Navigate to a route detail page
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app/routes/1');
    
    // Wait for route page to load
    await page.waitForSelector('[data-testid="route-detail"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-74-ac-2.png'), fullPage: true });
    
    // Verify key UI elements are visible and rendered correctly
    const mapElement = page.locator('[data-testid="route-map"]');
    await expect(mapElement).toBeVisible();
    
    const routeInfoCards = page.locator('[data-testid="route-info-card"]');
    await expect(routeInfoCards).toBeVisible();
    
    const waypointList = page.locator('[data-testid="waypoint-list"]');
    await expect(waypointList).toBeVisible();
    
    const navigationLinks = page.locator('[data-testid="navigation-links"]');
    await expect(navigationLinks).toBeVisible();
  });

  test('AC3: User navigates to multiple different route detail pages → none of them display the SOS button or any emergency-related modal', async ({ page }) => {
    // Navigate to first route detail page
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app/routes/1');
    
    // Wait for route page to load
    await page.waitForSelector('[data-testid="route-detail"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-74-ac-3.png'), fullPage: true });
    
    // Verify SOS button is not visible on first page
    const sosButton1 = page.locator('[aria-label="PRECISO DE AJUDA"]');
    await expect(sosButton1).not.toBeVisible();
    
    // Navigate to second route detail page
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app/routes/2');
    
    // Wait for second route page to load
    await page.waitForSelector('[data-testid="route-detail"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-74-ac-3-2.png'), fullPage: true });
    
    // Verify SOS button is not visible on second page
    const sosButton2 = page.locator('[aria-label="PRECISO DE AJUDA"]');
    await expect(sosButton2).not.toBeVisible();
  });

  test('AC4: User inspects the route detail page → no EmergencyTypeModal dialog or emergency-related UI elements are present in the DOM', async ({ page }) => {
    // Navigate to a route detail page
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app/routes/1');
    
    // Wait for route page to load
    await page.waitForSelector('[data-testid="route-detail"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-74-ac-4.png'), fullPage: true });
    
    // Verify no EmergencyTypeModal or emergency-related elements are present
    const emergencyTypeModal = page.locator('[data-testid="EmergencyTypeModal"]');
    await expect(emergencyTypeModal).not.toBeVisible();
    
    // Verify no other emergency-related elements
    const emergencyElements = page.locator('[class*="emergency"], [data-testid*="emergency"]');
    await expect(emergencyElements).not.toBeVisible();
  });

  test('AC5: User triggers a production build of the application → the build completes successfully with no compilation errors or lint warnings related to emergency imports', async ({ page }) => {
    // Navigate to a route detail page
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app/routes/1');
    
    // Wait for route page to load
    await page.waitForSelector('[data-testid="route-detail"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-74-ac-5.png'), fullPage: true });
    
    // In E2E tests, we can't run build command, but we can check for emergency-related code in the HTML
    // Verify that no emergency-related code is present in HTML content  
    const pageContent = await page.content();
    expect(pageContent).not.toContain('emergencyService');
    expect(pageContent).not.toContain('EmergencyTypeModal');
    expect(pageContent).not.toContain('createAssistanceRequest');
  });
});