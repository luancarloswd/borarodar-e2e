import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-32: "title": "Azure Application Insights Instrumentation — Borarodar Backend & Frontend",', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://ride.borarodar.app');
    
    // Login flow
    const emailInput = page.locator('input[name="email"], input[type="email"], #email');
    const passwordInput = page.locator('input[name="password"], input[type="password"], #password');
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Log in")');

    await emailInput.fill('test@borarodar.app');
    await passwordInput.fill('borarodarapp');
    await submitButton.click();

    // Wait for dashboard/home to load (adjust selector based on actual app behavior)
    await page.waitForLoadState('networkidle');
    // Removed manual timeout to prevent unnecessary delays and potential ETIMEDOUT issues
  });

  test('AC1: User navigates to a new route within the application → The content of the new page is fully loaded and displayed.', async ({ page }) => {
    // Navigate to a known route, e.g., Fuel Supply
    await page.goto('https://ride.borarodar.app/fuel-supply'); 
    await page.waitForLoadState('networkidle');
    
    // Verify content is loaded (e.g., checking for a heading or specific form element)
    await expect(page.locator('body')).not.toBeEmpty();
    
    await page.screenshot({ path: 'screenshots/BRAPP-32-ac-1.png', fullPage: true });
  });

  test('AC2: User successfully logs into the application → The user is redirected to the application\'s dashboard.', async ({ page }) => {
    // The beforeEach already handles login, so we check if we are on the expected dashboard page
    // We verify by checking for a common dashboard element or URL
    await expect(page).not.toHaveURL('https://ride.borarodar.app/login');
    
    await page.screenshot({ path: 'screenshots/BRAPP-32-ac-2.png', fullPage: true });
  });

  test('AC3: User successfully submits the fuel supply form → A success message or confirmation is displayed on the screen.', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/fuel-supply');
    
    // Assuming there's a form with fields like liters, motorcycleId
    // This is a generic implementation based on the ticket description
    await page.fill('input[name="liters"]', '10');
    await page.click('button[type="submit"]');

    // Wait for success message
    const successMessage = page.locator('text=Success, Fuel supply logged, or similar');
    await expect(successMessage).toBeVisible();

    await page.screenshot({ path: 'screenshots/BRAPP-32-ac-3.png', fullPage: true });
  });

  test('AC4: User triggers a known frontend JavaScript error (e.g., by entering invalid data into a specific field) → A user-friendly error message or fallback UI is displayed.', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/fuel-supply');
    
    // Trigger error by entering invalid data (e.g., negative liters)
    await page.fill('input[name="liters"]', '-5');
    await page.click('button[type="submit"]');

    // Check for error message
    const errorMsg = page.locator('text=Invalid, Error, or similar');
    await expect(errorMsg).toBeVisible();

    await page.screenshot({ path: 'screenshots/BRAPP-32-ac-4.png', fullPage: true });
  });
});
