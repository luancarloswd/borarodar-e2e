import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = process.env.BASE_URL;
const TEST_EMAIL = process.env.LOGIN_EMAIL;
const TEST_PASSWORD = process.env.LOGIN_PASSWORD;

if (!BASE_URL || !TEST_EMAIL || !TEST_PASSWORD) {
  test.skip(
    'Skipping: Required environment variables are not set.',
    { annotation: { type: 'error', description: 'Missing env vars' } }
  );
}
const TEST_GEOLOCATION = {
  latitude: -23.55052,
  longitude: -46.633308,
};

async function postToFirstAvailableEndpoint(
  page,
  endpoints: string[],
  body?: Record<string, unknown>,
  acceptedStatuses: number[] = [200, 201, 204, 409],
) {
  let lastStatus: number | null = null;

  for (const endpoint of endpoints) {
    const result = await page.evaluate(
      async ({ endpoint: candidateEndpoint, payload }) => {
        try {
          const response = await fetch(candidateEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: payload ? JSON.stringify(payload) : undefined,
            credentials: 'include',
          });

          return { status: response.status, ok: response.ok };
        } catch {
          return { status: 0, ok: false };
        }
      },
      { endpoint, payload: body },
    );

    lastStatus = result.status;

    if (acceptedStatuses.includes(result.status)) {
      return;
    }
  }

  throw new Error(`Unable to call any ride lifecycle endpoint successfully. Last status: ${lastStatus}`);
}

async function login(page) {
  await page.goto(BASE_URL!);

  await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL!);
  await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD!);
  await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');

  await page.waitForURL((url) => url.toString() !== `${BASE_URL!}/`);
}

async function ensureNoActiveRide(page) {
  const cleanupEndpoints = [
    `${BASE_URL!}/rides/end`,
    `${BASE_URL!}/rides/discard`,
    `${BASE_URL!}/api/rides/end`,
    `${BASE_URL!}/api/rides/discard`,
  ];

  for (const endpoint of cleanupEndpoints) {
    await page.evaluate(
      async ({ candidateEndpoint }) => {
        try {
          await fetch(candidateEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });
        } catch {
          // Best-effort cleanup; ignore failures here and continue trying candidates.
        }
      },
      { candidateEndpoint: endpoint },
    );
  }
}

async function startActiveRide(page, context) {
  await context.grantPermissions(['geolocation'], { origin: BASE_URL! });
  await context.setGeolocation(TEST_GEOLOCATION);

  await ensureNoActiveRide(page);

  await postToFirstAvailableEndpoint(
    page,
    [
      `${BASE_URL!}/rides/start`,
      `${BASE_URL!}/api/rides/start`,
    ],
    TEST_GEOLOCATION,
    [200, 201, 204, 409],
  );
}

test.describe('BRAPP-14: Auto-Link Gas Supply to Active Ride Transparently', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['geolocation'], { origin: BASE_URL! });
    await context.setGeolocation(TEST_GEOLOCATION); // Error here, should be TEST_GEOLOCATION

    // Login flow
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await ensureNoActiveRide(page);
  });

  test('AC1: User navigates to the fuel supply logging form with an active ride ╬ô├Ñ├å The \'Ride\' selection input is not visible', async ({ page, context }) => {
    await startActiveRide(page, context);

    // Navigate to the fuel supply route with a known active ride state
    // Instead of direct navigation, follow the prescribed flow: go to /motorcycles, open a moto card, click add fuel
    await page.goto(`${BASE_URL!}/motorcycles`);
    const motoCard = page.locator('.moto-card').first(); // Assuming this existence based on context
    await motoCard.click();
    await page.getByTestId('add-fuel-btn').click();

    // Verify 'Ride' selection input is NOT visible
    const rideSelector = page.locator('select[name="ride"], input[name="ride"], label:has-text("Ride")');
    await expect(rideSelector).not.toBeVisible();

    await page.screenshot({ path: 'screenshots/BRAPP-14-ac-1.png', fullPage: true });
  });

  test('AC2: User submits a fuel supply while an active ride is in progress ╬ô├Ñ├å The newly logged fuel supply is displayed within the details of the active ride', async ({ page, context }) => {
    await startActiveRide(page, context);

    // Follow prescribed flow
    await page.goto(`${BASE_URL!}/motorcycles`);
    const motoCard = page.locator('.moto-card').first();
    await motoCard.click();
    await page.getByTestId('add-fuel-btn').click();

    // Fill in the real fuel supply form fields.
    const liters = '20';
    const pricePerLiter = '5';
    await page.getByTestId('fuel-liters-input').fill(liters);
    await page.getByTestId('fuel-price-input').fill(pricePerLiter);
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');

    // Verify the newly logged fuel supply appears in the UI for the active ride.
    const fuelSupplyRow = page.locator('table tr').filter({ hasText: liters }).filter({ hasText: pricePerLiter }).first();
    await expect(fuelSupplyRow).toBeVisible();

    await page.screenshot({ path: 'screenshots/BRAPP-14-ac-2.png', fullPage: true });
  });

  test('AC3: User logs a fuel supply without an active ride ╬ô├Ñ├å The \'Ride\' selection input is visible on the form', async ({ page }) => {
    await ensureNoActiveRide(page);

    // Navigate via the prescribed flow
    await page.goto(`${BASE_URL!}/motorcycles`);
    const motoCard = page.locator('.moto-card').first();
    await motoCard.click();
    await page.getByTestId('add-fuel-btn').click();

    // Verify 'Ride' selection input IS visible
    const rideSelector = page.locator('select[name="ride"], input[name="ride"], label:has-text("Ride")');
    await expect(rideSelector).toBeVisible();

    await page.screenshot({ path: 'screenshots/BRAPP-14-ac-3.png', fullPage: true });
  });
});
