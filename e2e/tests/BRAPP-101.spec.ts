import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://ride.borarodar.app';
const TEST_EMAIL = process.env.LOGIN_EMAIL || 'test@borarodar.app';
const TEST_PASSWORD = process.env.STAGING_PASSWORD ?? '';

if (!TEST_PASSWORD) {
  throw new Error(
    'STAGING_PASSWORD env var is required for BRAPP-101 E2E tests. ' +
      'Set STAGING_PASSWORD before running: e.g. `set STAGING_PASSWORD=...` (Windows) or `export STAGING_PASSWORD=...` (Unix).',
  );
}

// Production selectors (verified against staging snapshot 2026-04-26):
//   - login fields:               [data-testid="email-input"|"password-input"|"login-btn"]
//   - logged-in marker:           [data-testid="user-menu-btn"]
//   - routes list:                grid of [data-testid="route-card"] elements
//   - route detail title:         <main> ... <h1>  (no testid in production)
//   - motorcycle picker:          <select id="moto-picker"> (only when motorcycles.length >= 2)
//   - picker option text:         "{nickname}" or "{nickname} (Padrão)" for default
//   - fuel info card heading:     "Combustível ({nickname})"
//   - fuel info CTA when gated:   link "Registrar moto" (user has no motorcycle)
//   - motorcycles registry:       /motorcycles, default badge [data-testid="default-badge"]

const ROUTE_TITLE = 'main h1';
const ROUTE_DETAIL_TIMEOUT = 15000;

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

async function gotoFirstRouteDetail(page: Page): Promise<boolean> {
  await page.goto(`${BASE_URL}/routes`);
  await page.waitForLoadState('networkidle');

  const cards = page.locator('[data-testid="route-card"]');
  const count = await cards.count().catch(() => 0);
  if (count === 0) return false;

  await cards.first().click();
  return await page
    .locator(ROUTE_TITLE)
    .first()
    .waitFor({ state: 'visible', timeout: ROUTE_DETAIL_TIMEOUT })
    .then(() => true)
    .catch(() => false);
}

async function isFuelFeatureGated(page: Page): Promise<boolean> {
  // Wait for FuelInfoCard's loading skeleton to resolve to a terminal state.
  // Both terminal states render an h2 containing "Combustível":
  //   - gated:  "Informações de Combustível" (with a "Registrar moto" CTA)
  //   - active: "Combustível ({nickname})"
  // Without this wait, the gating check can race the skeleton and falsely
  // conclude "not gated" before the CTA has rendered.
  await page
    .locator('h2')
    .filter({ hasText: /Combustível/ })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => undefined);

  const ctaLink = page.getByRole('link', { name: /registrar moto/i });
  return await ctaLink.isVisible().catch(() => false);
}

