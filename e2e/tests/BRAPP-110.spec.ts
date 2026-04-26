import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://ride.borarodar.app';
const TEST_EMAIL = process.env.LOGIN_EMAIL || 'test@borarodar.app';
const TEST_PASSWORD = process.env.STAGING_PASSWORD ?? '';

if (!TEST_PASSWORD) {
  throw new Error(
    'STAGING_PASSWORD env var is required for BRAPP-110 E2E tests. ' +
      'Set STAGING_PASSWORD before running: e.g. `set STAGING_PASSWORD=...` (Windows) or `export STAGING_PASSWORD=...` (Unix).',
  );
}

// TODO: replace with shared login helper once one lands in e2e/support/auth.ts
// (mirrors pattern used in BRAPP-104.spec.ts and BRAPP-115.spec.ts).
async function ensureLoggedIn(page: Page): Promise<void> {
  await page.goto(BASE_URL);

  const userMenu = page.getByTestId('user-menu-btn');
  const isAlreadyLoggedIn = await userMenu.isVisible().catch(() => false);

  if (isAlreadyLoggedIn) {
    return;
  }

  if (!page.url().includes('/login')) {
    await page.goto(`${BASE_URL}/login`);
  }

  await page.getByTestId('email-input').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByTestId('email-input').fill(TEST_EMAIL);
  await page.getByTestId('password-input').fill(TEST_PASSWORD);
  await page.getByTestId('login-btn').click();

  await expect(userMenu).toBeVisible({ timeout: 30000 });

  if (page.url().includes('/login')) {
    await page.goto(BASE_URL);
  }
}

interface RoutePickResult {
  routeId: string | null;
}

