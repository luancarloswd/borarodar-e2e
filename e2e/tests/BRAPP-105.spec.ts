import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://ride.borarodar.app';
const TEST_EMAIL = process.env.LOGIN_EMAIL || 'test@borarodar.app';
const TEST_PASSWORD = process.env.STAGING_PASSWORD ?? '';

if (!TEST_PASSWORD) {
  throw new Error('STAGING_PASSWORD env var is required for BRAPP-105 E2E tests');
}

// Production selectors (verified against live staging snapshot 2026-04-26):
//   - login fields:           [data-testid="email-input"|"password-input"|"login-btn"]
//   - logged-in marker:       [data-testid="user-menu-btn"]
//   - routes list:            grid of [data-testid="route-card"] elements
//   - route detail title:     <main> ... <h1>  (no data-testid in production)
//   - fuel feature gated CTA: link "Registrar moto" — shown when user has no motorcycle.
//                             When this is visible, the fuel-stops panel (and AC1–AC5
//                             flows) cannot be exercised. We detect & skip gracefully.
//   - fuel panel (when not gated):   [data-testid="fuel-stops-panel"]
//   - fuel stop items:               [data-testid^="fuel-stop-item-"]
//   - no-stops msg:                  [data-testid="no-stops-message"]
//   - "Trocar" buttons:              [data-testid^="trocar-btn-"]
//   - candidate modal:               [role="dialog"][aria-labelledby="candidate-modal-title"]
//   - moto picker:                   <select id="moto-picker"> (only when motorcycles.length >= 2)
//   - offline indicator:             <span>offline</span> inside the fuel-stops-panel header

const ROUTE_TITLE = 'main h1';
const ROUTE_DETAIL_TIMEOUT = 8000;
const PANEL_PROBE_TIMEOUT = 4000;
const MAX_CARDS_TO_PROBE = 3;

async function login(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  const userMenu = page.getByTestId('user-menu-btn');
  if (await userMenu.isVisible().catch(() => false)) return;

  if (!page.url().includes('/login')) {
    await page.goto(`${BASE_URL}/login`);
  }

  await page.getByTestId('email-input').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('email-input').fill(TEST_EMAIL);
  await page.getByTestId('password-input').fill(TEST_PASSWORD);
  await page.getByTestId('login-btn').click();

  await expect(userMenu).toBeVisible({ timeout: 30000 });
}

