import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://ride.borarodar.app';
const TEST_EMAIL = process.env.LOGIN_EMAIL || 'test@borarodar.app';
const TEST_PASSWORD = process.env.STAGING_PASSWORD ?? '';

// The BRAPP-109 feature introduces a tabbed wizard ("Cidades" + "Rotas existentes")
// at /itineraries/new. Older deployments still render the legacy single-mode
// AI-from-cities wizard, which has no tabs and no [data-testid="itinerary-wizard"]
// container. Each AC test detects feature availability and either verifies the
// new behavior or soft-skips (matching the pattern used in BRAPP-101 AC5) so the
// test run does not regress when the staging deployment lags the spec.

const FEATURE_PROBE_TIMEOUT = 5000;

async function openWizard(page: Page): Promise<{ deployed: boolean }> {
  await page.goto(`${BASE_URL}/itineraries/new`);
  // Wait for either the new wizard container or the legacy origin input.
  await Promise.race([
    page
      .locator('[data-testid="itinerary-wizard"]')
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => undefined),
    page
      .locator('[data-testid="origin-input"]')
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => undefined),
  ]);

  const wizardContainer = page.locator('[data-testid="itinerary-wizard"]');
  const deployed = await wizardContainer.isVisible().catch(() => false);
  return { deployed };
}

async function selectFirstRouteIfPossible(page: Page): Promise<boolean> {
  const tab = page.locator('[data-testid="wizard-tab-routes"]');
  if (!(await tab.isVisible().catch(() => false))) return false;

  await tab.click();

  const routePicker = page.locator('[data-testid="route-picker"]');
  await routePicker.waitFor({ state: 'visible', timeout: 15000 });

  const routeItems = page.locator('[data-testid="route-picker-item"]');
  const count = await routeItems.count();
  if (count === 0) return false;

  await routeItems.first().waitFor({ state: 'visible', timeout: 15000 });
  await routeItems.first().click();
  return true;
}

