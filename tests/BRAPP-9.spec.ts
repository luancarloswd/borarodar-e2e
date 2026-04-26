import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const { BASE_URL, LOGIN_EMAIL, LOGIN_PASSWORD } = process.env;

if (!BASE_URL || !LOGIN_EMAIL || !LOGIN_PASSWORD) {
  test.skip(
    'Skipping BRAPP-9 tests: Required environment variables (BASE_URL, LOGIN_EMAIL, LOGIN_PASSWORD) are not set.',
    { annotation: { type: 'error', description: 'Missing env vars' } }
  );
}

test.describe('BRAPP-9: Consolidate Run Button & Fix endLocation Timestamp Validation', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL!);
    
    // Login flow
    await page.locator('input[name="email"], input[type="email"], [placeholder*="Email"]').fill(LOGIN_EMAIL!);
    await page.locator('input[name="password"], input[type="password"], [placeholder*="Password"]').fill(LOGIN_PASSWORD!);
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Entrar")').click();
    
    // Wait for dashboard/home to load (assuming URL change or specific element)
    await page.waitForLoadState('domcontentloaded');
  });

  test('AC1: User navigates to the application homepage ╬ô├Ñ├å only one \'Run\' button/icon is visible.', async ({ page }) => {
    // Find all elements that could be the 'Run' button/icon
    // We look for text 'Run', 'Iniciar', or specific icons associated with running.
    // Since the requirement is that only ONE is visible, we count only visible matches.
    const runButtons = page.locator('button:has-text("Run"):visible, button:has-text("Iniciar"):visible, .run-button:visible, .nav-run-icon:visible');
    
    // Count visible run buttons
    const visibleRunButtonsCount = await runButtons.count();
    
    expect(visibleRunButtonsCount).toBe(1);
    
    await page.screenshot({ path: 'screenshots/BRAPP-9-ac-1.png', fullPage: true });
  });

  test('AC2: User clicks the \'Run\' button/icon ╬ô├Ñ├å the unified ride-start page is displayed.', async ({ page }) => {
    const runButton = page.locator('button:has-text("Run"), button:has-text("Iniciar"), .run-button, .nav-run-icon').first();
    
    await runButton.click();
    
    // Verify we are on the unified ride-start page (checking for a unique element or URL)
    // Assuming the URL changes to something containing '/ride-start' or a specific header appears.
    await expect(page).toHaveURL(/.*ride-start|.*inicio|.*start/);
    await page.waitForSelector('h1, h2', { state: 'visible' }); // Wait for some header to be visible
    
    await page.screenshot({ path: 'screenshots/BRAPP-9-ac-2.png', fullPage: true });
  });

  test('AC3: User initiates ride creation and completes required fields without specifying an end timestamp ╬ô├Ñ├å the ride is successfully created.', async ({ page }) => {
    // Navigate to ride start if not already there
    // Assuming there are fields for the ride creation
    
    // Step 1: Fill required fields (excluding end timestamp)
    // We look for existing forms. Since implementation details are hidden, we attempt to find common fields.
    // This part is highly dependent on the actual UI.
    
    // Check if we are on the start page
    await expect(page.locator('body')).toBeVisible();

    // Grant geolocation permissions to avoid failures in headless runs
    const context = page.context();
    await context.grantPermissions(['geolocation']);

    // If there's a button to 'Start' or 'Create' the ride
    const startButton = page.locator('button:has-text("Start"), button:has-text("Iniciar"), button:has-text("Criar")');
    
    if (await startButton.count() > 0) {
        await startButton.click();
    }

    // Step 2: Complete other required fields (e.g., name, description)
    // This is speculative.
    const nameField = page.locator('input[name="name"], input[placeholder*="Name"]');
    if (await nameField.count() > 0) {
        await nameField.fill('Test Ride');
    }

    // Step 3: Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Confirmar")');
    if (await submitButton.count() > 0) {
        await submitButton.click();
    }

    // Step 4: Verify success (e.g., redirection or success message)
    // We wait for a success indicator or for the URL to change back to a list/dashboard
    await page.waitForLoadState('dompostload');
    
    // Check for success message in supported languages
    const successIndicator = page.getByText(/success|sucesso|concluΓö£┬ído/i);
    await expect(successIndicator).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/BRAPP-9-ac-3.png', fullPage: true });
  });
});
