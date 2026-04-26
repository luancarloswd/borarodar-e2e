import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = 'https://ride.borarodar.app';
const TEST_EMAIL = 'test@borarodar.app';
const TEST_PASSWORD = 'borarodarapp';

test.describe('BRAPP-109: Build Itinerary from Existing Routes with Auto-Calculated Kilometers', () => {
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

  test('AC1: User opens the new itinerary wizard → both "Cidades" and "Rotas existentes" tabs are visible in Step 1', async ({ page }) => {
    await page.goto(`${BASE_URL}/itineraries/new`);
    await page.waitForSelector('[data-testid="itinerary-wizard"]', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-109-ac-1.png', fullPage: true });

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
    await page.goto(`${BASE_URL}/itineraries/new`);
    await page.waitForSelector('[data-testid="itinerary-wizard"]', { timeout: 15000 });

    await page.click('[data-testid="wizard-tab-routes"]');

    await page.screenshot({ path: 'screenshots/BRAPP-109-ac-2.png', fullPage: true });

    const routePicker = page.locator('[data-testid="route-picker"]');
    await expect(routePicker).toBeVisible({ timeout: 15000 });

    const searchInput = page.locator('[data-testid="route-picker-search"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    const routeList = page.locator('[data-testid="route-picker-list"]');
    await expect(routeList).toBeVisible({ timeout: 10000 });
  });

  test('AC3: User selects one or more routes → preview panel shows cities one-per-line and running total km', async ({ page }) => {
    await page.goto(`${BASE_URL}/itineraries/new`);
    await page.waitForSelector('[data-testid="itinerary-wizard"]', { timeout: 15000 });

    await page.click('[data-testid="wizard-tab-routes"]');
    await page.waitForSelector('[data-testid="route-picker"]', { timeout: 15000 });

    const routeItems = page.locator('[data-testid="route-picker-item"]');
    await routeItems.first().waitFor({ timeout: 15000 });

    await routeItems.first().click();

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
    await page.goto(`${BASE_URL}/itineraries/new`);
    await page.waitForSelector('[data-testid="itinerary-wizard"]', { timeout: 15000 });

    await page.click('[data-testid="wizard-tab-routes"]');
    await page.waitForSelector('[data-testid="route-picker"]', { timeout: 15000 });

    const routeItems = page.locator('[data-testid="route-picker-item"]');
    await routeItems.first().waitFor({ timeout: 15000 });
    await routeItems.first().click();

    await page.screenshot({ path: 'screenshots/BRAPP-109-ac-4-before-submit.png', fullPage: true });

    const submitBtn = page.locator('[data-testid="wizard-submit-btn"]');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    await page.waitForURL(/\/itineraries\/[^/]+$/, { timeout: 30000 });

    await page.screenshot({ path: 'screenshots/BRAPP-109-ac-4-after-submit.png', fullPage: true });

    expect(page.url()).toMatch(/\/itineraries\/[^/]+$/);
  });

  test('AC5: Itinerary detail page shows cities as a list (one per line) and totalDistanceKm in the header summary card', async ({ page }) => {
    await page.goto(`${BASE_URL}/itineraries/new`);
    await page.waitForSelector('[data-testid="itinerary-wizard"]', { timeout: 15000 });

    await page.click('[data-testid="wizard-tab-routes"]');
    await page.waitForSelector('[data-testid="route-picker"]', { timeout: 15000 });

    const routeItems = page.locator('[data-testid="route-picker-item"]');
    await routeItems.first().waitFor({ timeout: 15000 });
    await routeItems.first().click();

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
    await page.goto(`${BASE_URL}/itineraries/new`);
    await page.waitForSelector('[data-testid="itinerary-wizard"]', { timeout: 15000 });

    const cidadesTab = page.locator('[data-testid="wizard-tab-cities"]');
    await expect(cidadesTab).toBeVisible({ timeout: 10000 });
    await cidadesTab.click();

    await page.screenshot({ path: 'screenshots/BRAPP-109-ac-6.png', fullPage: true });

    const citiesInput = page.locator('[data-testid="cities-input"]');
    await expect(citiesInput).toBeVisible({ timeout: 10000 });

    const routePicker = page.locator('[data-testid="route-picker"]');
    await expect(routePicker).not.toBeVisible({ timeout: 5000 });
  });
});
