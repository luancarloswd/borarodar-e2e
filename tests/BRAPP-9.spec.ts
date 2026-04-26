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
    test.skip(!process.env.LOGIN_EMAIL || !process.env.LOGIN_PASSWORD,
      'Skipping: set LOGIN_EMAIL and LOGIN_PASSWORD to run E2E tests');
    await page.goto(BASE_URL || 'https://ride.borarodar.app');

    // Login flow
    if (LOGIN_EMAIL && LOGIN_PASSWORD) {
      await page.fill('input[name="email"], input[type="email"]', LOGIN_EMAIL);
      await page.fill('input[name="password"], input[type="password"]', LOGIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }
  });

  test('AC1: A single \'Run\' button/icon is visible across all pages within the bottom navigation bar or header.', async ({ page }) => {
    // Find all elements that could be the 'Run' button/icon
    // We look for text 'Run', 'Iniciar', or specific icons associated with running.
    // Since the requirement is that only ONE is visible, we count only visible matches.
    const runButtons = page.locator('button:has-text("Run"):visible, button:has-text("Iniciar"):visible, .run-button:visible, .nav-run-icon:visible');

    // Count visible run buttons
    const visibleRunButtonsCount = await runButtons.count();
    
    expect(visibleRunButtonsCount).toBe(1);
    
    await page.screenshot({ path: 'screenshots/BRAPP-9-ac-1.png', fullPage: true });
  });

  test('AC2: User clicks the "Run" button/icon -> the unified ride-start page is displayed.', async ({ page }) => {
    const runButton = page.locator('button:has-text("Run"), button:has-text("Iniciar"), .run-button, .nav-run-icon').first();
    
    await runButton.click();
    
    // Verify we are on the unified ride-start page (checking for a unique element or URL)
    await expect(page).toHaveURL(/.*ride-start|.*inicio|.*start/);
    await page.waitForSelector('h1, h2', { state: 'visible' }); 
    
    await page.screenshot({ path: 'screenshots/BRAPP-9-ac-2.png', fullPage: true });
  });

  test('AC3: User initiates ride creation and completes required fields without specifying an end timestamp -> the ride is successfully created.', async ({ page }) => {
    // Navigate to ride start
    await page.goto((BASE_URL || 'https://ride.borarodar.app') + '/ride-start');

    // Fill in required fields (placeholders as actual field names are unknown)
    await page.fill('input[name="title"], .title-input', 'My Ride');
    
    // Explicitly ensuring end timestamp field is empty/not filled
    const endTimestampField = page.locator('input[name*="end"], .end-timestamp').first();
    if (await endTimestampField.isVisible()) {
      await endTimestampField.clear();
    }

    await page.click('button:has-text("Create"), button:has-text("Criar"), .submit-button');

    // Step 4: Verify success
    await page.waitForLoadState('domcontentloaded');

    // Check for success message
    const successIndicator = page.getByText(/success|sucesso/i);
    await expect(successIndicator).toBeVisible();

    await page.screenshot({ path: 'screenshots/BRAPP-9-ac-3.png', fullPage: true });
  });
});