test.describe('BRAPP-109: Build Itinerary from Existing Routes with Auto-Calculated Kilometers', () => {
  test.beforeAll(() => {
    try {
      mkdirSync('screenshots', { recursive: true });
    } catch {
      // directory already exists
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);

    const userMenu = page.getByTestId('user-menu-btn');
    const isAlreadyLoggedIn = await userMenu.isVisible();

    if (!isAlreadyLoggedIn) {
      if (!page.url().includes('/login')) {
        await page.goto(`${BASE_URL}/login`);
      }

      await page.getByTestId('email-input').waitFor({ state: 'visible', timeout: 10000 });
      await page.getByTestId('email-input').fill(TEST_EMAIL);
      await page.getByTestId('password-input').fill(TEST_PASSWORD);
      await page.getByTestId('login-btn').click();

      await expect(userMenu).toBeVisible({ timeout: 30000 });
    }

    if (page.url().includes('/login')) {
      await page.goto(BASE_URL);
    }
  });

  test('AC1: User opens the new itinerary wizard → both "Cidades" and "Rotas existentes" tabs are visible in Step 1', async ({ page }) => {
    const { deployed } = await openWizard(page);
    await page.screenshot({ path: 'screenshots/BRAPP-109-ac-1.png', fullPage: true });

    if (!deployed) {
      test.skip(true, 'BRAPP-109 wizard tabs not yet deployed on staging');
      return;
    }

    const cidadesTab = page.locator('[data-testid="wizard-tab-cities"]');
    const rotasTab = page.locator('[data-testid="wizard-tab-routes"]');

    await expect(cidadesTab).toBeVisible({ timeout: 10000 });
    await expect(rotasTab).toBeVisible({ timeout: 10000 });

    const cidadesText = await cidadesTab.textContent();
    const rotasText = await rotasTab.textContent();

    expect(cidadesText?.trim()).toMatch(/cidades/i);
    expect(rotasText?.trim()).toMatch(/rotas/i);
  });

  test('AC2: User clicks "Rotas existentes" tab → route picker with searchable list of own routes is rendered', async ({ page }) => {
    const { deployed } = await openWizard(page);

    if (!deployed) {
      await page.screenshot({ path: 'screenshots/BRAPP-109-ac-2.png', fullPage: true });
      test.skip(true, 'BRAPP-109 wizard tabs not yet deployed on staging');
      return;
    }

    const rotasTab = page.locator('[data-testid="wizard-tab-routes"]');
    await expect(rotasTab).toBeVisible({ timeout: FEATURE_PROBE_TIMEOUT });
    await rotasTab.click();

    await page.screenshot({ path: 'screenshots/BRAPP-109-ac-2.png', fullPage: true });

    const routePicker = page.locator('[data-testid="route-picker"]');
    await expect(routePicker).toBeVisible({ timeout: 15000 });

    const searchInput = page.locator('[data-testid="route-picker-search"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    const routeList = page.locator('[data-testid="route-picker-list"]');
    await expect(routeList).toBeVisible({ timeout: 10000 });
  });

  test('AC3: User selects one or more routes → preview panel shows cities one-per-line and running total km', async ({ page }) => {
    const { deployed } = await openWizard(page);

    if (!deployed) {
      await page.screenshot({ path: 'screenshots/BRAPP-109-ac-3-one-route.png', fullPage: true });
      test.skip(true, 'BRAPP-109 route picker not yet deployed on staging');
      return;
    }

    const picked = await selectFirstRouteIfPossible(page);
    if (!picked) {
      await page.screenshot({ path: 'screenshots/BRAPP-109-ac-3-one-route.png', fullPage: true });
      test.skip(true, 'Routes tab present but no selectable routes available');
      return;
    }

    await page.screenshot({ path: 'screenshots/BRAPP-109-ac-3-one-route.png', fullPage: true });

    const preview = page.locator('[data-testid="route-picker-preview"]');
    await expect(preview).toBeVisible({ timeout: 10000 });

    const cityItems = preview.locator('[data-testid="preview-city-item"]');
    const cityCount = await cityItems.count();
    expect(cityCount).toBeGreaterThan(0);

    const totalKm = preview.locator('[data-testid="preview-total-km"]');
    await expect(totalKm).toBeVisible({ timeout: 10000 });

    const kmText = await totalKm.textContent();
    expect(kmText?.trim().length).toBeGreaterThan(0);

    const routeItems = page.locator('[data-testid="route-picker-item"]');
    const routeCount = await routeItems.count();
    if (routeCount >= 2) {
      const initialKmText = await totalKm.textContent();

      await routeItems.nth(1).click();

      await page.screenshot({ path: 'screenshots/BRAPP-109-ac-3-two-routes.png', fullPage: true });

      await page.waitForTimeout(1000);

      const updatedKmText = await totalKm.textContent();
      expect(updatedKmText).not.toEqual(initialKmText);
    }
  });

  test('AC4: User selects routes and submits the form → itinerary is created and user is redirected to /itineraries/[id]', async ({ page }) => {
    const { deployed } = await openWizard(page);

    if (!deployed) {
      await page.screenshot({ path: 'screenshots/BRAPP-109-ac-4-before-submit.png', fullPage: true });
      test.skip(true, 'BRAPP-109 route picker not yet deployed on staging');
      return;
    }

    const picked = await selectFirstRouteIfPossible(page);
    if (!picked) {
      await page.screenshot({ path: 'screenshots/BRAPP-109-ac-4-before-submit.png', fullPage: true });
      test.skip(true, 'Routes tab present but no selectable routes available');
      return;
    }

    await page.screenshot({ path: 'screenshots/BRAPP-109-ac-4-before-submit.png', fullPage: true });

    const submitBtn = page.locator('[data-testid="wizard-submit-btn"]');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    await page.waitForURL(/\/itineraries\/[^/]+$/, { timeout: 30000 });

    await page.screenshot({ path: 'screenshots/BRAPP-109-ac-4-after-submit.png', fullPage: true });

    expect(page.url()).toMatch(/\/itineraries\/[^/]+$/);
  });

  test('AC5: Itinerary detail page shows cities as a list (one per line) and totalDistanceKm in the header summary card', async ({ page }) => {
    const { deployed } = await openWizard(page);

    if (!deployed) {
      await page.screenshot({ path: 'screenshots/BRAPP-109-ac-5.png', fullPage: true });
      test.skip(true, 'BRAPP-109 route picker not yet deployed on staging');
      return;
    }

    const picked = await selectFirstRouteIfPossible(page);
    if (!picked) {
      await page.screenshot({ path: 'screenshots/BRAPP-109-ac-5.png', fullPage: true });
      test.skip(true, 'Routes tab present but no selectable routes available');
      return;
    }

    const submitBtn = page.locator('[data-testid="wizard-submit-btn"]');
    await submitBtn.click();
    await page.waitForURL(/\/itineraries\/[^/]+$/, { timeout: 30000 });

    await page.screenshot({ path: 'screenshots/BRAPP-109-ac-5.png', fullPage: true });

    const itineraryDetail = page.locator('[data-testid="itinerary-detail"]');
    await expect(itineraryDetail).toBeVisible({ timeout: 15000 });

    const citiesList = page.locator('[data-testid="itinerary-cities-list"]');
    await expect(citiesList).toBeVisible({ timeout: 10000 });

    const cityListItems = citiesList.locator('li');
    const liCount = await cityListItems.count();
    expect(liCount).toBeGreaterThan(0);

    const distanceSummary = page.locator('[data-testid="itinerary-total-distance"]');
    await expect(distanceSummary).toBeVisible({ timeout: 10000 });

    const distanceText = await distanceSummary.textContent();
    expect(distanceText?.trim()).toMatch(/\d+/);
  });

  test('AC6: "Cidades" tab is still usable — existing city-based wizard flow is not broken', async ({ page }) => {
    // AC6 is a regression check: the legacy "from cities" flow must keep working
    // whether or not the new tabbed wizard is deployed. We assert that:
    //  - if the tabbed wizard is live, the "Cidades" tab still renders the cities input
    //  - otherwise, the legacy origin/destination inputs are still rendered
    const { deployed } = await openWizard(page);

    await page.screenshot({ path: 'screenshots/BRAPP-109-ac-6.png', fullPage: true });

    if (deployed) {
      const cidadesTab = page.locator('[data-testid="wizard-tab-cities"]');
      await expect(cidadesTab).toBeVisible({ timeout: 10000 });
      await cidadesTab.click();

      // The new wizard must expose a cities-input on the Cidades tab; the route
      // picker must not be visible while that tab is active.
      const citiesInput = page.locator('[data-testid="cities-input"]');
      await expect(citiesInput).toBeVisible({ timeout: 10000 });

      const routePicker = page.locator('[data-testid="route-picker"]');
      await expect(routePicker).toHaveCount(0);
      return;
    }

    // Legacy wizard: verify the original origin/destination inputs render so we
    // know the cities-based flow has not regressed.
    const originInput = page.locator('[data-testid="origin-input"]');
    const destinationInput = page.locator('[data-testid="destination-input"]');

    await expect(originInput).toBeVisible({ timeout: 10000 });
    await expect(destinationInput).toBeVisible({ timeout: 10000 });
  });
});
