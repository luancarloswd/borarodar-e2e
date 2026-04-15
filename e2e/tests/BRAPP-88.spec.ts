import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-88: Fix Always-Disabled \'Gerar Planejamento\' Button on Route Planner', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    // Wait for dashboard to load
    await page.waitForSelector('header');
    
    // Navigate to route planner
    await page.goto('https://ride.borarodar.app/rotas/planejador');
    await page.waitForLoadState('networkidle');
  });

  test('AC1: User navigates to the Route Planner page and selects a route from the RouteSelector dropdown → the selected route name is displayed and the route field is visually populated', async ({ page }) => {
    // Wait for route selector to be available
    await page.waitForSelector('select[name="route"]'); // More specific route selector
    
    // Select a route from the dropdown
    await page.locator('select[name="route"]').first().selectOption({ index: 1 }); // Select first available option
    
    // Verify route is selected
    const selectedRoute = await page.locator('select[name="route"]').first().inputValue();
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-88-ac-1.png', fullPage: true });
    
    expect(selectedRoute).not.toBe('');
  });

  test('AC2: User selects a route and picks a departure date from the DatePicker → the \'Gerar Planejamento\' button becomes enabled (not grayed out/disabled)', async ({ page }) => {
    // Select a route
    await page.locator('select[name="route"]').first().selectOption({ index: 1 }); // Select first available option
    
    // Select departure date (using a date picker)
    await page.locator('input[name="date"]').first().click();
    // Use a more robust date selection approach
    await page.locator('input[name="date"]').first().fill('2025-04-15'); // Fill date directly
    
    // Add a small wait to ensure button state updates
    await page.waitForTimeout(500);
    
    // Wait for button to be enabled - check for class or disabled attribute
    await page.waitForSelector('button:has-text("Gerar Planejamento"):not(:disabled)', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-88-ac-2.png', fullPage: true });
    
    // Verify button is enabled - check it's not disabled
    const button = page.locator('button:has-text("Gerar Planejamento")');
    await expect(button).toBeEnabled();
  });

  test('AC3: User fills in route and departure date then clicks the enabled \'Gerar Planejamento\' button → a loading indicator appears and the route plan is generated and displayed on the page', async ({ page }) => {
    // Select a route
    await page.locator('select[name="route"]').first().selectOption({ index: 1 }); // Select first available option
    
    // Select departure date
    await page.locator('input[name="date"]').first().click();
    await page.locator('input[name="date"]').first().fill('2025-04-15'); // Fill date directly
    
    // Click the generate button
    await page.locator('button:has-text("Gerar Planejamento")').click();
    
    // Wait for loading indicator to show
    await page.waitForSelector('[data-testid="loading-indicator"]', { timeout: 10000 });
    
    // Wait for plan to be generated
    await page.waitForSelector('[data-testid="route-plan-result"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-88-ac-3.png', fullPage: true });
    
    // Verify plan is displayed
    const planResult = page.locator('[data-testid="route-plan-result"]');
    await expect(planResult).toBeVisible();
  });

  test('AC4: User selects a route but leaves the departure date empty → the \'Gerar Planejamento\' button remains disabled', async ({ page }) => {
    // Select a route
    await page.locator('select[name="route"]').first().selectOption({ index: 1 }); // Select first available option
    
    // Wait for button to be disabled - check for class or disabled attribute
    await page.waitForSelector('button:has-text("Gerar Planejamento"):disabled', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-88-ac-4.png', fullPage: true });
    
    // Verify button is disabled by checking it has disabled attribute
    const button = page.locator('button:has-text("Gerar Planejamento")');
    await expect(button).toBeDisabled();
  });

  test('AC5: User fills in route and departure date without modifying departure time or average speed → the \'Gerar Planejamento\' button is enabled, confirming default values (06:00 / 120 km/h) do not block submission', async ({ page }) => {
    // Select a route
    await page.locator('select[name="route"]').first().selectOption({ index: 1 }); // Select first available option
    
    // Select departure date
    await page.locator('input[name="date"]').first().click();
    await page.locator('input[name="date"]').first().fill('2025-04-15'); // Fill date directly
    
    // Add a small wait to ensure button state updates
    await page.waitForTimeout(500);
    
    // Wait for button to be enabled - check for class or disabled attribute
    await page.waitForSelector('button:has-text("Gerar Planejamento"):not(:disabled)', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-88-ac-5.png', fullPage: true });
    
    // Verify button is enabled
    const button = page.locator('button:has-text("Gerar Planejamento")');
    await expect(button).toBeEnabled();
  });
});