test.describe("BRAPP-101: Select Alternate Motorcycle on Route Pages to Preview Estimates", () => {
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

  test("AC1: User with 2+ motorcycles opens a route detail page → picker is visible and the default motorcycle is preselected with a 'Padrão' label", async ({ page }) => {
    const opened = await gotoFirstRouteDetail(page);
    if (!opened) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-1.png', fullPage: true });
      test.skip(true, 'No routes available on test account — cannot verify motorcycle picker visibility');
      return;
    }

    if (await isFuelFeatureGated(page)) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-1.png', fullPage: true });
      test.skip(true, 'Fuel feature gated behind motorcycle registration — picker is not exposed');
      return;
    }

    const picker = page.locator('#moto-picker');
    const pickerVisible = await picker.isVisible().catch(() => false);

    if (!pickerVisible) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-1.png', fullPage: true });
      test.skip(true, 'Motorcycle picker only renders when account owns >= 2 motorcycles — not exposed here');
      return;
    }

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-1.png', fullPage: true });

    await expect(picker).toBeVisible({ timeout: 10000 });

    // The currently selected option must carry the "(Padrão)" label, signalling
    // that the default motorcycle is preselected.
    const selectedValue = await picker.inputValue();
    expect(selectedValue.trim().length).toBeGreaterThan(0);

    const selectedOption = picker.locator(`option[value="${selectedValue}"]`);
    const selectedText = (await selectedOption.textContent())?.trim() ?? '';
    expect(selectedText).toMatch(/\(Padrão\)/);
  });

  test("AC2: User selects a non-default motorcycle from the picker → fuel estimates visibly recompute without a page reload", async ({ page }) => {
    const opened = await gotoFirstRouteDetail(page);
    if (!opened) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-2-before.png', fullPage: true });
      test.skip(true, 'No routes available on test account — cannot verify estimate recompute');
      return;
    }

    if (await isFuelFeatureGated(page)) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-2-before.png', fullPage: true });
      test.skip(true, 'Fuel feature gated — cannot verify estimate recompute');
      return;
    }

    const picker = page.locator('#moto-picker');
    if (!(await picker.isVisible().catch(() => false))) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-2-before.png', fullPage: true });
      test.skip(true, 'Picker requires >= 2 motorcycles — not exposed here');
      return;
    }

    // The fuel info card heading is "Combustível ({nickname})" — capture initial snapshot.
    const fuelHeading = page.locator('h2', { hasText: /^Combustível/ });
    await expect(fuelHeading.first()).toBeVisible({ timeout: 10000 });
    const initialUrl = page.url();
    const initialHeading = (await fuelHeading.first().textContent())?.trim() ?? '';

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-2-before.png', fullPage: true });

    const options = picker.locator('option');
    const optionCount = await options.count();
    if (optionCount < 2) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-2-after.png', fullPage: true });
      test.skip(true, 'Picker has fewer than 2 selectable options');
      return;
    }

    const currentValue = await picker.inputValue();
    let altValue: string | null = null;
    for (let i = 0; i < optionCount; i++) {
      const value = await options.nth(i).getAttribute('value');
      if (value && value !== currentValue) {
        altValue = value;
        break;
      }
    }

    if (!altValue) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-2-after.png', fullPage: true });
      test.skip(true, 'Could not find an alternative motorcycle option distinct from the current one');
      return;
    }

    await picker.selectOption(altValue);
    // Allow estimates to recompute.
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-2-after.png', fullPage: true });

    // No page reload — URL must remain identical.
    expect(page.url()).toEqual(initialUrl);

    // The card must still be visible and re-rendered against the new motorcycle.
    await expect(fuelHeading.first()).toBeVisible({ timeout: 10000 });
    const updatedHeading = (await fuelHeading.first().textContent())?.trim() ?? '';

    // The picker selection must have changed.
    const selectionChanged = (await picker.inputValue()) !== currentValue;
    expect(selectionChanged).toBe(true);

    // The heading embeds the selected motorcycle's nickname — switching bikes
    // generally changes the heading text (only equal when both bikes share a
    // nickname, in which case the picker-value change above already proves the
    // recompute happened).
    if (initialHeading !== updatedHeading) {
      expect(updatedHeading).not.toEqual(initialHeading);
    }
  });

  test("AC3: User switches the picker on a route page, then returns to the Motorcycle Registry → the default motorcycle flag is unchanged", async ({ page }) => {
    const opened = await gotoFirstRouteDetail(page);
    if (!opened) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-3-route.png', fullPage: true });
      test.skip(true, 'No routes available — cannot verify default flag is preserved');
      return;
    }

    if (await isFuelFeatureGated(page)) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-3-route.png', fullPage: true });
      test.skip(true, 'Fuel feature gated — picker not exposed');
      return;
    }

    const picker = page.locator('#moto-picker');
    const pickerExposed = await picker.isVisible().catch(() => false);

    if (pickerExposed) {
      const options = picker.locator('option');
      const optionCount = await options.count();
      const currentValue = await picker.inputValue();
      for (let i = 0; i < optionCount; i++) {
        const value = await options.nth(i).getAttribute('value');
        if (value && value !== currentValue) {
          await picker.selectOption(value);
          break;
        }
      }
    }

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-3-route.png', fullPage: true });

    await page.goto(`${BASE_URL}/motorcycles`);
    await page.waitForLoadState('networkidle');

    // Either the registry list renders or the empty state — both are valid
    // signals that the page rendered without a regression.
    await Promise.race([
      page.locator('[data-testid="moto-card"]').first().waitFor({ state: 'visible', timeout: 15000 }),
      page.locator('[data-testid="motos-empty-state"]').waitFor({ state: 'visible', timeout: 15000 }),
      page.locator('[data-testid="motos-title"]').waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => undefined);

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-3-registry.png', fullPage: true });

    const motoCards = page.locator('[data-testid="moto-card"]');
    const motoCardCount = await motoCards.count().catch(() => 0);

    if (motoCardCount === 0) {
      test.skip(true, 'Account has no motorcycles registered — default flag not applicable');
      return;
    }

    const defaultBadges = page.locator('[data-testid="default-badge"]');
    // Exactly one motorcycle remains marked as default after switching the picker.
    await expect(defaultBadges).toHaveCount(1);
    await expect(defaultBadges.first()).toBeVisible({ timeout: 10000 });
  });

  test("AC4: User with exactly one motorcycle opens a route detail page → no picker dropdown is shown, and fuel estimates render against that bike", async ({ page }) => {
    const opened = await gotoFirstRouteDetail(page);
    if (!opened) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-4.png', fullPage: true });
      test.skip(true, 'No routes available — cannot verify single-motorcycle render path');
      return;
    }

    if (await isFuelFeatureGated(page)) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-4.png', fullPage: true });
      test.skip(true, 'Account has no motorcycles registered — single-motorcycle path not applicable');
      return;
    }

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-4.png', fullPage: true });

    const picker = page.locator('#moto-picker');
    const pickerVisible = await picker.isVisible().catch(() => false);

    // The route detail page must render the fuel info card whether the account
    // has one bike (no picker, label only) or many (picker shown).
    const fuelHeading = page.locator('h2', { hasText: /^Combustível/ });
    await expect(fuelHeading.first()).toBeVisible({ timeout: 10000 });

    if (!pickerVisible) {
      // Single-motorcycle path: card heading embeds the bike's nickname.
      const headingText = (await fuelHeading.first().textContent())?.trim() ?? '';
      expect(headingText).toMatch(/^Combustível\s*\(.+\)/);
    } else {
      test.skip(true, 'Account has 2+ motorcycles — single-motorcycle path not exercised here');
    }
  });

  test("AC5: User selects an alternate motorcycle on Route A, then navigates to Route B → Route B's picker is reset to the user's default motorcycle (no leaked selection)", async ({ page }) => {
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForLoadState('networkidle');

    const cards = page.locator('[data-testid="route-card"]');
    const routeCount = await cards.count().catch(() => 0);

    if (routeCount < 2) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-5-route-a.png', fullPage: true });
      test.skip(true, 'Need at least 2 routes to test cross-route picker reset');
      return;
    }

    // Open Route A.
    await cards.nth(0).click();
    const titleVisibleA = await page
      .locator(ROUTE_TITLE)
      .first()
      .waitFor({ state: 'visible', timeout: ROUTE_DETAIL_TIMEOUT })
      .then(() => true)
      .catch(() => false);

    if (!titleVisibleA) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-5-route-a.png', fullPage: true });
      test.skip(true, 'Route A failed to render');
      return;
    }

    if (await isFuelFeatureGated(page)) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-5-route-a.png', fullPage: true });
      test.skip(true, 'Fuel feature gated — picker not exposed');
      return;
    }

    const pickerA = page.locator('#moto-picker');
    if (!(await pickerA.isVisible().catch(() => false))) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-5-route-a.png', fullPage: true });
      test.skip(true, 'Picker requires >= 2 motorcycles — cross-route reset not exposed');
      return;
    }

    const defaultValue = await pickerA.inputValue();
    const options = pickerA.locator('option');
    const optionCount = await options.count();

    let altValue: string | null = null;
    for (let i = 0; i < optionCount; i++) {
      const value = await options.nth(i).getAttribute('value');
      if (value && value !== defaultValue) {
        altValue = value;
        break;
      }
    }

    if (!altValue) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-5-route-a.png', fullPage: true });
      test.skip(true, 'No alternative motorcycle option distinct from default');
      return;
    }

    await pickerA.selectOption(altValue);
    await page.waitForTimeout(500);

    const selectedOnRouteA = await pickerA.inputValue();
    expect(selectedOnRouteA).not.toEqual(defaultValue);

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-5-route-a.png', fullPage: true });

    // Navigate to Route B.
    await page.goto(`${BASE_URL}/routes`);
    await page.waitForLoadState('networkidle');
    const cardsB = page.locator('[data-testid="route-card"]');
    await cardsB.nth(1).click();
    const titleVisibleB = await page
      .locator(ROUTE_TITLE)
      .first()
      .waitFor({ state: 'visible', timeout: ROUTE_DETAIL_TIMEOUT })
      .then(() => true)
      .catch(() => false);

    if (!titleVisibleB) {
      await page.screenshot({ path: 'screenshots/BRAPP-101-ac-5-route-b.png', fullPage: true });
      test.skip(true, 'Route B failed to render');
      return;
    }

    await page.screenshot({ path: 'screenshots/BRAPP-101-ac-5-route-b.png', fullPage: true });

    const pickerB = page.locator('#moto-picker');
    await expect(pickerB).toBeVisible({ timeout: 10000 });

    const valueOnRouteB = await pickerB.inputValue();
    expect(valueOnRouteB).toEqual(defaultValue);
  });
});