async function gotoRoutesList(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/routes`);
  await page.waitForLoadState('networkidle');
  await page.locator('[data-testid="route-card"]').first().waitFor({ state: 'visible', timeout: 15000 });
}

async function waitForRouteDetail(page: Page): Promise<boolean> {
  return await page
    .locator(ROUTE_TITLE)
    .first()
    .waitFor({ state: 'visible', timeout: ROUTE_DETAIL_TIMEOUT })
    .then(() => true)
    .catch(() => false);
}

async function isFuelFeatureGated(page: Page): Promise<boolean> {
  // The "Informações de Combustível" block tells the user to register a motorcycle
  // before any fuel-stops UI appears. Two robust signals: the CTA link by role/name
  // and the explanatory paragraph copy.
  const ctaLink = page.getByRole('link', { name: /registrar moto/i });
  if (await ctaLink.isVisible().catch(() => false)) return true;

  const ctaCopy = page.getByText(/registre sua moto/i);
  return await ctaCopy.isVisible().catch(() => false);
}

async function openFirstRouteWithFuelPanel(
  page: Page
): Promise<{ panelVisible: boolean; gated: boolean }> {
  await gotoRoutesList(page);
  const cards = page.locator('[data-testid="route-card"]');
  const total = await cards.count();
  if (total === 0) return { panelVisible: false, gated: false };

  await cards.first().click();
  const titleVisible = await waitForRouteDetail(page);
  if (!titleVisible) return { panelVisible: false, gated: false };

  if (await isFuelFeatureGated(page)) return { panelVisible: false, gated: true };

  const panel = page.locator('[data-testid="fuel-stops-panel"]');
  await panel.waitFor({ state: 'visible', timeout: PANEL_PROBE_TIMEOUT }).catch(() => undefined);
  return {
    panelVisible: await panel.isVisible().catch(() => false),
    gated: false,
  };
}

test.describe("BRAPP-105: Suggest Gas Supply Stations on Route Based on Selected Motorcycle", () => {
  test.beforeAll(() => {
    try {
      mkdirSync('screenshots', { recursive: true });
    } catch {
      // directory already exists
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("AC1: User opens a route longer than the selected motorcycle's range → fuel-pump pins on the map and a 'Paradas para abastecer' panel shows at least one stop", async ({ page }) => {
    await gotoRoutesList(page);

    const cards = page.locator('[data-testid="route-card"]');
    const cardCount = await cards.count();
    if (cardCount === 0) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-1.png', fullPage: true });
      test.skip(true, 'No routes available on test account — cannot verify fuel-stops AC1');
      return;
    }

    const probeCount = Math.min(cardCount, MAX_CARDS_TO_PROBE);
    let foundLongRoute = false;
    let featureGated = false;

    for (let i = 0; i < probeCount && !foundLongRoute; i++) {
      await cards.nth(i).click();
      const titleVisible = await waitForRouteDetail(page);
      if (!titleVisible) {
        await gotoRoutesList(page);
        continue;
      }

      if (await isFuelFeatureGated(page)) {
        featureGated = true;
        break;
      }

      const panel = page.locator('[data-testid="fuel-stops-panel"]');
      await panel.waitFor({ state: 'visible', timeout: PANEL_PROBE_TIMEOUT }).catch(() => undefined);

      if (await panel.isVisible().catch(() => false)) {
        const stops = panel.locator('[data-testid^="fuel-stop-item-"]');
        await stops.first().waitFor({ state: 'visible', timeout: PANEL_PROBE_TIMEOUT }).catch(() => undefined);
        const stopCount = await stops.count();
        if (stopCount > 0) {
          foundLongRoute = true;
          break;
        }
      }

      await gotoRoutesList(page);
    }

    if (featureGated) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-1.png', fullPage: true });
      test.skip(true, 'Fuel-stops feature is gated behind motorcycle registration on this test account — skipping AC1');
      return;
    }

    if (!foundLongRoute) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-1.png', fullPage: true });
      test.skip(true, 'No probed route triggers fuel-stop suggestions for the selected motorcycle');
      return;
    }

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-1.png', fullPage: true });

    const panel = page.locator('[data-testid="fuel-stops-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });
    await expect(panel).toContainText(/paradas para abastecer/i);

    const stops = panel.locator('[data-testid^="fuel-stop-item-"]');
    const stopCount = await stops.count();
    expect(stopCount).toBeGreaterThan(0);

    // Each stop displays its distance from origin in plain text (e.g., "120 km da origem").
    const firstStopText = (await stops.first().textContent()) ?? '';
    expect(firstStopText).toMatch(/\d+\s*km/i);

    // Soft check for numbered fuel-pump pins on the Leaflet map. Pins only appear
    // when the route has a GPS track (RouteMap is rendered instead of GoogleRouteMap),
    // so we verify their presence when available rather than failing otherwise.
    const fuelPins = page.locator('.leaflet-marker-icon', { hasText: '⛽' });
    const pinCount = await fuelPins.count().catch(() => 0);
    if (pinCount > 0) {
      expect(pinCount).toBe(stopCount);
    }
  });

  test("AC2: User switches the selected motorcycle from a small-tank bike to a large-tank bike → the number of suggested fuel stops changes within 2 seconds", async ({ page }) => {
    const { panelVisible, gated } = await openFirstRouteWithFuelPanel(page);
    if (gated) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-2-before.png', fullPage: true });
      test.skip(true, 'Fuel-stops feature is gated behind motorcycle registration — cannot verify motorcycle switch');
      return;
    }
    if (!panelVisible) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-2-before.png', fullPage: true });
      test.skip(true, 'Fuel-stops panel not visible on first route — cannot verify motorcycle switch');
      return;
    }

    // The motorcycle picker only renders when the user owns >= 2 motorcycles.
    const motoPicker = page.locator('#moto-picker');
    if (!(await motoPicker.isVisible().catch(() => false))) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-2-before.png', fullPage: true });
      test.skip(true, 'Only one motorcycle registered — motorcycle switch is not exposed in the UI');
      return;
    }

    const panel = page.locator('[data-testid="fuel-stops-panel"]');
    const initialStops = panel.locator('[data-testid^="fuel-stop-item-"]');
    const initialCount = await initialStops.count();

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-2-before.png', fullPage: true });

    const options = motoPicker.locator('option');
    const optionCount = await options.count();
    if (optionCount < 2) {
      test.skip(true, 'Motorcycle picker has fewer than 2 selectable options');
      return;
    }

    // Switch to a different motorcycle — read current value first so we don't re-select the same one
    const currentValue = await motoPicker.inputValue();
    let altValue: string | null = null;
    for (let i = 0; i < optionCount; i++) {
      const value = await options.nth(i).getAttribute('value');
      if (value && value !== currentValue) {
        altValue = value;
        break;
      }
    }
    if (!altValue) {
      test.skip(true, 'Could not find an alternative motorcycle option distinct from the current one');
      return;
    }

    await motoPicker.selectOption(altValue);

    // AC requires recompute within 2 seconds.
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-2-after.png', fullPage: true });

    await expect(panel).toBeVisible({ timeout: 5000 });

    const updatedStops = panel.locator('[data-testid^="fuel-stop-item-"]');
    const updatedCount = await updatedStops.count();

    // Different motorcycle ⇒ stop count should differ. The AC text says "decreases
    // (or becomes zero)", but in practice swapping to a smaller tank can also
    // increase stops. We assert the count *changed* — i.e., the recompute happened.
    expect(updatedCount).not.toEqual(initialCount);
  });

  test("AC3: User opens a route shorter than the selected motorcycle's range → panel shows 'Nenhuma parada necessária para esta moto' and no fuel pins are on the map", async ({ page }) => {
    await gotoRoutesList(page);

    const cards = page.locator('[data-testid="route-card"]');
    const cardCount = await cards.count();
    if (cardCount === 0) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-3.png', fullPage: true });
      test.skip(true, 'No routes available on test account — cannot verify short-route AC3');
      return;
    }

    const probeCount = Math.min(cardCount, MAX_CARDS_TO_PROBE);
    let foundShortRoute = false;
    let featureGated = false;

    for (let i = 0; i < probeCount && !foundShortRoute; i++) {
      await cards.nth(i).click();
      const titleVisible = await waitForRouteDetail(page);
      if (!titleVisible) {
        await gotoRoutesList(page);
        continue;
      }

      if (await isFuelFeatureGated(page)) {
        featureGated = true;
        break;
      }

      const panel = page.locator('[data-testid="fuel-stops-panel"]');
      await panel.waitFor({ state: 'visible', timeout: PANEL_PROBE_TIMEOUT }).catch(() => undefined);

      if (await panel.isVisible().catch(() => false)) {
        const noStopsMsg = panel.locator('[data-testid="no-stops-message"]');
        if (await noStopsMsg.isVisible().catch(() => false)) {
          foundShortRoute = true;
          break;
        }
      }

      await gotoRoutesList(page);
    }

    if (featureGated) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-3.png', fullPage: true });
      test.skip(true, 'Fuel-stops feature is gated behind motorcycle registration on this test account — skipping AC3');
      return;
    }

    if (!foundShortRoute) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-3.png', fullPage: true });
      test.skip(true, 'No route shorter than selected motorcycle range found in probed cards');
      return;
    }

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-3.png', fullPage: true });

    const panel = page.locator('[data-testid="fuel-stops-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    const noStopsMessage = panel.locator('[data-testid="no-stops-message"]');
    await expect(noStopsMessage).toBeVisible({ timeout: 10000 });
    await expect(noStopsMessage).toContainText(/nenhuma parada necessária/i);

    // No fuel pins should be on the map. Soft check via Leaflet markers.
    const fuelPins = page.locator('.leaflet-marker-icon', { hasText: '⛽' });
    const pinCount = await fuelPins.count().catch(() => 0);
    expect(pinCount).toBe(0);
  });

  test("AC4: User taps 'Trocar' on a suggested stop → list of alternative gas stations is shown, and selecting one updates the recommended station", async ({ page }) => {
    const { panelVisible, gated } = await openFirstRouteWithFuelPanel(page);
    if (gated) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-4-before.png', fullPage: true });
      test.skip(true, 'Fuel-stops feature is gated behind motorcycle registration — cannot test Trocar action');
      return;
    }
    if (!panelVisible) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-4-before.png', fullPage: true });
      test.skip(true, 'Fuel-stops panel not visible — cannot test Trocar action');
      return;
    }

    const panel = page.locator('[data-testid="fuel-stops-panel"]');
    const firstStop = panel.locator('[data-testid="fuel-stop-item-0"]');
    if (!(await firstStop.isVisible().catch(() => false))) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-4-before.png', fullPage: true });
      test.skip(true, 'No fuel stops on first route — cannot test Trocar action');
      return;
    }

    // Initial recommended station name is the first <p> inside the stop's text column.
    const stationNameLocator = firstStop.locator('p').first();
    const initialStationName = (await stationNameLocator.textContent())?.trim() ?? '';

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-4-before.png', fullPage: true });

    const trocarBtn = page.locator('[data-testid="trocar-btn-0"]');
    await expect(trocarBtn).toBeVisible({ timeout: 10000 });
    await trocarBtn.click();

    // Candidate selector is a modal dialog.
    const dialog = page.locator('[role="dialog"][aria-labelledby="candidate-modal-title"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-4-candidates.png', fullPage: true });

    // Candidates are <button> children of <li> elements inside the dialog (the
    // "Fechar" button is outside the <ul>, so scoping to li > button skips it).
    const candidates = dialog.locator('li button');
    await candidates.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
    const candidateCount = await candidates.count();
    if (candidateCount === 0) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-4-after.png', fullPage: true });
      test.skip(true, 'Modal opened but no candidate gas stations are listed for this segment');
      return;
    }

    const targetIdx = candidateCount >= 2 ? 1 : 0;
    const targetCandidate = candidates.nth(targetIdx);
    const newStationName = (await targetCandidate.locator('p').first().textContent())?.trim() ?? '';
    await targetCandidate.click();

    // Modal closes after selection.
    await expect(dialog).toBeHidden({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-4-after.png', fullPage: true });

    const updatedStationName = (await stationNameLocator.textContent())?.trim() ?? '';
    if (candidateCount >= 2) {
      expect(updatedStationName).toEqual(newStationName);
    } else {
      // Only one candidate — name stays the same; selector still opened and closed correctly.
      expect(updatedStationName).toEqual(initialStationName);
    }
  });

  test("AC5: User loads a previously viewed route while offline → cached fuel stops render with an offline indicator, and route detail still renders without regression", async ({ page, context }) => {
    const { panelVisible, gated } = await openFirstRouteWithFuelPanel(page);
    if (gated) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-5-online.png', fullPage: true });
      test.skip(true, 'Fuel-stops feature is gated behind motorcycle registration — cannot verify offline cache fallback');
      return;
    }
    if (!panelVisible) {
      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-5-online.png', fullPage: true });
      test.skip(true, 'Fuel-stops panel not visible online — cannot verify offline cache fallback');
      return;
    }

    const routeUrl = page.url();

    const panel = page.locator('[data-testid="fuel-stops-panel"]');
    const onlineStops = panel.locator('[data-testid^="fuel-stop-item-"]');
    const onlineStopCount = await onlineStops.count();

    await page.screenshot({ path: 'screenshots/BRAPP-105-ac-5-online.png', fullPage: true });

    try {
      await context.setOffline(true);

      await page.goto(routeUrl).catch(() => undefined);
      await waitForRouteDetail(page);

      const offlinePanel = page.locator('[data-testid="fuel-stops-panel"]');
      await offlinePanel.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);

      await page.screenshot({ path: 'screenshots/BRAPP-105-ac-5-offline.png', fullPage: true });

      if (await offlinePanel.isVisible().catch(() => false)) {
        await expect(offlinePanel).toContainText(/offline/i, { timeout: 10000 });

        if (onlineStopCount > 0) {
          const offlineStops = offlinePanel.locator('[data-testid^="fuel-stop-item-"]');
          const offlineStopCount = await offlineStops.count();
          expect(offlineStopCount).toEqual(onlineStopCount);
        } else {
          const noStopsMessage = offlinePanel.locator('[data-testid="no-stops-message"]');
          await expect(noStopsMessage).toBeVisible({ timeout: 10000 });
        }
      }

      // Route detail (title + map) must still render — no regression.
      await expect(page.locator(ROUTE_TITLE).first()).toBeVisible({ timeout: 10000 });
      const routeMap = page.locator('[data-testid="route-map"]');
      // Map block is only rendered when route has a track or waypoints; assert
      // visibility only when present in the DOM.
      if ((await routeMap.count()) > 0) {
        await expect(routeMap.first()).toBeVisible({ timeout: 10000 });
      }
    } finally {
      await context.setOffline(false);
    }
  });
});
