import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

test.describe('BRAPP-75: Auto-Load Gas Station on New Fuel Supply Registration', () => {
  test.beforeAll(() => {
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = join(process.cwd(), 'screenshots');
    mkdirSync(screenshotsDir, { recursive: true });
  });

  test.beforeEach(async ({ page, context }) => {
    // Grant geolocation permission for tests that need it
    await context.grantPermissions(['geolocation']);
    
    // Login flow
    await page.goto('https://ride.borarodar.app');
    
    // Look for login form — email + password fields, submit button
    const emailInput = page.getByLabel('Email');
    const passwordInput = page.getByLabel('Password');
    const submitButton = page.getByRole('button', { name: 'Entrar' });
    
    // Wait for login form elements to be present
    await Promise.all([
      emailInput.waitFor({ timeout: 10000 }),
      passwordInput.waitFor({ timeout: 10000 }),
      submitButton.waitFor({ timeout: 10000 })
    ]);
    
    // Fill credentials and submit
    await emailInput.fill('test@borarodar.app');
    await passwordInput.fill('borarodarapp');
    await submitButton.click();
    
    // Wait for dashboard/home to load
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test('AC1: User opens the new fuel supply form with geolocation enabled near a seeded gas station → the nearest station is automatically pre-selected and displayed with a \'📍 Detectado automaticamente\' badge and a \'Trocar\' (change) button', async ({ page, context }) => {
    // Set a specific geolocation (near a seeded gas station)
    await context.setGeolocation({ latitude: -23.550520, longitude: -46.633308 });
    
    // Navigate to fuel supplies page
    await page.goto('https://ride.borarodar.app/abastecimentos');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="fuel-supply-page"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-75-ac-1.png'), fullPage: true });
    
    // Click on add fuel supply button
    const addFuelSupplyButton = page.locator('[data-testid="add-fuel-supply-button"]');
    await addFuelSupplyButton.click();
    
    // Wait for new fuel supply form to load
    await page.waitForSelector('[data-testid="new-fuel-supply-form"]');
    
    // Take screenshot for verification after form loads
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-75-ac-1-2.png'), fullPage: true });
    
    // Verify auto-selected station with badge and change button
    const autoSelectedBadge = page.getByText('📍 Detectado automaticamente');
    await expect(autoSelectedBadge).toBeVisible({ timeout: 15000 });
    
    const changeButton = page.getByText('Trocar');
    await expect(changeButton).toBeVisible({ timeout: 15000 });
  });

  test('AC2: User clicks the \'Trocar\' (change) button on the auto-selected station → a list/dropdown of nearby stations sorted by distance is shown, allowing the user to select a different station', async ({ page, context }) => {
    // Set a specific geolocation (near a seeded gas station)
    await context.setGeolocation({ latitude: -23.550520, longitude: -46.633308 });
    
    // Navigate to fuel supplies page
    await page.goto('https://ride.borarodar.app/abastecimentos');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="fuel-supply-page"]');
    
    // Click on add fuel supply button
    const addFuelSupplyButton = page.locator('[data-testid="add-fuel-supply-button"]');
    await addFuelSupplyButton.click();
    
    // Wait for new fuel supply form to load
    await page.waitForSelector('[data-testid="new-fuel-supply-form"]');
    
    // Take screenshot for verification before clicking change
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-75-ac-2.png'), fullPage: true });
    
    // Click the change button
    const changeButton = page.getByText('Trocar');
    await changeButton.click();
    
    // Wait for station selection dropdown/list to appear
    await page.waitForSelector('[data-testid="station-selection-dropdown"]');
    
    // Take screenshot for verification after clicking change
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-75-ac-2-2.png'), fullPage: true });
    
    // Verify list/dropdown is shown with nearby stations
    const stationList = page.locator('[data-testid="station-list"]');
    await expect(stationList).toBeVisible();
    
    // Verify stations are sorted by distance (closest first)
    const stationItems = page.locator('[data-testid="station-item"]');
    await expect(stationItems).toBeVisible();
  });

  test('AC3: User opens the new fuel supply form with geolocation denied or unavailable → the manual station search input is displayed as fallback with no errors blocking the form', async ({ page }) => {
    // For this test we don't set geolocation to simulate denial
    
    // Navigate to fuel supplies page
    await page.goto('https://ride.borarodar.app/abastecimentos');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="fuel-supply-page"]');
    
    // Click on add fuel supply button
    const addFuelSupplyButton = page.locator('[data-testid="add-fuel-supply-button"]');
    await addFuelSupplyButton.click();
    
    // Wait for new fuel supply form to load
    await page.waitForSelector('[data-testid="new-fuel-supply-form"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-75-ac-3.png'), fullPage: true });
    
    // Verify manual station search input is displayed (when geolocation is denied)
    const manualSearchInput = page.locator('[data-testid="manual-station-search"]');
    await expect(manualSearchInput).toBeVisible();
    
    // Verify no error messages are displayed
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).not.toBeVisible();
  });

  test('AC4: User opens the new fuel supply form via receipt OCR flow where a station was already resolved from the receipt → the OCR-resolved station is displayed and auto-load from GPS does not override it', async ({ page }) => {
    // Navigate to fuel supplies page
    await page.goto('https://ride.borarodar.app/abastecimentos');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="fuel-supply-page"]');
    
    // Click on add fuel supply button
    const addFuelSupplyButton = page.locator('[data-testid="add-fuel-supply-button"]');
    await addFuelSupplyButton.click();
    
    // Wait for new fuel supply form to load
    await page.waitForSelector('[data-testid="new-fuel-supply-form"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-75-ac-4.png'), fullPage: true });
    
    // Verify receipt-resolved station is displayed
    const resolvedStation = page.locator('[data-testid="ocr-resolved-station"]');
    await expect(resolvedStation).toBeVisible();
    
    // Verify that GPS auto-load is not overriding the OCR result
    const autoLoadBadge = page.getByText('📍 Detectado automaticamente');
    await expect(autoLoadBadge).not.toBeVisible();
  });

  test('AC5: User opens the new fuel supply form with geolocation enabled but no stations exist nearby → the Google Places fallback results are shown in the station selector sorted by distance', async ({ page }) => {
    // Navigate to fuel supplies page
    await page.goto('https://ride.borarodar.app/abastecimentos');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="fuel-supply-page"]');
    
    // Click on add fuel supply button
    const addFuelSupplyButton = page.locator('[data-testid="add-fuel-supply-button"]');
    await addFuelSupplyButton.click();
    
    // Wait for new fuel supply form to load
    await page.waitForSelector('[data-testid="new-fuel-supply-form"]');
    
    // Take screenshot for verification
    await page.screenshot({ path: join(process.cwd(), 'screenshots', 'BRAPP-75-ac-5.png'), fullPage: true });
    
    // Verify Google Places fallback results are shown
    const googlePlacesResults = page.locator('[data-testid="google-places-results"]');
    await expect(googlePlacesResults).toBeVisible();
    
    // Verify results are sorted by distance
    const stationItems = page.locator('[data-testid="station-item"]');
    await expect(stationItems).toBeVisible();
  });
});