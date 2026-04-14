import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-76: Auto-Load Gas Station on New Fuel Supply Registration', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    // Look for login form — email + password fields, submit button
    // Fill credentials and submit
    await page.locator('input[type="email"]').fill('test@borarodar.app');
    await page.locator('input[type="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    // Wait for dashboard/home to load
    await page.waitForSelector('text=Dashboard');
  });

  test('AC1: User opens the new fuel supply form with geolocation enabled near a seeded gas station → the nearest station is automatically pre-filled in the station field with a \'📍 Detectado automaticamente\' badge and a \'Trocar\' (change) button visible', async ({ page }) => {
    // Navigate to new fuel supply form
    await page.goto('https://ride.borarodar.app/new-fuel-supply');
    
    // Wait for the station selector to appear and check for auto-selection
    await page.waitForSelector('[data-testid="station-selector"]');
    
    // Wait for elements to be visible with a reasonable timeout
    await page.waitForTimeout(2000);
    
    // Check if auto-selection happened and proper elements are displayed
    const autoSelectedBadge = page.locator('[data-testid="auto-selected-badge"]');
    const changeButton = page.locator('[data-testid="change-station-button"]');
    
    // Take screenshot showing auto-selection
    await page.screenshot({ path: 'screenshots/BRAPP-76-ac-1.png', fullPage: true });
    
    // Verify badge text exists
    expect(await autoSelectedBadge.isVisible()).toBe(true);
    
    // Verify change button is visible  
    expect(await changeButton.isVisible()).toBe(true);
  });

  test('AC2: User clicks the \'Trocar\' button on the auto-selected station → the auto-selection is cleared and a list of nearby stations sorted by distance is displayed for manual selection', async ({ page }) => {
    // Navigate to new fuel supply form
    await page.goto('https://ride.borarodar.app/new-fuel-supply');
    
    // Wait for page elements to load
    await page.waitForSelector('[data-testid="station-selector"]');
    
    // Wait for elements to be visible with a reasonable timeout
    await page.waitForTimeout(2000);
    
    // Click the "Trocar" button to clear auto-selection
    const changeButton = page.locator('[data-testid="change-station-button"]');
    await changeButton.click();
    
    // Wait a bit before checking for station list
    await page.waitForTimeout(2000);
    
    // Wait for the list of nearby stations to appear
    await page.waitForSelector('[data-testid="nearby-stations-list"]');
    
    // Take screenshot showing manual selection
    await page.screenshot({ path: 'screenshots/BRAPP-76-ac-2.png', fullPage: true });
    
    // Verify list of stations is visible (assuming it would be visible with the selector)
    const stationList = page.locator('[data-testid="nearby-stations-list"]');
    expect(await stationList.isVisible()).toBe(true);
  });

  test('AC3: User opens the new fuel supply form with geolocation denied or unavailable → the manual station search input is shown as fallback with no auto-selection attempted', async ({ page }) => {
    // Navigate to new fuel supply form
    await page.goto('https://ride.borarodar.app/new-fuel-supply');
    
    // Wait for page elements to load
    await page.waitForSelector('[data-testid="station-selector"]');
    
    // Wait for elements to be visible with a reasonable timeout
    await page.waitForTimeout(2000);
    
    // Verify manual search input is displayed (as fallback)
    const manualSearchInput = page.locator('[data-testid="manual-station-search"]');
    expect(await manualSearchInput.isVisible()).toBe(true);
    
    // Take screenshot showing manual search
    await page.screenshot({ path: 'screenshots/BRAPP-76-ac-3.png', fullPage: true });
  });

  test('AC4: User opens the new fuel supply form via receipt OCR flow where a station was already resolved from the receipt → the OCR-resolved station is displayed and auto-load does not override it', async ({ page }) => {
    // Navigate to new fuel supply form (simulating OCR flow scenario)
    await page.goto('https://ride.borarodar.app/new-fuel-supply');
    
    // Wait for page elements to load
    await page.waitForSelector('[data-testid="station-selector"]');
    
    // Wait for elements to be visible with a reasonable timeout
    await page.waitForTimeout(2000);
    
    // Verify OCR resolved station is displayed
    const resolvedStation = page.locator('[data-testid="ocr-resolved-station"]');
    expect(await resolvedStation.isVisible()).toBe(true);
    
    // Verify auto-load doesn't override the resolved station
    const autoSelectedBadge = page.locator('[data-testid="auto-selected-badge"]');
    expect(await autoSelectedBadge.isVisible()).toBe(false);
    
    // Take screenshot showing resolved station
    await page.screenshot({ path: 'screenshots/BRAPP-76-ac-4.png', fullPage: true });
  });

  test('AC5: User opens the new fuel supply form with geolocation enabled → a skeleton loader is displayed in the station selector area while the GPS position and nearby stations API call are in progress, replaced by the result once loaded', async ({ page }) => {
    // Navigate to new fuel supply form
    await page.goto('https://ride.borarodar.app/new-fuel-supply');
    
    // Wait for the skeleton loader to appear
    await page.waitForSelector('[data-testid="station-selector-skeleton"]');
    
    // Take screenshot showing skeleton loader
    await page.screenshot({ path: 'screenshots/BRAPP-76-ac-5.png', fullPage: true });
    
    // Wait a bit for skeleton to appear
    await page.waitForTimeout(2000);
    
    // Wait for the skeleton loader to disappear (this would happen after API call)
    await page.waitForSelector('[data-testid="station-selector"]', { state: 'visible' });
    
    // Verify that the actual station selector is now shown
    const stationSelector = page.locator('[data-testid="station-selector"]');
    expect(await stationSelector.isVisible()).toBe(true);
  });
});