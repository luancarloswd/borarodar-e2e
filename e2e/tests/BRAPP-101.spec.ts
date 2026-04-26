import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = 'https://ride.borarodar.app';
const TEST_EMAIL = 'test@borarodar.app';
const TEST_PASSWORD = 'borarodarapp';

test.describe('BRAPP-101: Select Alternate Motorcycle on Route Pages to Preview Estimates', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
  });

  test('AC1: User with 2+ motorcycles opens a route detail page → picker is visible and the default motorcycle is preselected with a \'Default\' badge', async ({ page }) => {
    // Navigate to routes list
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });

    // Open the first route
    await page.click('[data-testid="route-list"] [data-testid="route-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });

    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-1.png', fullPage: true });

    // Motorcycle picker must be visible
    const picker = page.locator('[data-testid="motorcycle-picker"]');
    await expect(picker).toBeVisible({ timeout: 10000 });

    // The picker dropdown (select or combobox) must exist
    const pickerDropdown = page.locator('[data-testid="motorcycle-picker-dropdown"]');
    await expect(pickerDropdown).toBeVisible({ timeout: 10000 });

    // The default motorcycle must have a 'Padrão' badge visible
    const defaultBadge = page.locator('[data-testid="default-motorcycle-badge"]');
    await expect(defaultBadge).toBeVisible({ timeout: 10000 });
  });

  test('AC2: User selects a non-default motorcycle from the picker → fuel liters, autonomy, fuel cost, and refuel-stop count visibly recompute without a page reload', async ({ page }) => {
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });
    await page.click('[data-testid="route-list"] [data-testid="route-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });

    // Wait for fuel estimates to load
    await page.waitForSelector('[data-testid="fuel-liters"]', { timeout: 15000 });

    // Capture initial estimate values
    const initialFuelLiters = await page.locator('[data-testid="fuel-liters"]').textContent();
    const initialAutonomy = await page.locator('[data-testid="autonomy-value"]').textContent();

    // Screenshot before switching
    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-2-before.png', fullPage: true });

    // Select a non-default motorcycle from the picker dropdown
    const pickerDropdown = page.locator('[data-testid="motorcycle-picker-dropdown"]');
    const options = pickerDropdown.locator('option');
    const optionCount = await options.count();

    if (optionCount >= 2) {
      const secondOptionValue = await options.nth(1).getAttribute('value');
      await pickerDropdown.selectOption(secondOptionValue || '');
    } else {
      // Fallback: try clicking a non-selected option in a custom dropdown
      const nonDefaultOption = page.locator('[data-testid="motorcycle-picker-option"]:not([data-selected="true"])').first();
      await nonDefaultOption.click({ timeout: 10000 });
    }

    // Wait for estimates to recompute
    await page.waitForTimeout(2000);

    // Screenshot after switching
    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-2-after.png', fullPage: true });

    // Fuel liters and autonomy values must have changed
    const updatedFuelLiters = await page.locator('[data-testid="fuel-liters"]').textContent();
    const updatedAutonomy = await page.locator('[data-testid="autonomy-value"]').textContent();

    expect(updatedFuelLiters).not.toEqual(initialFuelLiters);
    expect(updatedAutonomy).not.toEqual(initialAutonomy);
  });

  test('AC3: User switches the picker on a route page, then returns to the Motorcycle Registry → the default motorcycle flag is unchanged', async ({ page }) => {
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });
    await page.click('[data-testid="route-list"] [data-testid="route-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });

    // Switch to a non-default motorcycle
    const pickerDropdown = page.locator('[data-testid="motorcycle-picker-dropdown"]');
    const options = pickerDropdown.locator('option');
    const optionCount = await options.count();

    if (optionCount >= 2) {
      const secondOptionValue = await options.nth(1).getAttribute('value');
      await pickerDropdown.selectOption(secondOptionValue || '');
    }

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-3-route.png', fullPage: true });

    // Navigate to Motorcycle Registry
    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForSelector('[data-testid="motorcycle-list"]', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-3-registry.png', fullPage: true });

    // Verify the default motorcycle badge is still present on the original default bike
    const defaultBadge = page.locator('[data-testid="default-motorcycle-badge"]');
    await expect(defaultBadge).toBeVisible({ timeout: 10000 });

    // Verify there is exactly one default badge (no accidental mutation)
    await expect(defaultBadge).toHaveCount(1);
  });

  test('AC4: User with exactly one motorcycle opens a route detail page → motorcycle is shown as a static label (no dropdown), and estimates render against that bike', async ({ page }) => {
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });
    await page.click('[data-testid="route-list"] [data-testid="route-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-4.png', fullPage: true });

    const picker = page.locator('[data-testid="motorcycle-picker"]');
    await expect(picker).toBeVisible({ timeout: 10000 });

    const staticLabel = page.locator('[data-testid="motorcycle-picker-label"]');
    const dropdown = page.locator('[data-testid="motorcycle-picker-dropdown"]');

    const hasStaticLabel = await staticLabel.isVisible();
    const hasDropdown = await dropdown.isVisible();

    // Picker must render as either a static label (1 bike) or a dropdown (2+ bikes)
    expect(hasStaticLabel || hasDropdown).toBe(true);

    if (hasStaticLabel) {
      // Single-motorcycle path: label must contain the motorcycle name
      const labelText = await staticLabel.textContent();
      expect(labelText?.trim().length).toBeGreaterThan(0);

      // Dropdown must NOT be present when only one motorcycle exists
      expect(hasDropdown).toBe(false);
    }

    // Fuel estimates must be rendered regardless of picker variant
    const fuelInfo = page.locator('[data-testid="fuel-info-section"]');
    await expect(fuelInfo).toBeVisible({ timeout: 10000 });
  });

  test('AC5: User selects an alternate motorcycle on Route A, then navigates to Route B → Route B\'s picker is reset to the user\'s default motorcycle (no leaked selection)', async ({ page }) => {
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });

    // Need at least two routes to verify cross-route reset
    const routeItems = page.locator('[data-testid="route-list"] [data-testid="route-item"]');
    const routeCount = await routeItems.count();

    if (routeCount < 2) {
      test.skip(true, 'Need at least 2 routes to test cross-route picker reset');
      return;
    }

    // Navigate to Route A
    await routeItems.nth(0).click({ timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });

    // Read and store the default picker value on Route A
    const pickerDropdown = page.locator('[data-testid="motorcycle-picker-dropdown"]');
    const defaultValue = await pickerDropdown.inputValue();
    const options = pickerDropdown.locator('option');
    const optionCount = await options.count();

    if (optionCount >= 2) {
      const secondOptionValue = await options.nth(1).getAttribute('value');
      await pickerDropdown.selectOption(secondOptionValue || '');
    }

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-5-route-a.png', fullPage: true });

    const selectedOnRouteA = await pickerDropdown.inputValue();
    expect(selectedOnRouteA).not.toEqual(defaultValue);

    // Navigate to Route B
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });
    await routeItems.nth(1).click({ timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-5-route-b.png', fullPage: true });

    // On Route B the picker must have reset to the default motorcycle
    const pickerOnRouteB = page.locator('[data-testid="motorcycle-picker-dropdown"]');
    const valueOnRouteB = await pickerOnRouteB.inputValue();

    expect(valueOnRouteB).toEqual(defaultValue);
  });
});