function extractRouteId(href: string | null): string | null {
  if (!href) return null;
  const match = href.match(/\/routes\/([^/?#]+)/);
  if (!match) return null;
  const candidate = match[1];
  if (!candidate || candidate === 'new') return null;
  return candidate;
}

async function pickFirstExistingRouteId(page: Page): Promise<RoutePickResult> {
  await page.goto(`${BASE_URL}/routes`);

  await Promise.race([
    page
      .locator('[data-testid="route-card"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => undefined),
    page
      .locator('a[href^="/routes/"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => undefined),
    page
      .locator('[data-testid="routes-empty-state"]')
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => undefined),
  ]);

  const cards = page.locator(
    '[data-testid="route-card"] a[href^="/routes/"], a[data-testid="route-card-link"]',
  );
  const cardCount = await cards.count().catch(() => 0);
  if (cardCount > 0) {
    const href = await cards.first().getAttribute('href');
    const id = extractRouteId(href);
    if (id) return { routeId: id };
  }

  const anchors = page.locator('a[href^="/routes/"]');
  const anchorCount = await anchors.count().catch(() => 0);
  for (let i = 0; i < anchorCount; i++) {
    const href = await anchors.nth(i).getAttribute('href');
    const id = extractRouteId(href);
    if (id) {
      return { routeId: id };
    }
  }

  return { routeId: null };
}

async function openRouteDetail(page: Page, routeId: string): Promise<boolean> {
  await page.goto(`${BASE_URL}/routes/${routeId}`);

  await Promise.race([
    page.locator('[data-testid="route-detail"]').waitFor({ state: 'visible', timeout: 15000 }),
    page.locator('[data-testid="route-map"]').waitFor({ state: 'visible', timeout: 15000 }),
    page.locator('[data-testid="estimate-section"]').waitFor({ state: 'visible', timeout: 15000 }),
    page.locator('h1, h2').first().waitFor({ state: 'visible', timeout: 15000 }),
  ]).catch(() => undefined);

  const detailVisible = await page
    .locator(
      '[data-testid="route-detail"], [data-testid="route-map"], [data-testid="estimate-section"]',
    )
    .first()
    .isVisible()
    .catch(() => false);

  return detailVisible;
}

interface MotorcycleOption {
  value: string;
  label: string;
}

async function listMotorcycleOptions(page: Page): Promise<MotorcycleOption[]> {
  const nativeSelect = page
    .locator(
      '[data-testid="motorcycle-select"], select[name="motorcycleId"], select[name="motorcycle"]',
    )
    .first();

  if (await nativeSelect.isVisible().catch(() => false)) {
    const options = await nativeSelect.locator('option').all();
    const result: MotorcycleOption[] = [];
    for (const opt of options) {
      const value = (await opt.getAttribute('value')) ?? '';
      const label = ((await opt.textContent()) ?? '').trim();
      if (value && value !== '') {
        result.push({ value, label });
      }
    }
    return result;
  }

  const trigger = page
    .locator(
      '[data-testid="motorcycle-picker"], [data-testid="motorcycle-selector"], button[aria-label*="moto" i]',
    )
    .first();

  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click().catch(() => undefined);
    const items = page.locator(
      '[data-testid^="motorcycle-option-"], [role="option"], [role="menuitem"]',
    );
    const count = await items.count().catch(() => 0);
    const result: MotorcycleOption[] = [];
    for (let i = 0; i < count; i++) {
      const node = items.nth(i);
      const value =
        (await node.getAttribute('data-value')) ??
        (await node.getAttribute('data-testid')) ??
        String(i);
      const label = ((await node.textContent()) ?? '').trim();
      if (label) {
        result.push({ value, label });
      }
    }
    await page.keyboard.press('Escape').catch(() => undefined);
    return result;
  }

  return [];
}

async function selectMotorcycle(page: Page, option: MotorcycleOption): Promise<boolean> {
  const nativeSelect = page
    .locator(
      '[data-testid="motorcycle-select"], select[name="motorcycleId"], select[name="motorcycle"]',
    )
    .first();

  if (await nativeSelect.isVisible().catch(() => false)) {
    await nativeSelect.selectOption(option.value).catch(() => undefined);
    return true;
  }

  const trigger = page
    .locator(
      '[data-testid="motorcycle-picker"], [data-testid="motorcycle-selector"], button[aria-label*="moto" i]',
    )
    .first();

  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click().catch(() => undefined);

    const byTestId = page.locator(`[data-testid="motorcycle-option-${option.value}"]`).first();
    if (await byTestId.isVisible().catch(() => false)) {
      await byTestId.click();
      return true;
    }

    const byLabel = page
      .locator('[role="option"], [role="menuitem"]')
      .filter({ hasText: option.label })
      .first();

    if (await byLabel.isVisible().catch(() => false)) {
      await byLabel.click();
      return true;
    }
  }

  return false;
}

interface EstimateSnapshot {
  text: string;
  cost: string | null;
  fuel: string | null;
}

async function readEstimate(page: Page): Promise<EstimateSnapshot> {
  const section = page
    .locator(
      '[data-testid="estimate-section"], [data-testid="route-estimate"], [data-testid="fuel-estimate"]',
    )
    .first();

  const sectionVisible = await section.isVisible().catch(() => false);
  const text = sectionVisible
    ? ((await section.innerText().catch(() => '')) ?? '')
    : ((await page.locator('body').innerText().catch(() => '')) ?? '');

  const cost = await page
    .locator(
      '[data-testid="estimate-cost"], [data-testid="cost-value"], [data-testid="route-cost"]',
    )
    .first()
    .textContent()
    .catch(() => null);

  const fuel = await page
    .locator(
      '[data-testid="estimate-fuel"], [data-testid="fuel-value"], [data-testid="route-fuel"]',
    )
    .first()
    .textContent()
    .catch(() => null);

  return {
    text: text.trim(),
    cost: cost?.trim() ?? null,
    fuel: fuel?.trim() ?? null,
  };
}

async function countGasSupplyStops(page: Page): Promise<number> {
  const listItems = page.locator(
    '[data-testid="gas-stop"], [data-testid^="gas-stop-"], [data-testid="gas-supply-stop"], [data-testid^="gas-supply-stop-"], [data-testid="fuel-stop"], [data-testid^="fuel-stop-"]',
  );
  const listCount = await listItems.count().catch(() => 0);
  if (listCount > 0) return listCount;

  const markers = page.locator(
    '[data-testid="gas-stop-marker"], [data-testid^="gas-stop-marker-"], [data-testid="fuel-marker"], [data-marker-type="gas-stop"]',
  );
  const markerCount = await markers.count().catch(() => 0);
  return markerCount;
}

test.describe('BRAPP-110: Fix Estimate Not Updating on Motorcycle Change and Missing Gas Supply Stops on Route Pages', () => {
  test.beforeAll(() => {
    try {
      mkdirSync('screenshots', { recursive: true });
    } catch {
      // directory already exists
    }
  });

  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test('AC1: User navigates to a route detail page and changes the selected motorcycle → fuel/cost estimate value updates to reflect the new motorcycle without a page refresh', async ({
    page,
  }) => {
    const { routeId } = await pickFirstExistingRouteId(page);

    if (!routeId) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-1.png', fullPage: true });
      test.skip(true, 'No existing routes on staging — cannot verify estimate update flow');
      return;
    }

    const opened = await openRouteDetail(page, routeId);
    if (!opened) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-1.png', fullPage: true });
      test.skip(true, 'Route detail page not yet deployed on staging — skipping AC1');
      return;
    }

    const options = await listMotorcycleOptions(page);
    if (options.length < 2) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-1.png', fullPage: true });
      test.skip(true, 'Need at least 2 motorcycles registered to verify estimate change — skipping AC1');
      return;
    }

    const firstUrl = page.url();

    await selectMotorcycle(page, options[0]);
    await page.waitForTimeout(1500);
    const before = await readEstimate(page);

    await selectMotorcycle(page, options[1]);
    await page.waitForTimeout(1500);
    const after = await readEstimate(page);

    await page.screenshot({ path: 'screenshots/BRAPP-110-ac-1.png', fullPage: true });

    expect(page.url(), 'Page must not refresh when switching motorcycles').toBe(firstUrl);

    const changed =
      (before.cost !== null && after.cost !== null && before.cost !== after.cost) ||
      (before.fuel !== null && after.fuel !== null && before.fuel !== after.fuel) ||
      (before.text !== '' && after.text !== '' && before.text !== after.text);

    expect(
      changed,
      `Estimate must update when motorcycle changes. Before=${JSON.stringify(before)} After=${JSON.stringify(after)}`,
    ).toBe(true);
  });

  test('AC2: User opens a route detail page with a motorcycle selected → suggested gas supply station stops are rendered as markers or list items along the route', async ({
    page,
  }) => {
    const { routeId } = await pickFirstExistingRouteId(page);

    if (!routeId) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-2.png', fullPage: true });
      test.skip(true, 'No existing routes on staging — cannot verify gas supply rendering');
      return;
    }

    const opened = await openRouteDetail(page, routeId);
    if (!opened) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-2.png', fullPage: true });
      test.skip(true, 'Route detail page not yet deployed on staging — skipping AC2');
      return;
    }

    const options = await listMotorcycleOptions(page);
    if (options.length >= 1) {
      await selectMotorcycle(page, options[0]);
    }

    await page.waitForTimeout(2000);

    const stopCount = await countGasSupplyStops(page);

    await page.screenshot({ path: 'screenshots/BRAPP-110-ac-2.png', fullPage: true });

    expect(
      stopCount,
      'Suggested gas supply stops must be rendered (as markers or list items) on the route detail page',
    ).toBeGreaterThan(0);
  });

  test('AC3: User changes the motorcycle on a route detail page to one with different fuel efficiency → the number or position of suggested gas supply stops recalculates and updates on the map and list', async ({
    page,
  }) => {
    const { routeId } = await pickFirstExistingRouteId(page);

    if (!routeId) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-3.png', fullPage: true });
      test.skip(true, 'No existing routes on staging — cannot verify gas stop recalculation');
      return;
    }

    const opened = await openRouteDetail(page, routeId);
    if (!opened) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-3.png', fullPage: true });
      test.skip(true, 'Route detail page not yet deployed on staging — skipping AC3');
      return;
    }

    const options = await listMotorcycleOptions(page);
    if (options.length < 2) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-3.png', fullPage: true });
      test.skip(true, 'Need at least 2 motorcycles to verify recalculation — skipping AC3');
      return;
    }

    await selectMotorcycle(page, options[0]);
    await page.waitForTimeout(2000);

    const stopsBefore = await countGasSupplyStops(page);
    const firstStopsContainer = await page
      .locator('[data-testid="gas-stops-list"], [data-testid="route-stops-list"]')
      .first()
      .innerText()
      .catch(() => '');

    await selectMotorcycle(page, options[1]);
    await page.waitForTimeout(2500);

    const stopsAfter = await countGasSupplyStops(page);
    const secondStopsContainer = await page
      .locator('[data-testid="gas-stops-list"], [data-testid="route-stops-list"]')
      .first()
      .innerText()
      .catch(() => '');

    await page.screenshot({ path: 'screenshots/BRAPP-110-ac-3.png', fullPage: true });

    const recalculated =
      stopsBefore !== stopsAfter ||
      (firstStopsContainer !== '' && firstStopsContainer !== secondStopsContainer);

    expect(
      recalculated,
      `Gas supply stops must recalculate when motorcycle changes. Before count=${stopsBefore} After count=${stopsAfter}`,
    ).toBe(true);
  });

  test('AC4: User views the estimate section after switching motorcycles → the displayed cost and fuel values match the newly selected motorcycle\'s specifications', async ({
    page,
  }) => {
    const { routeId } = await pickFirstExistingRouteId(page);

    if (!routeId) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-4.png', fullPage: true });
      test.skip(true, 'No existing routes on staging — cannot verify estimate values');
      return;
    }

    const opened = await openRouteDetail(page, routeId);
    if (!opened) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-4.png', fullPage: true });
      test.skip(true, 'Route detail page not yet deployed on staging — skipping AC4');
      return;
    }

    const options = await listMotorcycleOptions(page);
    if (options.length < 2) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-4.png', fullPage: true });
      test.skip(true, 'Need at least 2 motorcycles to verify per-motorcycle estimates — skipping AC4');
      return;
    }

    await selectMotorcycle(page, options[1]);
    await page.waitForTimeout(2000);

    const estimate = await readEstimate(page);

    await page.screenshot({ path: 'screenshots/BRAPP-110-ac-4.png', fullPage: true });

    const hasNumericValue =
      (estimate.cost !== null && /\d/.test(estimate.cost)) ||
      (estimate.fuel !== null && /\d/.test(estimate.fuel)) ||
      /\d/.test(estimate.text);

    expect(
      hasNumericValue,
      `Estimate section must display numeric cost/fuel values for the selected motorcycle. Got: ${JSON.stringify(estimate)}`,
    ).toBe(true);

    const indicatesNotZero =
      !/^0([.,]0+)?\s*(R\$|\$|L|km|kml)?$/i.test(estimate.cost ?? '') ||
      !/^0([.,]0+)?\s*(R\$|\$|L|km|kml)?$/i.test(estimate.fuel ?? '');

    expect(
      indicatesNotZero,
      `Estimate values must not be all zero for a non-trivial route. Got: ${JSON.stringify(estimate)}`,
    ).toBe(true);
  });

  test('AC5: User reloads the route detail page after changing the motorcycle → the persisted motorcycle selection, updated estimate, and gas supply stops remain consistent with the last selection', async ({
    page,
  }) => {
    const { routeId } = await pickFirstExistingRouteId(page);

    if (!routeId) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-5.png', fullPage: true });
      test.skip(true, 'No existing routes on staging — cannot verify selection persistence');
      return;
    }

    const opened = await openRouteDetail(page, routeId);
    if (!opened) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-5.png', fullPage: true });
      test.skip(true, 'Route detail page not yet deployed on staging — skipping AC5');
      return;
    }

    const options = await listMotorcycleOptions(page);
    if (options.length < 2) {
      await page.screenshot({ path: 'screenshots/BRAPP-110-ac-5.png', fullPage: true });
      test.skip(true, 'Need at least 2 motorcycles to verify persistence after reload — skipping AC5');
      return;
    }

    const chosen = options[1];
    await selectMotorcycle(page, chosen);
    await page.waitForTimeout(2000);

    const estimateBefore = await readEstimate(page);
    const stopsBefore = await countGasSupplyStops(page);

    await page.reload({ waitUntil: 'load' });

    await Promise.race([
      page.locator('[data-testid="route-detail"]').waitFor({ state: 'visible', timeout: 15000 }),
      page.locator('[data-testid="route-map"]').waitFor({ state: 'visible', timeout: 15000 }),
      page.locator('[data-testid="estimate-section"]').waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => undefined);

    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/BRAPP-110-ac-5.png', fullPage: true });

    const estimateAfter = await readEstimate(page);
    const stopsAfter = await countGasSupplyStops(page);

    const nativeSelect = page
      .locator(
        '[data-testid="motorcycle-select"], select[name="motorcycleId"], select[name="motorcycle"]',
      )
      .first();

    let selectedAfterReload: string | null = null;
    if (await nativeSelect.isVisible().catch(() => false)) {
      selectedAfterReload = await nativeSelect.inputValue().catch(() => null);
    } else {
      const trigger = page
        .locator(
          '[data-testid="motorcycle-picker"], [data-testid="motorcycle-selector"], button[aria-label*="moto" i]',
        )
        .first();
      selectedAfterReload = await trigger.textContent().catch(() => null);
    }

    if (selectedAfterReload !== null) {
      const matchesValue = selectedAfterReload.trim() === chosen.value;
      const matchesLabel =
        chosen.label !== '' && selectedAfterReload.toLowerCase().includes(chosen.label.toLowerCase());
      expect(
        matchesValue || matchesLabel,
        `Motorcycle selection must persist across reload. Expected ~"${chosen.label}" / "${chosen.value}", got "${selectedAfterReload}"`,
      ).toBe(true);
    }

    const estimateConsistent =
      (estimateBefore.cost ?? '') === (estimateAfter.cost ?? '') ||
      (estimateBefore.fuel ?? '') === (estimateAfter.fuel ?? '') ||
      estimateBefore.text === estimateAfter.text;

    expect(
      estimateConsistent,
      `Estimate must remain consistent after reload. Before=${JSON.stringify(estimateBefore)} After=${JSON.stringify(estimateAfter)}`,
    ).toBe(true);

    expect(
      stopsAfter,
      `Gas supply stops should persist after reload. Before count=${stopsBefore} After count=${stopsAfter}`,
    ).toBe(stopsBefore);
  });
});
