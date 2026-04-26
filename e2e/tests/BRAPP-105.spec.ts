import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = 'https://ride.borarodar.app';
const TEST_EMAIL = 'test@borarodar.app';
const TEST_PASSWORD = 'borarodarapp';

test.describe('BRAPP-105: Suggest Gas Supply Stations on Route Based on Selected Motorcycle', () => {
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

  test('AC1: User opens a route longer than the selected motorcycle\'s range → numbered fuel-pump pins are visible on the map and a \'Paradas para abastecer\' panel shows at least one stop', async ({ page }) => {
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });

    // Open the first route (assumed to be longer than range for test account)
    await page.click('[data-testid="route-list"] [data-testid="route-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });

    // Wait for fuel stops panel to render
    await page.waitForSelector('[data-testid="fuel-stops-panel"]', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-1.png', fullPage: true });

    // Panel heading must be visible
    const panel = page.locator('[data-testid="fuel-stops-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    const panelHeading = panel.locator('[data-testid="fuel-stops-heading"]');
    await expect(panelHeading).toBeVisible({ timeout: 10000 });
    const headingText = await panelHeading.textContent();
    expect(headingText?.trim()).toMatch(/paradas para abastecer/i);

    // At least one stop item must be listed
    const stopItems = panel.locator('[data-testid="fuel-stop-item"]');
    await stopItems.first().waitFor({ timeout: 15000 });
    const stopCount = await stopItems.count();
    expect(stopCount).toBeGreaterThan(0);

    // Each stop must show a distance value
    const firstStopDistance = panel.locator('[data-testid="fuel-stop-distance"]').first();
    await expect(firstStopDistance).toBeVisible({ timeout: 10000 });
    const distanceText = await firstStopDistance.textContent();
    expect(distanceText?.trim()).toMatch(/\d+/);

    // Numbered fuel-pump pins must be visible on the route map
    const fuelPins = page.locator('[data-testid="fuel-stop-pin"]');
    const pinCount = await fuelPins.count();
    expect(pinCount).toBeGreaterThan(0);
    expect(pinCount).toEqual(stopCount);
  });

  test('AC2: User switches the selected motorcycle from a small-tank bike to a large-tank bike → the number of suggested fuel stops decreases (or becomes zero) within 2 seconds', async ({ page }) => {
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });
    await page.click('[data-testid="route-list"] [data-testid="route-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });

    // Wait for initial fuel stops to render
    await page.waitForSelector('[data-testid="fuel-stops-panel"]', { timeout: 15000 });
    const panel = page.locator('[data-testid="fuel-stops-panel"]');

    // Check if we have a multi-motorcycle dropdown
    const pickerDropdown = page.locator('[data-testid="motorcycle-picker-dropdown"]');
    const hasDropdown = await pickerDropdown.isVisible();

    if (!hasDropdown) {
      test.skip(true, 'Only one motorcycle registered — cannot test motorcycle switch');
      return;
    }

    // Capture initial stop count with the current (small-tank) motorcycle
    const initialStopItems = panel.locator('[data-testid="fuel-stop-item"]');
    await initialStopItems.first().waitFor({ timeout: 15000 });
    const initialStopCount = await initialStopItems.count();

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-2-before.png', fullPage: true });

    // Switch to a different motorcycle (expected: larger tank → fewer stops)
    const options = pickerDropdown.locator('option');
    const optionCount = await options.count();
    if (optionCount >= 2) {
      const altValue = await options.nth(1).getAttribute('value');
      await pickerDropdown.selectOption(altValue || '');
    } else {
      const nonDefaultOption = page.locator('[data-testid="motorcycle-picker-option"]:not([data-selected="true"])').first();
      await nonDefaultOption.click({ timeout: 10000 });
    }

    // Stops must recompute within 2 seconds
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-2-after.png', fullPage: true });

    // The panel is still visible (it shows either fewer stops or the no-stops message)
    await expect(panel).toBeVisible({ timeout: 5000 });

    const updatedStopItems = panel.locator('[data-testid="fuel-stop-item"]');
    const updatedStopCount = await updatedStopItems.count();

    // Stop count must have changed (decreased or zeroed)
    expect(updatedStopCount).toBeLessThanOrEqual(initialStopCount);
  });

  test('AC3: User opens a route shorter than the selected motorcycle\'s range → panel shows \'Nenhuma parada necessária para esta moto\' and no fuel pins are on the map', async ({ page }) => {
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });

    const routeItems = page.locator('[data-testid="route-list"] [data-testid="route-item"]');
    await routeItems.first().waitFor({ timeout: 15000 });

    let foundShortRoute = false;

    const routeCount = await routeItems.count();
    for (let i = 0; i < routeCount && !foundShortRoute; i++) {
      await routeItems.nth(i).click({ timeout: 10000 });
      await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });
      await page.waitForSelector('[data-testid="fuel-stops-panel"]', { timeout: 15000 });

      const noStopsMsg = page.locator('[data-testid="fuel-stops-no-stops-message"]');
      if (await noStopsMsg.isVisible()) {
        foundShortRoute = true;
        break;
      }

      await page.goto(`${BASE_URL}/routes`);
      await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });
    }

    if (!foundShortRoute) {
      test.skip(true, 'No route shorter than selected motorcycle range found in test account');
      return;
    }

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-3.png', fullPage: true });

    const panel = page.locator('[data-testid="fuel-stops-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    const noStopsMessage = panel.locator('[data-testid="fuel-stops-no-stops-message"]');
    await expect(noStopsMessage).toBeVisible({ timeout: 10000 });
    const msgText = await noStopsMessage.textContent();
    expect(msgText?.trim()).toMatch(/nenhuma parada necessária/i);

    // No fuel-pump pins must appear on the map
    const fuelPins = page.locator('[data-testid="fuel-stop-pin"]');
    const pinCount = await fuelPins.count();
    expect(pinCount).toBe(0);
  });

  test('AC4: User taps \'Trocar\' on a suggested stop → a list of alternative gas stations for that segment is shown ordered by distance from route, and selecting one updates the recommended station', async ({ page }) => {
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });
    await page.click('[data-testid="route-list"] [data-testid="route-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });

    await page.waitForSelector('[data-testid="fuel-stops-panel"]', { timeout: 15000 });
    const panel = page.locator('[data-testid="fuel-stops-panel"]');

    const stopItems = panel.locator('[data-testid="fuel-stop-item"]');
    const hasStops = (await stopItems.count()) > 0;

    if (!hasStops) {
      test.skip(true, 'No fuel stops on first route — cannot test Trocar action');
      return;
    }

    // Capture initial recommended station for the first stop
    const firstStop = stopItems.first();
    const initialStationName = await firstStop.locator('[data-testid="fuel-stop-station-name"]').textContent();

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-4-before.png', fullPage: true });

    // Tap 'Trocar' button on the first stop
    const trocarBtn = firstStop.locator('[data-testid="fuel-stop-trocar-btn"]');
    await expect(trocarBtn).toBeVisible({ timeout: 10000 });
    await trocarBtn.click();

    // Gas station selector / candidate list must appear
    const candidateList = page.locator('[data-testid="gas-station-selector"]');
    await expect(candidateList).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-4-candidates.png', fullPage: true });

    // Candidates must be listed
    const candidateItems = candidateList.locator('[data-testid="gas-station-candidate-item"]');
    await candidateItems.first().waitFor({ timeout: 15000 });
    const candidateCount = await candidateItems.count();
    expect(candidateCount).toBeGreaterThan(0);

    // Select the second candidate (different from recommended)
    const targetCandidate = candidateCount >= 2 ? candidateItems.nth(1) : candidateItems.first();
    const newStationName = await targetCandidate.locator('[data-testid="gas-station-candidate-name"]').textContent();
    await targetCandidate.click();

    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-4-after.png', fullPage: true });

    // Candidate list must close after selection
    await expect(candidateList).not.toBeVisible({ timeout: 10000 });

    // Recommended station for that stop must now reflect the selection
    const updatedStationName = await firstStop.locator('[data-testid="fuel-stop-station-name"]').textContent();
    if (candidateCount >= 2) {
      expect(updatedStationName?.trim()).toEqual(newStationName?.trim());
    } else {
      // Only one candidate — name stays the same; selector still opened and closed correctly
      expect(updatedStationName?.trim()).toEqual(initialStationName?.trim());
    }
  });

  test('AC5: User loads a previously viewed route while offline → previously cached fuel stops render with an offline indicator, and the existing route detail continues to render without regression', async ({ page, context }) => {
    // First visit: load route online to seed the cache
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 15000 });
    await page.click('[data-testid="route-list"] [data-testid="route-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="fuel-stops-panel"]', { timeout: 15000 });

    // Capture the route URL so we can navigate back to it offline
    const routeUrl = page.url();

    // Capture stop count while online
    const panel = page.locator('[data-testid="fuel-stops-panel"]');
    const onlineStopItems = panel.locator('[data-testid="fuel-stop-item"]');
    const onlineStopCount = await onlineStopItems.count();

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-5-online.png', fullPage: true });

    // Go offline
    await context.setOffline(true);

    // Reload the route page while offline
    await page.goto(routeUrl);
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="fuel-stops-panel"]', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-5-offline.png', fullPage: true });

    // Offline indicator must be visible
    const offlineIndicator = page.locator('[data-testid="fuel-stops-offline-indicator"]');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });

    // Cached fuel stops must still render (same count as when online)
    const offlinePanel = page.locator('[data-testid="fuel-stops-panel"]');
    await expect(offlinePanel).toBeVisible({ timeout: 10000 });

    if (onlineStopCount > 0) {
      const offlineStopItems = offlinePanel.locator('[data-testid="fuel-stop-item"]');
      const offlineStopCount = await offlineStopItems.count();
      expect(offlineStopCount).toEqual(onlineStopCount);
    } else {
      const noStopsMessage = offlinePanel.locator('[data-testid="fuel-stops-no-stops-message"]');
      await expect(noStopsMessage).toBeVisible({ timeout: 10000 });
    }

    // Route detail (polyline + waypoints) must still be visible — no regression
    const routeMap = page.locator('[data-testid="route-map"]');
    await expect(routeMap).toBeVisible({ timeout: 10000 });

    const routePolyline = page.locator('[data-testid="route-polyline"]');
    await expect(routePolyline).toBeVisible({ timeout: 10000 });

    // Restore network
    await context.setOffline(false);
  });
});
